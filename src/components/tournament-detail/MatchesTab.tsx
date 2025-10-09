import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface MatchesTabProps {
  tournamentId: string;
}

export const MatchesTab = ({ tournamentId }: MatchesTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [scores, setScores] = useState<{ [key: string]: { p1: number; p2: number } }>({});
  const [selectedRound, setSelectedRound] = useState<number>(1);

  useEffect(() => {
    fetchMatches();

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

    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: score.p1,
        player2_score: score.p2,
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
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as { [key: number]: any[] });

  const rounds = Object.keys(groupedMatches).map(r => parseInt(r)).sort((a, b) => a - b);

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

          <div className="grid gap-4 md:grid-cols-2">
            {groupedMatches[selectedRound]?.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Match</CardTitle>
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
                  {match.status !== "completed" && scores[match.id] && (
                    <Button onClick={() => updateScore(match.id)} className="w-full">
                      Save Score
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
