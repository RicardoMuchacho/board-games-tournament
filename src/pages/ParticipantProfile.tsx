import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ParticipantData {
  id: string;
  name: string;
  tournament_id: string;
  created_at: string;
  tournament: {
    id: string;
    name: string;
    type: string;
    status: string;
    created_at: string;
  };
  stats?: {
    matches_played: number;
    wins?: number;
    losses?: number;
    draws?: number;
    total_score?: number;
    total_victory_points?: number;
    total_tournament_points?: number;
    first_positions?: number;
  };
}

const ParticipantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(null);
  const [participantHistory, setParticipantHistory] = useState<ParticipantData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipantData();
  }, [id]);

  const fetchParticipantData = async () => {
    try {
      // Fetch the main participant
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .select(`
          *,
          tournament:tournaments(id, name, type, status, created_at)
        `)
        .eq("id", id)
        .single();

      if (participantError) throw participantError;
      setParticipant(participantData);

      // Fetch all participants with the same name across all tournaments
      const { data: historyData, error: historyError } = await supabase
        .from("participants")
        .select(`
          *,
          tournament:tournaments(id, name, type, status, created_at)
        `)
        .eq("name", participantData.name)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Fetch stats for each tournament
      const historyWithStats = await Promise.all(
        (historyData || []).map(async (p: any) => {
          if (p.tournament.type === "catan") {
            const { data: catanStats } = await supabase.rpc(
              "get_catan_tournament_standings",
              { tournament_id_input: p.tournament_id }
            );
            const participantStats = catanStats?.find((s: any) => s.id === p.id);
            return {
              ...p,
              stats: participantStats
                ? {
                    matches_played: participantStats.matches_played || 0,
                    total_victory_points: participantStats.total_victory_points || 0,
                    total_tournament_points: participantStats.total_tournament_points || 0,
                    first_positions: participantStats.first_positions || 0,
                  }
                : null,
            };
          } else {
            const { data: regularStats } = await supabase.rpc(
              "get_tournament_standings",
              { tournament_id_input: p.tournament_id }
            );
            const participantStats = regularStats?.find((s: any) => s.id === p.id);
            return {
              ...p,
              stats: participantStats
                ? {
                    matches_played: participantStats.matches_played || 0,
                    wins: participantStats.wins || 0,
                    losses: participantStats.losses || 0,
                    draws: participantStats.draws || 0,
                    total_score: participantStats.total_score || 0,
                  }
                : null,
            };
          }
        })
      );

      setParticipantHistory(historyWithStats);
    } catch (error: any) {
      toast.error("Failed to load participant data");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!participant) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{participant.name}</h1>
            <p className="text-muted-foreground">Participant Profile</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participantHistory.length === 0 ? (
                  <p className="text-muted-foreground">No tournament history</p>
                ) : (
                  participantHistory.map((p) => (
                    <Card
                      key={p.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/tournament/${p.tournament_id}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{p.tournament.name}</h3>
                              <Badge variant="outline" className="capitalize">
                                {p.tournament.type.replace("_", " ")}
                              </Badge>
                              <Badge
                                variant={
                                  p.tournament.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {p.tournament.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Joined {new Date(p.created_at).toLocaleDateString()}
                            </p>

                            {p.stats && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Matches</p>
                                  <p className="text-xl font-bold">
                                    {p.stats.matches_played}
                                  </p>
                                </div>
                                {p.tournament.type === "catan" ? (
                                  <>
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Victory Points
                                      </p>
                                      <p className="text-xl font-bold">
                                        {p.stats.total_victory_points}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Tournament Points
                                      </p>
                                      <p className="text-xl font-bold">
                                        {p.stats.total_tournament_points}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        1st Places
                                      </p>
                                      <p className="text-xl font-bold">
                                        {p.stats.first_positions}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Wins</p>
                                      <p className="text-xl font-bold text-green-600">
                                        {p.stats.wins}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Losses</p>
                                      <p className="text-xl font-bold text-red-600">
                                        {p.stats.losses}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Total Score
                                      </p>
                                      <p className="text-xl font-bold">
                                        {p.stats.total_score}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParticipantProfile;
