import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Shuffle, QrCode, Crown, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { EditMatchParticipants } from "./EditMatchParticipants";
import { RoundQRDialog } from "./RoundQRDialog";

interface CarcassonneMatchesTabProps {
  tournamentId: string;
  numberOfRounds?: number;
  checkInToken?: string;
  tournamentName?: string;
}

export const CarcassonneMatchesTab = ({ 
  tournamentId, 
  numberOfRounds, 
  checkInToken, 
  tournamentName 
}: CarcassonneMatchesTabProps) => {
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
      .channel(`carcassonne-matches-${tournamentId}`)
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
      .select(`
        *,
        player1:participants!matches_player1_id_fkey(id, name),
        player2:participants!matches_player2_id_fkey(id, name)
      `)
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
      toast.error("Score must be between 0 and 999");
      return;
    }
    if (score.p2 < 0 || score.p2 > 999) {
      toast.error("Score must be between 0 and 999");
      return;
    }

    // Require winner selection
    if (!winners[matchId]) {
      toast.error("Please select a winner");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: score.p1,
        player2_score: score.p2,
        winner_id: winners[matchId],
        status: "completed",
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to update score");
      return;
    }

    toast.success("Match result saved");
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
  };

  const clearResult = async (matchId: string) => {
    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: "pending",
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to clear result");
      return;
    }

    toast.success("Result cleared");
    fetchMatches();
  };

  // Build pairing history from existing matches
  const buildPairingHistory = (): Map<string, Set<string>> => {
    const history = new Map<string, Set<string>>();
    for (const match of matches) {
      if (match.player1_id && match.player2_id) {
        if (!history.has(match.player1_id)) history.set(match.player1_id, new Set());
        if (!history.has(match.player2_id)) history.set(match.player2_id, new Set());
        history.get(match.player1_id)!.add(match.player2_id);
        history.get(match.player2_id)!.add(match.player1_id);
      }
    }
    return history;
  };

  // Check if two players have played before
  const havePlayed = (p1Id: string, p2Id: string, history: Map<string, Set<string>>): boolean => {
    return history.get(p1Id)?.has(p2Id) || false;
  };

  // Calculate player standings from completed matches
  const calculateStandings = (): Map<string, { wins: number; pointDiff: number }> => {
    const standings = new Map<string, { wins: number; pointDiff: number }>();
    
    // Initialize all participants
    for (const p of participants) {
      standings.set(p.id, { wins: 0, pointDiff: 0 });
    }
    
    // Calculate from completed matches
    for (const match of matches) {
      if (match.status !== "completed" || !match.player1_id || !match.player2_id) continue;
      
      const p1Score = match.player1_score || 0;
      const p2Score = match.player2_score || 0;
      const diff = p1Score - p2Score;
      
      const p1Stats = standings.get(match.player1_id) || { wins: 0, pointDiff: 0 };
      const p2Stats = standings.get(match.player2_id) || { wins: 0, pointDiff: 0 };
      
      p1Stats.pointDiff += diff;
      p2Stats.pointDiff -= diff;
      
      if (match.winner_id === match.player1_id) {
        p1Stats.wins += 1;
      } else if (match.winner_id === match.player2_id) {
        p2Stats.wins += 1;
      }
      
      standings.set(match.player1_id, p1Stats);
      standings.set(match.player2_id, p2Stats);
    }
    
    return standings;
  };

  const generateRound1 = async () => {
    if (participants.length < 2) {
      toast.error("Need at least 2 participants");
      return;
    }

    setGeneratingRound(true);
    try {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const newMatches: any[] = [];
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        newMatches.push({
          tournament_id: tournamentId,
          round: 1,
          player1_id: shuffled[i].id,
          player2_id: shuffled[i + 1].id,
          status: "pending",
        });
      }
      
      // Handle odd player with bye (skip match)
      if (shuffled.length % 2 === 1) {
        toast.info(`${shuffled[shuffled.length - 1].name} gets a bye this round`);
      }

      const { error } = await supabase.from("matches").insert(newMatches);
      if (error) throw error;

      toast.success(`Generated ${newMatches.length} matches for Round 1`);
      fetchMatches();
    } catch (error: any) {
      toast.error("Failed to generate matches: " + error.message);
    } finally {
      setGeneratingRound(false);
    }
  };

  const generateNextRound = async () => {
    const nextRound = selectedRound + 1;

    setGeneratingRound(true);
    try {
      const standings = calculateStandings();
      const history = buildPairingHistory();
      
      // Sort players by wins (desc), then point differential (desc)
      const sortedPlayers = [...participants].sort((a, b) => {
        const aStats = standings.get(a.id) || { wins: 0, pointDiff: 0 };
        const bStats = standings.get(b.id) || { wins: 0, pointDiff: 0 };
        if (bStats.wins !== aStats.wins) return bStats.wins - aStats.wins;
        return bStats.pointDiff - aStats.pointDiff;
      });

      const paired = new Set<string>();
      const newMatches: any[] = [];

      // Swiss pairing: try to pair adjacent players in standings who haven't played
      for (let i = 0; i < sortedPlayers.length; i++) {
        const p1 = sortedPlayers[i];
        if (paired.has(p1.id)) continue;

        // Find best opponent (closest in standings, hasn't played p1)
        let bestOpponent = null;
        for (let j = i + 1; j < sortedPlayers.length; j++) {
          const p2 = sortedPlayers[j];
          if (paired.has(p2.id)) continue;
          if (!havePlayed(p1.id, p2.id, history)) {
            bestOpponent = p2;
            break;
          }
        }

        // If no unpaired opponent found, allow repeat (but try to avoid)
        if (!bestOpponent) {
          for (let j = i + 1; j < sortedPlayers.length; j++) {
            const p2 = sortedPlayers[j];
            if (!paired.has(p2.id)) {
              bestOpponent = p2;
              break;
            }
          }
        }

        if (bestOpponent) {
          newMatches.push({
            tournament_id: tournamentId,
            round: nextRound,
            player1_id: p1.id,
            player2_id: bestOpponent.id,
            status: "pending",
          });
          paired.add(p1.id);
          paired.add(bestOpponent.id);
        }
      }

      // Handle unpaired player (bye)
      const unpairedPlayer = sortedPlayers.find(p => !paired.has(p.id));
      if (unpairedPlayer) {
        toast.info(`${unpairedPlayer.name} gets a bye this round`);
      }

      if (newMatches.length === 0) {
        toast.error("Could not generate any matches for the next round");
        return;
      }

      const { error } = await supabase.from("matches").insert(newMatches);
      if (error) throw error;

      setSelectedRound(nextRound);
      toast.success(`Generated ${newMatches.length} matches for Round ${nextRound}`);
      fetchMatches();
    } catch (error: any) {
      toast.error("Failed to generate matches: " + error.message);
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
  
  const filteredMatches = currentRoundMatches.filter((match: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      match.player1?.name?.toLowerCase().includes(query) ||
      match.player2?.name?.toLowerCase().includes(query)
    );
  });

  const getTableNumber = (match: any) => {
    return currentRoundMatches.findIndex((m: any) => m.id === match.id) + 1;
  };

  // Calculate point differential for display
  const getPointDifferential = (match: any) => {
    if (match.status !== "completed") return null;
    const p1Score = match.player1_score || 0;
    const p2Score = match.player2_score || 0;
    return Math.abs(p1Score - p2Score);
  };

  return (
    <div className="space-y-6">
      {rounds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 space-y-4">
            <p className="text-muted-foreground">No matches yet</p>
            <p className="text-sm text-muted-foreground">
              Swiss pairing: winners face winners, losers face losers
            </p>
            <Button 
              onClick={generateRound1} 
              disabled={generatingRound || participants.length < 2}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Generate Round 1
            </Button>
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
            {(!numberOfRounds || selectedRound < numberOfRounds) && (
              <Button
                onClick={generateNextRound}
                disabled={generatingRound || !currentRoundMatches.every((m: any) => m.status === "completed")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Generate Round {selectedRound + 1}
              </Button>
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
            {filteredMatches.map((match: any) => {
              const tableNumber = getTableNumber(match);
              const pointDiff = getPointDifferential(match);
              
              return (
                <Card key={match.id} className={match.status === "completed" ? "border-primary/30" : ""}>
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
                          variant={match.status === "completed" ? "default" : "outline"}
                        >
                          {match.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <p className="font-medium">{match.player1?.name || "TBD"}</p>
                        {match.winner_id === match.player1_id && (
                          <Crown className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        className="w-20 text-center"
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
                    
                    {/* Player 2 */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <p className="font-medium">{match.player2?.name || "TBD"}</p>
                        {match.winner_id === match.player2_id && (
                          <Crown className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        className="w-20 text-center"
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

                    {/* Winner Selection */}
                    {match.status !== "completed" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Winner</label>
                        <div className="flex gap-2">
                          <Button
                            variant={winners[match.id] === match.player1_id ? "default" : "outline"}
                            onClick={() => setWinners((prev) => ({ ...prev, [match.id]: match.player1_id }))}
                            className="flex-1"
                            disabled={!match.player1_id}
                            size="sm"
                          >
                            {match.player1?.name || "P1"}
                          </Button>
                          <Button
                            variant={winners[match.id] === match.player2_id ? "default" : "outline"}
                            onClick={() => setWinners((prev) => ({ ...prev, [match.id]: match.player2_id }))}
                            className="flex-1"
                            disabled={!match.player2_id}
                            size="sm"
                          >
                            {match.player2?.name || "P2"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Point differential display for completed matches */}
                    {match.status === "completed" && pointDiff !== null && (
                      <div className="text-center text-sm text-muted-foreground">
                        Point Difference: <span className="font-semibold text-foreground">{pointDiff}</span>
                      </div>
                    )}

                    {/* Save Button */}
                    {match.status !== "completed" && (
                      <Button
                        onClick={() => updateScore(match.id)}
                        disabled={!scores[match.id] || !winners[match.id]}
                        className="w-full"
                      >
                        Save Result
                      </Button>
                    )}

                    {/* Clear Result Button for completed matches */}
                    {match.status === "completed" && (
                      <Button
                        variant="outline"
                        onClick={() => clearResult(match.id)}
                        className="w-full gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear Result
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredMatches.length === 0 && searchQuery && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center h-24">
                <p className="text-muted-foreground">No matches found</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {editingMatch && (
        <EditMatchParticipants
          open={!!editingMatch}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMatch(null);
              fetchMatches();
            }
          }}
          matchId={editingMatch.id}
          tournamentId={tournamentId}
          currentPlayer1Id={editingMatch.player1Id}
          currentPlayer2Id={editingMatch.player2Id}
        />
      )}

      <RoundQRDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        checkInToken={checkInToken || ""}
        tournamentName={tournamentName || ""}
        round={selectedRound}
      />
    </div>
  );
};