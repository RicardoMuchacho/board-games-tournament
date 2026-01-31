import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TournamentRounds = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [rounds, setRounds] = useState<number[]>([]);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Get unique rounds from matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("round")
        .eq("tournament_id", id);

      if (matchesError) throw matchesError;

      const uniqueRounds = [...new Set(matchesData?.map(m => m.round) || [])].sort((a, b) => a - b);
      setRounds(uniqueRounds);
      if (uniqueRounds.length > 0) {
        setSelectedRound(uniqueRounds[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load tournament");
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

  if (!tournament) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/tournament/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tournament.name} - Rounds</h1>
            <p className="text-muted-foreground capitalize">
              {tournament.type.replace("_", " ")} Tournament
            </p>
          </div>
        </div>

        {rounds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48">
              <p className="text-muted-foreground">No rounds yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate matches to create rounds
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
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

            <Card>
              <CardHeader>
                <CardTitle>Round {selectedRound}</CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.type === "catan" ? (
                  <RoundMatches tournamentId={id!} round={selectedRound} isCatan />
                ) : (
                  <RoundMatches tournamentId={id!} round={selectedRound} isCatan={false} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

const RoundMatches = ({ tournamentId, round, isCatan }: { tournamentId: string; round: number; isCatan: boolean }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [matchParticipants, setMatchParticipants] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    fetchMatches();

    const matchesChannel = supabase
      .channel(`round-matches-${tournamentId}-${round}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, [tournamentId, round]);

  const fetchMatches = async () => {
    const { data: matchesData, error } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("round", round)
      .order("created_at");

    if (error) {
      toast.error("Failed to load matches");
      return;
    }

    setMatches(matchesData || []);

    if (isCatan) {
      for (const match of matchesData || []) {
        const { data: participantsData } = await (supabase as any)
          .from("match_participants")
          .select(`
            *,
            participant:participants(id, name)
          `)
          .eq("match_id", match.id);

        if (participantsData) {
          setMatchParticipants((prev) => ({
            ...prev,
            [match.id]: participantsData,
          }));
        }
      }
    }
  };

  if (isCatan) {
    return (
      <div className="space-y-4">
        {matches.map((match) => {
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
              <CardContent>
                <div className="space-y-2">
                  {participants.map((mp) => (
                    <div key={mp.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="font-medium">{mp.participant.name}</span>
                      <div className="flex gap-4 text-sm">
                        <span>VP: {mp.victory_points || 0}</span>
                        <span>TP: {mp.tournament_points || 0}</span>
                        {mp.placement && <Badge variant="outline">#{mp.placement}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Card key={match.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{match.player1?.name || "TBD"}</span>
                  <span className="text-2xl font-bold">{match.player1_score || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{match.player2?.name || "TBD"}</span>
                  <span className="text-2xl font-bold">{match.player2_score || 0}</span>
                </div>
              </div>
              <Badge
                variant={
                  match.status === "completed"
                    ? "default"
                    : match.status === "in_progress"
                    ? "secondary"
                    : "outline"
                }
                className="ml-4"
              >
                {match.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TournamentRounds;
