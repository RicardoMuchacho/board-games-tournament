import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Plus, Shuffle, QrCode } from "lucide-react";
import { toast } from "sonner";
import { EditMatchParticipants } from "./EditMatchParticipants";
import { RoundQRDialog } from "./RoundQRDialog";
import { generateSwissPairings, generateRoundRobinPairings } from "@/lib/tournamentPairing";

interface MatchesTabProps {
  tournamentId: string;
  tournamentType?: string;
  numberOfRounds?: number;
  playersPerMatch?: number;
  checkInToken?: string;
  tournamentName?: string;
  matchGenerationMode?: string;
}

export const MatchesTab = ({ tournamentId, tournamentType, numberOfRounds, playersPerMatch = 2, checkInToken, tournamentName, matchGenerationMode }: MatchesTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [scores, setScores] = useState<{ [key: string]: { p1: number; p2: number } }>({});
  const [winners, setWinners] = useState<{ [key: string]: string | null }>({});
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMatch, setEditingMatch] = useState<{ id: string; player1Id?: string; player2Id?: string } | null>(null);
  const [generatingRound, setGeneratingRound] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  useEffect(() => {
    fetchMatches();
    fetchParticipants();

    const channel = supabase
      .channel(`matches-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:participants!matches_player1_id_fkey(id, name),
        player2:participants!matches_player2_id_fkey(id, name)
      `
      )
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("created_at");

    if (error) {
      toast.error("Failed to load matches");
      return;
    }
    setMatches(data || []);
  };

  const updateScore = async (matchId: string) => {
    const score = scores[matchId];
    if (!score) return;

    // Validate scores
    if (score.p1 < 0 || score.p1 > 999) {
      toast.error("Player 1 score must be between 0 and 999");
      return;
    }
    if (score.p2 < 0 || score.p2 > 999) {
      toast.error("Player 2 score must be between 0 and 999");
      return;
    }

    // For Swiss, require winner selection
    if (tournamentType === "swiss" && !winners[matchId]) {
      toast.error("Please select a winner");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: score.p1,
        player2_score: score.p2,
        winner_id: tournamentType === "swiss" ? winners[matchId] : null,
        status: "completed",
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to update score");
      return;
    }

    toast.success("Score updated");
    setScores((prev) => {
      const newScores = { ...prev };
      delete newScores[matchId];
      return newScores;
    });
    setWinners((prev) => {
      const newWinners = { ...prev };
      delete newWinners[matchId];
      return newWinners;
    });

    // Check if we need to generate next round for eliminatory tournament
    await checkAndGenerateNextRound();
  };

  const checkAndGenerateNextRound = async () => {
    // Get tournament type
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("type")
      .eq("id", tournamentId)
      .single();

    if (tournament?.type !== "eliminatory") return;

    // Fetch fresh match data from database
    const { data: freshMatches, error: fetchError } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:participants!matches_player1_id_fkey(id, name),
        player2:participants!matches_player2_id_fkey(id, name)
      `
      )
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("created_at");

    if (fetchError || !freshMatches) return;

    // Group matches by round
    const matchesByRound = freshMatches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as { [key: number]: any[] });

    // Find the highest round that is fully completed
    const rounds = Object.keys(matchesByRound).map(r => parseInt(r)).sort((a, b) => a - b);
    
    for (const round of rounds) {
      const roundMatches = matchesByRound[round];
      const allCompleted = roundMatches.every(m => m.status === "completed");
      
      if (!allCompleted) continue;

      // Check if next round already exists
      const nextRound = round + 1;
      if (matchesByRound[nextRound]) continue;

      // Get winners from this round
      const winners: { id: string; name: string }[] = [];
      for (const match of roundMatches) {
        if ((match.player1_score ?? 0) > (match.player2_score ?? 0) && match.player1) {
          winners.push(match.player1);
        } else if ((match.player2_score ?? 0) > (match.player1_score ?? 0) && match.player2) {
          winners.push(match.player2);
        }
      }

      // Only create next round if we have 2 or more winners
      if (winners.length < 2) continue;

      // Create next round matches
      const nextRoundMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextRoundMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            player1_id: winners[i].id,
            player2_id: winners[i + 1].id,
            status: "pending",
          });
        }
      }

      if (nextRoundMatches.length > 0) {
        const { error } = await supabase
          .from("matches")
          .insert(nextRoundMatches);

        if (!error) {
          toast.success(`Round ${nextRound} has been created!`);
        }
      }
    }
  };

  const generateNextRound = async (mode: "auto" | "manual") => {
    const nextRound = rounds.length > 0 ? Math.max(...rounds) + 1 : 1;
    
    if (numberOfRounds && nextRound > numberOfRounds) {
      toast.error(`Maximum rounds (${numberOfRounds}) reached`);
      return;
    }

    if (participants.length < 2) {
      toast.error("Need at least 2 participants");
      return;
    }

    // Eliminatory tournaments auto-generate next round via checkAndGenerateNextRound
    if (tournamentType === "eliminatory") {
      toast.info("Eliminatory tournaments auto-generate next rounds when all matches complete");
      return;
    }

    setGeneratingRound(true);
    try {
      const newMatches: any[] = [];

      if (mode === "auto") {
        if (tournamentType === "swiss") {
          // Build existing matches for Swiss pairing algorithm
          const existingMatchPairs = matches.map(m => [
            participants.find(p => p.id === m.player1_id),
            participants.find(p => p.id === m.player2_id)
          ].filter(Boolean));

          // Generate pairings for all rounds up to nextRound
          const allRoundMatches = generateSwissPairings(participants, nextRound, existingMatchPairs, playersPerMatch);
          const roundMatches = allRoundMatches[nextRound - 1] || [];

          for (const matchPlayers of roundMatches) {
            newMatches.push({
              tournament_id: tournamentId,
              round: nextRound,
              player1_id: matchPlayers[0]?.id,
              player2_id: matchPlayers[1]?.id,
              status: "pending",
            });
          }
        } else if (tournamentType === "round_robin") {
          // Round robin doesn't need additional rounds typically
          toast.info("Round robin tournaments have all matches in one round");
          setGeneratingRound(false);
          return;
        }

        const { error } = await supabase.from("matches").insert(newMatches);
        if (error) throw error;

        toast.success(`Round ${nextRound} generated with smart pairing`);
      } else {
        // Manual mode: create blank matches
        const matchesNeeded = Math.ceil(participants.length / playersPerMatch);

        for (let i = 0; i < matchesNeeded; i++) {
          newMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            player1_id: null,
            player2_id: null,
            status: "pending",
          });
        }

        const { error } = await supabase.from("matches").insert(newMatches);
        if (error) throw error;

        toast.success(`Round ${nextRound} created with ${matchesNeeded} blank matches`);
      }

      setSelectedRound(nextRound);
    } catch (error: any) {
      toast.error("Failed to generate round: " + error.message);
    } finally {
      setGeneratingRound(false);
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
  
  const filteredMatches = currentRoundMatches.filter((match) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      match.player1?.name?.toLowerCase().includes(query) ||
      match.player2?.name?.toLowerCase().includes(query)
    );
  });

  const getTableNumber = (match: any) => {
    return currentRoundMatches.findIndex(m => m.id === match.id) + 1;
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
            {tournamentType !== "eliminatory" && tournamentType !== "round_robin" && matchGenerationMode === "auto" && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => generateNextRound("auto")}
                  disabled={generatingRound}
                  className="gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  Generate Next Round
                </Button>
              </div>
            )}
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

          <div className="grid gap-4 md:grid-cols-2">
            {filteredMatches.map((match) => {
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
                            player1Id: match.player1_id, 
                            player2Id: match.player2_id 
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
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{match.player1?.name || "TBD"}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        className="w-16 text-center"
                        placeholder={match.player1_score?.toString() || "0"}
                        value={scores[match.id]?.p1 ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: {
                              p1: parseInt(e.target.value) || 0,
                              p2: prev[match.id]?.p2 || 0,
                            },
                          }))
                        }
                        disabled={match.status === "completed"}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{match.player2?.name || "TBD"}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        className="w-16 text-center"
                        placeholder={match.player2_score?.toString() || "0"}
                        value={scores[match.id]?.p2 ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: {
                              p1: prev[match.id]?.p1 || 0,
                              p2: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        disabled={match.status === "completed"}
                      />
                    </div>
                    {tournamentType === "swiss" && match.status !== "completed" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Winner</label>
                        <div className="flex gap-2">
                          <Button
                            variant={winners[match.id] === match.player1_id ? "default" : "outline"}
                            onClick={() => setWinners((prev) => ({ ...prev, [match.id]: match.player1_id }))}
                            className="flex-1"
                            disabled={!match.player1_id}
                          >
                            {match.player1?.name || "P1"}
                          </Button>
                          <Button
                            variant={winners[match.id] === match.player2_id ? "default" : "outline"}
                            onClick={() => setWinners((prev) => ({ ...prev, [match.id]: match.player2_id }))}
                            className="flex-1"
                            disabled={!match.player2_id}
                          >
                            {match.player2?.name || "P2"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {match.status !== "completed" && (
                      <Button 
                        onClick={() => updateScore(match.id)} 
                        className="w-full"
                        disabled={tournamentType === "swiss" && (!scores[match.id] || !winners[match.id])}
                      >
                        Save Score
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

          {/* Generate Next Round button for manual mode */}
          {matchGenerationMode === "manual" && (() => {
            const highestRound = rounds.length > 0 ? Math.max(...rounds) : 0;
            const highestRoundMatches = groupedMatches[highestRound] || [];
            const allCompleted = highestRoundMatches.length > 0 && highestRoundMatches.every(m => m.status === "completed");
            const canGenerateMore = !numberOfRounds || highestRound < numberOfRounds;
            const isDisabled = generatingRound || !allCompleted || !canGenerateMore;

            let statusMessage = "";
            if (!canGenerateMore) {
              statusMessage = `Maximum rounds (${numberOfRounds}) reached`;
            } else if (!allCompleted) {
              statusMessage = `Complete all matches in Round ${highestRound} to generate the next round`;
            } else {
              statusMessage = `All matches in Round ${highestRound} are completed`;
            }

            return (
              <Card className={`border-dashed ${allCompleted && canGenerateMore ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-muted-foreground">
                    {statusMessage}
                  </p>
                  <Button
                    onClick={() => generateNextRound("manual")}
                    disabled={isDisabled}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Generate Round {highestRound + 1}
                  </Button>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}

      {editingMatch && (
        <EditMatchParticipants
          open={!!editingMatch}
          onOpenChange={(open) => !open && setEditingMatch(null)}
          matchId={editingMatch.id}
          currentPlayer1Id={editingMatch.player1Id}
          currentPlayer2Id={editingMatch.player2Id}
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
