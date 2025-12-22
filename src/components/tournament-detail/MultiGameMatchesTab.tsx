import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Shuffle, QrCode, Settings, Flag, PlusCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { EditCatanMatchParticipants } from "./EditCatanMatchParticipants";
import { RoundQRDialog } from "./RoundQRDialog";
import { GameConfigDialog } from "./GameConfigDialog";
import { generateMultiGamePairings, Game } from "@/lib/tournamentPairing";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MultiGameMatchesTabProps {
  tournamentId: string;
  numberOfRounds?: number;
  checkInToken?: string;
  tournamentName?: string;
}

export const MultiGameMatchesTab = ({ 
  tournamentId, 
  numberOfRounds, 
  checkInToken, 
  tournamentName 
}: MultiGameMatchesTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
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
  const [showGameConfig, setShowGameConfig] = useState(false);
  const [tournamentStatus, setTournamentStatus] = useState<string>("active");
  const [showEndTournamentDialog, setShowEndTournamentDialog] = useState(false);

  useEffect(() => {
    fetchMatches();
    fetchParticipants();
    fetchGames();
    fetchTournamentStatus();

    const matchesChannel = supabase
      .channel(`multigame-matches-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => fetchMatches()
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`multigame-match-participants-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_participants" },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [tournamentId]);

  const fetchTournamentStatus = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("status")
      .eq("id", tournamentId)
      .single();
    
    if (data) setTournamentStatus(data.status || "active");
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("checked_in", true);
    
    if (!error && data) setParticipants(data);
  };

  const fetchGames = async () => {
    const { data, error } = await (supabase as any)
      .from("games")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("order_index");
    
    if (!error && data) setGames(data);
  };

  const fetchMatches = async () => {
    const { data: matchesData, error: matchesError } = await (supabase as any)
      .from("matches")
      .select("*, game:games(id, name)")
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("created_at");

    if (matchesError) {
      toast.error("Failed to load matches");
      return;
    }

    setMatches(matchesData || []);

    for (const match of matchesData || []) {
      const { data: participantsData, error: participantsError } = await (supabase as any)
        .from("match_participants")
        .select(`*, participant:participants(id, name)`)
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
      for (const [participantId, scoreData] of Object.entries(matchScores)) {
        const { error } = await (supabase as any)
          .from("match_participants")
          .upsert({
            match_id: matchId,
            participant_id: participantId,
            victory_points: scoreData.victoryPoints,
            tournament_points: scoreData.tournamentPoints,
            placement: scoreData.placement,
          }, { onConflict: "match_id,participant_id" });

        if (error) throw error;
      }

      await supabase
        .from("matches")
        .update({ status: "completed" })
        .eq("id", matchId);

      toast.success("Match scores updated");
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

  // Calculate round progress
  const roundProgress = currentRoundMatches.length > 0
    ? (currentRoundMatches.filter((m: any) => m.status === "completed").length / currentRoundMatches.length) * 100
    : 0;

  // Group matches by game for display
  const matchesByGame = currentRoundMatches.reduce((acc: any, match: any) => {
    const gameId = match.game_id || "unassigned";
    const gameName = match.game?.name || "Sin asignar";
    if (!acc[gameId]) acc[gameId] = { name: gameName, matches: [] };
    acc[gameId].matches.push(match);
    return acc;
  }, {});

  const filteredMatchesByGame = Object.entries(matchesByGame).reduce((acc: any, [gameId, gameData]: any) => {
    const filteredMatches = gameData.matches.filter((match: any) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const participants = matchParticipants[match.id] || [];
      return participants.some((p: any) => p.participant?.name?.toLowerCase().includes(query));
    });
    if (filteredMatches.length > 0) {
      acc[gameId] = { name: gameData.name, matches: filteredMatches };
    }
    return acc;
  }, {});

  const getTournamentPoints = (placement: number): number => {
    const points: { [key: number]: number } = { 1: 6, 2: 4, 3: 2, 4: 1 };
    return points[placement] || 0;
  };

  const generateNextRound = async () => {
    const nextRound = rounds.length > 0 ? Math.max(...rounds) + 1 : 1;
    
    if (numberOfRounds && nextRound > numberOfRounds) {
      toast.error(`Maximum rounds (${numberOfRounds}) reached`);
      return;
    }

    if (participants.length < 3) {
      toast.error("Need at least 3 checked-in participants");
      return;
    }

    if (games.length === 0) {
      toast.error("Please configure games first");
      setShowGameConfig(true);
      return;
    }

    // Validate capacity
    const totalCapacity = games.reduce((sum, g) => sum + g.available_tables * g.players_per_table, 0);
    if (totalCapacity < participants.length) {
      toast.error(`Insufficient capacity: ${totalCapacity} slots for ${participants.length} participants`);
      setShowGameConfig(true);
      return;
    }

    setGeneratingRound(true);
    try {
      // Build history from existing matches
      const existingHistory = new Map<string, { playedWith: Set<string>; playedGames: Set<string> }>();
      participants.forEach(p => {
        existingHistory.set(p.id, { playedWith: new Set(), playedGames: new Set() });
      });

      // Populate history from existing matches
      for (const match of matches) {
        const mps = matchParticipants[match.id] || [];
        const playerIds = mps.map((mp: any) => mp.participant_id);
        
        for (const pid of playerIds) {
          if (!existingHistory.has(pid)) continue;
          const history = existingHistory.get(pid)!;
          
          // Mark game as played
          if (match.game_id) {
            history.playedGames.add(match.game_id);
          }
          
          // Mark opponents
          for (const oppId of playerIds) {
            if (oppId !== pid) history.playedWith.add(oppId);
          }
        }
      }

      const pairings = generateMultiGamePairings(participants, games, existingHistory);
      
      if (pairings.length === 0) {
        toast.error("Could not generate pairings. Check game configuration.");
        return;
      }

      const newMatches: any[] = [];

      for (const gamePairing of pairings) {
        for (const table of gamePairing.tables) {
          newMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            game_id: gamePairing.gameId,
            player1_id: table[0]?.id || null,
            player2_id: table[1]?.id || null,
            player3_id: table[2]?.id || null,
            player4_id: table[3]?.id || null,
            status: "pending",
          });
        }
      }

      console.log("Inserting matches:", newMatches);

      const { data: insertedMatches, error: matchError } = await (supabase as any)
        .from("matches")
        .insert(newMatches)
        .select();

      if (matchError) {
        console.error("Match insertion error:", matchError);
        throw matchError;
      }

      console.log("Inserted matches:", insertedMatches);

      if (insertedMatches && insertedMatches.length > 0) {
        const newMatchParticipants: any[] = [];
        let matchIndex = 0;
        
        for (const gamePairing of pairings) {
          for (const table of gamePairing.tables) {
            const match = insertedMatches[matchIndex];
            if (match) {
              for (const player of table) {
                newMatchParticipants.push({
                  match_id: match.id,
                  participant_id: player.id,
                  victory_points: 0,
                  tournament_points: 0,
                });
              }
            }
            matchIndex++;
          }
        }

        console.log("Inserting match participants:", newMatchParticipants);

        if (newMatchParticipants.length > 0) {
          const { error: mpError } = await (supabase as any)
            .from("match_participants")
            .insert(newMatchParticipants);
          
          if (mpError) {
            console.error("Match participants error:", mpError);
            throw mpError;
          }
        }
      }

      toast.success(`Round ${nextRound} generated with ${newMatches.length} matches`);
      setSelectedRound(nextRound);
      fetchMatches();
    } catch (error: any) {
      console.error("Generate round error:", error);
      toast.error("Failed to generate round: " + error.message);
    } finally {
      setGeneratingRound(false);
    }
  };

  const endTournament = async () => {
    try {
      await supabase
        .from("tournaments")
        .update({ status: "finished" })
        .eq("id", tournamentId);

      setTournamentStatus("finished");
      toast.success("Tournament finished!");
      setShowEndTournamentDialog(false);
    } catch (error: any) {
      toast.error("Failed to end tournament: " + error.message);
    }
  };

  if (tournamentStatus === "finished") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="flex flex-col items-center justify-center h-48">
          <Trophy className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">Tournament Finished</p>
          <p className="text-sm text-muted-foreground mt-2">
            Check the leaderboard for final standings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {games.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground">No games configured</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configure games before generating matches
            </p>
            <Button className="mt-4 gap-2" onClick={() => setShowGameConfig(true)}>
              <Settings className="h-4 w-4" />
              Configure Games
            </Button>
          </CardContent>
        </Card>
      ) : rounds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground">No matches yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              {games.length} game(s) configured, {participants.length} participants checked in
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowGameConfig(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Edit Games
              </Button>
              <Button onClick={generateNextRound} disabled={generatingRound} className="gap-2">
                <Shuffle className="h-4 w-4" />
                Generate Round 1
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Round Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Round {selectedRound} Progress</span>
              <span className="text-muted-foreground">
                {currentRoundMatches.filter((m: any) => m.status === "completed").length} / {currentRoundMatches.length} completed
              </span>
            </div>
            <Progress value={roundProgress} className="h-2" />
          </div>

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
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button variant="outline" onClick={() => setShowGameConfig(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Games
              </Button>
              {checkInToken && (
                <Button variant="outline" onClick={() => setShowQRDialog(true)} className="gap-2">
                  <QrCode className="h-4 w-4" />
                  QR
                </Button>
              )}
              <Button
                variant="outline"
                onClick={generateNextRound}
                disabled={generatingRound || roundProgress < 100}
                className="gap-2"
                title={roundProgress < 100 ? "Complete all matches first" : ""}
              >
                <PlusCircle className="h-4 w-4" />
                Next Round
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowEndTournamentDialog(true)}
                className="gap-2"
              >
                <Flag className="h-4 w-4" />
                End
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

          {Object.entries(filteredMatchesByGame).map(([gameId, gameData]: any) => (
            <div key={gameId} className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Badge variant="secondary">{gameData.name}</Badge>
                <span className="text-muted-foreground text-sm">
                  ({gameData.matches.length} table{gameData.matches.length !== 1 ? "s" : ""})
                </span>
              </h3>
              
              <div className="grid gap-4">
                {gameData.matches.map((match: any, index: number) => {
                  const participants = matchParticipants[match.id] || [];
                  
                  return (
                    <Card key={match.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Table {index + 1}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingMatch({ 
                                id: match.id, 
                                participantIds: participants.map((p: any) => p.participant.id) 
                              })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Badge
                              variant={
                                match.status === "completed" ? "default" :
                                match.status === "in_progress" ? "secondary" : "outline"
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
                            {participants.map((mp: any) => {
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
                                    max={participants.length}
                                    className="text-center"
                                    placeholder={mp.placement?.toString() || "-"}
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
                                  <div className="text-center text-muted-foreground">
                                    {currentScore?.tournamentPoints ?? mp.tournament_points ?? 0}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {match.status !== "completed" && (
                              <Button
                                className="w-full mt-4"
                                onClick={() => updateMatchScores(match.id)}
                                disabled={!scores[match.id]}
                              >
                                Save Scores
                              </Button>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {editingMatch && (
        <EditCatanMatchParticipants
          open={!!editingMatch}
          onOpenChange={() => setEditingMatch(null)}
          matchId={editingMatch.id}
          tournamentId={tournamentId}
          currentParticipantIds={editingMatch.participantIds}
        />
      )}

      <RoundQRDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        checkInToken={checkInToken || ""}
        tournamentName={tournamentName || ""}
      />

      <GameConfigDialog
        open={showGameConfig}
        onOpenChange={setShowGameConfig}
        tournamentId={tournamentId}
        onGamesUpdated={fetchGames}
      />

      <AlertDialog open={showEndTournamentDialog} onOpenChange={setShowEndTournamentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the tournament as finished. The leaderboard will be locked and no more rounds can be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={endTournament}>End Tournament</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};