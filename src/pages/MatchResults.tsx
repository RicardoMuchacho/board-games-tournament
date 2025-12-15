import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Trophy } from "lucide-react";

interface Match {
  id: string;
  round: number;
  status: string;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
}

interface MatchParticipant {
  id: string;
  match_id: string;
  participant_id: string;
  victory_points: number;
  tournament_points: number;
  placement: number | null;
  participant: {
    id: string;
    name: string;
  };
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  players_per_match: number;
}

const MatchResults = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const initialRound = searchParams.get("round");
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(initialRound ? parseInt(initialRound) : null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchParticipants, setMatchParticipants] = useState<Record<string, MatchParticipant[]>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [results, setResults] = useState<Record<string, { victoryPoints: number; placement: number; tournamentPoints: number; score: number }>>({});

  useEffect(() => {
    if (token) {
      fetchTournamentData();
    }
  }, [token]);

  useEffect(() => {
    if (selectedRound && token) {
      fetchRoundData(selectedRound);
    }
  }, [selectedRound, token]);

  const fetchTournamentData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-round-data?token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Tournament not found");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setTournament(data.tournament);
      setRounds(data.rounds);
      
      if (!selectedRound && data.rounds.length > 0) {
        setSelectedRound(data.rounds[data.rounds.length - 1]);
      }
    } catch (err) {
      console.error("Error fetching tournament:", err);
      setError("Failed to load tournament");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundData = async (round: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-round-data?token=${token}&round=${round}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch round data");
      }

      const data = await response.json();
      setMatches(data.matches);
      setMatchParticipants(data.matchParticipants);
    } catch (err) {
      console.error("Error fetching round:", err);
      toast.error("Failed to load round data");
    }
  };

  const getTournamentPoints = (placement: number): number => {
    const points: { [key: number]: number } = { 1: 6, 2: 4, 3: 2, 4: 1 };
    return points[placement] || 0;
  };

  const handleSubmitResults = async () => {
    if (!selectedTable || !token) return;

    const match = matches.find(m => m.id === selectedTable);
    if (!match) return;

    const participants = matchParticipants[selectedTable] || [];
    const isCatan = tournament?.type === "catan";

    // Validate results
    const resultEntries = Object.entries(results);
    if (resultEntries.length !== participants.length) {
      toast.error("Please enter results for all players");
      return;
    }

    if (isCatan) {
      const placements = resultEntries.map(([, r]) => r.placement).filter(p => p > 0);
      if (placements.length !== participants.length) {
        toast.error("Please enter placement for all players");
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-match-results`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            matchId: selectedTable,
            results: resultEntries.map(([participantId, data]) => ({
              participantId,
              victoryPoints: data.victoryPoints,
              placement: data.placement,
              tournamentPoints: data.tournamentPoints,
              score: data.score,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit results");
      }

      toast.success("Results submitted successfully!");
      setSelectedTable(null);
      setResults({});
      fetchRoundData(selectedRound!);
    } catch (err: any) {
      console.error("Error submitting results:", err);
      toast.error(err.message || "Failed to submit results");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCatan = tournament?.type === "catan";

  // If a table is selected, show the result entry form
  if (selectedTable) {
    const match = matches.find(m => m.id === selectedTable);
    const participants = matchParticipants[selectedTable] || [];
    const tableNumber = matches.findIndex(m => m.id === selectedTable) + 1;

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Table {tableNumber}</CardTitle>
              <p className="text-center text-muted-foreground text-sm">
                {tournament?.name} - Round {selectedRound}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.map((mp) => (
                <div key={mp.participant.id} className="p-4 border rounded-lg space-y-3">
                  <div className="font-medium text-lg">{mp.participant.name}</div>
                  
                  {isCatan ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Victory Points</label>
                        <Input
                          type="number"
                          min="0"
                          max="99"
                          value={results[mp.participant.id]?.victoryPoints ?? ""}
                          onChange={(e) => {
                            const victoryPoints = parseInt(e.target.value) || 0;
                            setResults(prev => ({
                              ...prev,
                              [mp.participant.id]: {
                                ...prev[mp.participant.id],
                                victoryPoints,
                                score: 0,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Placement (1-{participants.length})</label>
                        <Input
                          type="number"
                          min="1"
                          max={participants.length}
                          value={results[mp.participant.id]?.placement ?? ""}
                          onChange={(e) => {
                            const placement = parseInt(e.target.value) || 1;
                            const tournamentPoints = getTournamentPoints(placement);
                            setResults(prev => ({
                              ...prev,
                              [mp.participant.id]: {
                                ...prev[mp.participant.id],
                                placement,
                                tournamentPoints,
                                score: 0,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div className="col-span-2 text-center text-sm text-muted-foreground">
                        Tournament Points: {results[mp.participant.id]?.tournamentPoints ?? 0}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm text-muted-foreground">Score</label>
                      <Input
                        type="number"
                        min="0"
                        value={results[mp.participant.id]?.score ?? ""}
                        onChange={(e) => {
                          const score = parseInt(e.target.value) || 0;
                          setResults(prev => ({
                            ...prev,
                            [mp.participant.id]: {
                              ...prev[mp.participant.id],
                              score,
                              victoryPoints: 0,
                              placement: 0,
                              tournamentPoints: 0,
                            },
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTable(null);
                    setResults({});
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitResults}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Submitting..." : "Submit Results"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{tournament?.name}</CardTitle>
            <p className="text-center text-muted-foreground">
              Select your table to enter results
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Round selector */}
            <div className="flex gap-2 flex-wrap justify-center">
              {rounds.map((round) => (
                <Button
                  key={round}
                  variant={selectedRound === round ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRound(round)}
                >
                  Round {round}
                </Button>
              ))}
            </div>

            {rounds.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No rounds available yet
              </p>
            )}

            {/* Table list */}
            <div className="space-y-3">
              {matches.map((match, index) => {
                const participants = matchParticipants[match.id] || [];
                const isCompleted = match.status === "completed";
                
                return (
                  <button
                    key={match.id}
                    onClick={() => !isCompleted && setSelectedTable(match.id)}
                    disabled={isCompleted}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isCompleted
                        ? "bg-green-500/10 border-green-500/30 cursor-not-allowed"
                        : "hover:bg-muted/50 border-border cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">Table {index + 1}</div>
                          <div className="text-sm text-muted-foreground">
                            {participants.length > 0
                              ? participants.map(p => p.participant.name).join(", ")
                              : "No players assigned"}
                          </div>
                        </div>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchResults;
