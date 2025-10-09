import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CatanMatchesTabProps {
  tournamentId: string;
}

export const CatanMatchesTab = ({ tournamentId }: CatanMatchesTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);
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

  useEffect(() => {
    fetchMatches();

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

  const getTournamentPoints = (placement: number): number => {
    const points: { [key: number]: number } = {
      1: 6,
      2: 4,
      3: 2,
      4: 1,
    };
    return points[placement] || 0;
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
          <div className="flex gap-2 flex-wrap">
            {rounds.map((round) => (
              <Button
                key={round}
                variant={selectedRound === round ? "default" : "outline"}
                onClick={() => setSelectedRound(round)}
              >
                Round {round}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {groupedMatches[selectedRound]?.map((match) => {
              const participants = matchParticipants[match.id] || [];
              
              return (
                <Card key={match.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Catan Match</CardTitle>
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
        </>
      )}
    </div>
  );
};
