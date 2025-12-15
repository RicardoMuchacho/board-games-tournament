import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Plus, Shuffle, QrCode } from "lucide-react";
import { toast } from "sonner";
import { EditCatanMatchParticipants } from "./EditCatanMatchParticipants";
import { RoundQRDialog } from "./RoundQRDialog";
import { generateCatanPairings, calculateTableDistribution } from "@/lib/tournamentPairing";

interface CatanMatchesTabProps {
  tournamentId: string;
  numberOfRounds?: number;
  checkInToken?: string;
  tournamentName?: string;
}

export const CatanMatchesTab = ({ tournamentId, numberOfRounds, checkInToken, tournamentName }: CatanMatchesTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matchParticipants, setMatchParticipants] = useState<{ [key: string]: any[] }>({});
  const [scores, setScores] = useState<{ 
    [matchId: string]: { 
      [participantId: string]: { 
        victoryPoints: number; 
        tournamentPoints: number;
        placement: number;
      } 
    } 
  }>({});
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMatch, setEditingMatch] = useState<{ id: string; participantIds: string[] } | null>(null);
  const [generatingRound, setGeneratingRound] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  useEffect(() => {
    fetchMatches();
    fetchParticipants();

    const matchesChannel = supabase
      .channel(`catan-matches-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`catan-match-participants-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_participants" },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [tournamentId]);

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("tournament_id", tournamentId);
    
    if (!error && data) {
      setParticipants(data);
    }
  };

  const fetchMatches = async () => {
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("created_at");

    if (matchesError) {
      toast.error("Failed to load matches");
      return;
    }

    setMatches(matchesData || []);

    // Fetch match participants for each match
    for (const match of matchesData || []) {
      // @ts-ignore - match_participants table type not yet in generated types
      const { data: participantsData, error: participantsError } = await (supabase as any)
        .from("match_participants")
        .select(`
          *,
          participant:participants(id, name)
        `)
        .eq("match_id", match.id);

      if (!participantsError && participantsData) {
        setMatchParticipants((prev) => ({
          ...prev,
          [match.id]: participantsData,
        }));
      }
    }
  };

  const updateMatchScores = async (matchId: string) => {
    const matchScores = scores[matchId];
    if (!matchScores) return;

    try {
      // Update or insert each participant's scores
      for (const [participantId, scoreData] of Object.entries(matchScores)) {
        // @ts-ignore - match_participants table type not yet in generated types
        const { error } = await (supabase as any)
          .from("match_participants")
          .upsert({
            match_id: matchId,
            participant_id: participantId,
            victory_points: scoreData.victoryPoints,
            tournament_points: scoreData.tournamentPoints,
            placement: scoreData.placement,
          }, {
            onConflict: "match_id,participant_id"
          });

        if (error) throw error;
      }

      // Update match status to completed
      await supabase
        .from("matches")
        .update({ status: "completed" })
        .eq("id", matchId);

      toast.success("Match scores updated");
      
      // Clear scores for this match
      setScores((prev) => {
        const newScores = { ...prev };
        delete newScores[matchId];
        return newScores;
      });
    } catch (error: any) {
      toast.error("Failed to update scores: " + error.message);
    }
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as { [key: number]: any[] });

  const rounds = Object.keys(groupedMatches).map(r => parseInt(r)).sort((a, b) => a - b);

  const currentRoundMatches = groupedMatches[selectedRound] || [];

  // Keep table numbers stable based on original creation order
  const getTableNumber = (match: any) => {
    return currentRoundMatches.findIndex(m => m.id === match.id) + 1;
  };

  const filteredMatches = currentRoundMatches.filter((match) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const participants = matchParticipants[match.id] || [];
    return participants.some(p => p.participant?.name?.toLowerCase().includes(query));
  });

  const getTournamentPoints = (placement: number): number => {
    const points: { [key: number]: number } = {
      1: 6,
      2: 4,
      3: 2,
      4: 1,
    };
    return points[placement] || 0;
  };

  const generateNextRound = async (mode: "auto" | "manual") => {
    const nextRound = rounds.length > 0 ? Math.max(...rounds) + 1 : 1;
    
    if (numberOfRounds && nextRound > numberOfRounds) {
      toast.error(`Maximum rounds (${numberOfRounds}) reached`);
      return;
    }

    if (participants.length < 3) {
      toast.error("Need at least 3 participants");
      return;
    }

    setGeneratingRound(true);
    try {
      const newMatches: any[] = [];
      const newMatchParticipants: any[] = [];

      if (mode === "auto") {
        // Build existing pairings history from all existing matches
        const existingMatchIds = matches.map(m => m.id);
        let existingPairings: any[][] = [];
        
        if (existingMatchIds.length > 0) {
          const allParticipants = Object.values(matchParticipants).flat();
          const matchGroups: { [key: string]: string[] } = {};
          allParticipants.forEach((mp: any) => {
            if (!matchGroups[mp.match_id]) matchGroups[mp.match_id] = [];
            matchGroups[mp.match_id].push(mp.participant_id);
          });

          existingPairings = Object.values(matchGroups).map(participantIds =>
            participantIds.map(id => participants.find(p => p.id === id)).filter(Boolean)
          );
        }

        // Generate one round of smart pairings
        const allRoundMatches = generateCatanPairings(participants, nextRound);
        const roundMatches = allRoundMatches[nextRound - 1] || [];

        for (const matchPlayers of roundMatches) {
          newMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            player1_id: matchPlayers[0]?.id,
            player2_id: matchPlayers[1]?.id,
            player3_id: matchPlayers[2]?.id,
            player4_id: matchPlayers[3]?.id || null,
            status: "pending",
          });
        }

        const { data: insertedMatches, error: matchError } = await supabase
          .from("matches")
          .insert(newMatches)
          .select();

        if (matchError) throw matchError;

        if (insertedMatches) {
          for (let i = 0; i < insertedMatches.length; i++) {
            const match = insertedMatches[i];
            const matchPlayers = roundMatches[i] || [];
            
            for (const player of matchPlayers) {
              newMatchParticipants.push({
                match_id: match.id,
                participant_id: player.id,
                victory_points: 0,
                tournament_points: 0,
              });
            }
          }

          if (newMatchParticipants.length > 0) {
            // @ts-ignore
            const { error: mpError } = await (supabase as any)
              .from("match_participants")
              .insert(newMatchParticipants);
            if (mpError) throw mpError;
          }
        }

        toast.success(`Round ${nextRound} generated with smart pairing`);
      } else {
        // Manual mode: create blank matches with smart distribution
        const { tableSizes } = calculateTableDistribution(participants.length, 4, 3);
        const tablesNeeded = tableSizes.length;
        
        for (let i = 0; i < tablesNeeded; i++) {
          newMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            player1_id: null,
            player2_id: null,
            player3_id: null,
            player4_id: null,
            status: "pending",
          });
        }

        const { error } = await supabase.from("matches").insert(newMatches);
        if (error) throw error;

        const tablesOf4 = tableSizes.filter(s => s === 4).length;
        const tablesOf3 = tableSizes.filter(s => s === 3).length;
        const distribution = tablesOf3 > 0 
          ? `(${tablesOf4} tables of 4, ${tablesOf3} tables of 3)` 
          : '';
        toast.success(`Round ${nextRound} created with ${tablesNeeded} blank tables ${distribution}`);
      }

      setSelectedRound(nextRound);
    } catch (error: any) {
      toast.error("Failed to generate round: " + error.message);
    } finally {
      setGeneratingRound(false);
    }
  };

  return (
    <div className="space-y-6">
      {rounds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground">No matches yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add participants and generate matches to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            {rounds.map((round) => (
              <Button
                key={round}
                variant={selectedRound === round ? "default" : "outline"}
                onClick={() => setSelectedRound(round)}
              >
                Round {round}
              </Button>
            ))}
            <div className="flex gap-2 ml-auto">
              {checkInToken && (
                <Button
                  variant="outline"
                  onClick={() => setShowQRDialog(true)}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  QR Results
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => generateNextRound("auto")}
                disabled={generatingRound}
                className="gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Auto Next Round
              </Button>
              <Button
                variant="outline"
                onClick={() => generateNextRound("manual")}
                disabled={generatingRound}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Manual Next Round
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {filteredMatches.map((match) => {
              const participants = matchParticipants[match.id] || [];
              const tableNumber = getTableNumber(match);
              
              return (
                <Card key={match.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Table {tableNumber}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMatch({ 
                            id: match.id, 
                            participantIds: participants.map(p => p.participant.id) 
                          })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Badge
                          variant={
                            match.status === "completed"
                              ? "default"
                              : match.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {match.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {participants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No participants assigned</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground mb-2">
                          <div>Player</div>
                          <div className="text-center">Victory Pts</div>
                          <div className="text-center">Placement</div>
                          <div className="text-center">Tournament Pts</div>
                        </div>
                        {participants.map((mp) => {
                          const participantId = mp.participant.id;
                          const currentScore = scores[match.id]?.[participantId];
                          
                          return (
                            <div key={mp.id} className="grid grid-cols-4 gap-2 items-center">
                              <div className="font-medium">{mp.participant.name}</div>
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                className="text-center"
                                placeholder={mp.victory_points?.toString() || "0"}
                                value={currentScore?.victoryPoints ?? ""}
                                onChange={(e) => {
                                  const victoryPoints = parseInt(e.target.value) || 0;
                                  setScores((prev) => ({
                                    ...prev,
                                    [match.id]: {
                                      ...prev[match.id],
                                      [participantId]: {
                                        ...prev[match.id]?.[participantId],
                                        victoryPoints,
                                      },
                                    },
                                  }));
                                }}
                                disabled={match.status === "completed"}
                              />
                              <Input
                                type="number"
                                min="1"
                                max="4"
                                className="text-center"
                                placeholder={mp.placement?.toString() || ""}
                                value={currentScore?.placement ?? ""}
                                onChange={(e) => {
                                  const placement = parseInt(e.target.value) || 1;
                                  const tournamentPoints = getTournamentPoints(placement);
                                  setScores((prev) => ({
                                    ...prev,
                                    [match.id]: {
                                      ...prev[match.id],
                                      [participantId]: {
                                        ...prev[match.id]?.[participantId],
                                        placement,
                                        tournamentPoints,
                                      },
                                    },
                                  }));
                                }}
                                disabled={match.status === "completed"}
                              />
                              <div className="text-center font-semibold">
                                {currentScore?.tournamentPoints ?? mp.tournament_points ?? 0}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    {match.status !== "completed" && scores[match.id] && (
                      <Button onClick={() => updateMatchScores(match.id)} className="w-full mt-4">
                        Save Match Results
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredMatches.length === 0 && searchQuery && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-32">
                <p className="text-muted-foreground">No players found matching "{searchQuery}"</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {editingMatch && (
        <EditCatanMatchParticipants
          open={!!editingMatch}
          onOpenChange={(open) => !open && setEditingMatch(null)}
          matchId={editingMatch.id}
          currentParticipantIds={editingMatch.participantIds}
          tournamentId={tournamentId}
          roundNumber={selectedRound}
        />
      )}

      {checkInToken && (
        <RoundQRDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          checkInToken={checkInToken}
          tournamentName={tournamentName || "Tournament"}
          round={selectedRound}
        />
      )}
    </div>
  );
};
