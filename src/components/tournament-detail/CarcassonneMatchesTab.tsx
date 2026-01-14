import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Shuffle, QrCode, Crown } from "lucide-react";
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

  const generateCarcassonnePairings = async () => {
    // Check if matches already exist
    if (matches.length > 0) {
      toast.error("Matches already generated. Delete existing matches to regenerate.");
      return;
    }

    if (participants.length < 2) {
      toast.error("Need at least 2 participants");
      return;
    }

    setGeneratingRound(true);
    try {
      // Generate round robin pairings - each participant plays everyone once
      const newMatches: any[] = [];
      const participantsList = [...participants];
      const n = participantsList.length;
      
      // If odd number, add a "bye" placeholder
      const hasBye = n % 2 === 1;
      if (hasBye) {
        participantsList.push({ id: null, name: "BYE" });
      }
      
      const numRounds = participantsList.length - 1;
      const half = participantsList.length / 2;
      
      // Standard round robin algorithm
      const players = [...participantsList];
      const fixed = players.shift()!; // Fix first player
      
      for (let round = 1; round <= numRounds; round++) {
        const roundPlayers = [fixed, ...players];
        
        for (let i = 0; i < half; i++) {
          const p1 = roundPlayers[i];
          const p2 = roundPlayers[roundPlayers.length - 1 - i];
          
          // Skip matches with BYE
          if (p1.id && p2.id) {
            newMatches.push({
              tournament_id: tournamentId,
              round: round,
              player1_id: p1.id,
              player2_id: p2.id,
              status: "pending",
            });
          }
        }
        
        // Rotate players (except fixed)
        players.push(players.shift()!);
      }

      const { error } = await supabase.from("matches").insert(newMatches);
      if (error) throw error;

      toast.success(`Generated ${newMatches.length} matches across ${numRounds} rounds`);
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
              Generate round-robin pairings for Carcassonne tournament
            </p>
            <Button 
              onClick={generateCarcassonnePairings} 
              disabled={generatingRound || participants.length < 2}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Generate Matches
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