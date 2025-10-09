import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantsTab } from "@/components/tournament-detail/ParticipantsTab";
import { MatchesTab } from "@/components/tournament-detail/MatchesTab";
import { CatanMatchesTab } from "@/components/tournament-detail/CatanMatchesTab";
import { LeaderboardTab } from "@/components/tournament-detail/LeaderboardTab";
import { toast } from "sonner";

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTournament(data);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-muted-foreground capitalize">
                {tournament.type.replace("_", " ")} Tournament • {tournament.status}
              </p>
            </div>
          </div>
          {tournament.number_of_rounds && tournament.number_of_rounds > 1 && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/tournament/${id}/rounds`)}
              className="gap-2"
            >
              <Layers className="h-4 w-4" />
              View by Rounds
            </Button>
          )}
        </div>

        <Tabs defaultValue="participants" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="mt-6">
            <ParticipantsTab 
              tournamentId={id!} 
              tournamentType={tournament.type} 
              maxParticipants={tournament.number_of_participants}
              numberOfRounds={tournament.number_of_rounds}
            />
          </TabsContent>
          <TabsContent value="matches" className="mt-6">
            {tournament.type === "catan" ? (
              <CatanMatchesTab tournamentId={id!} />
            ) : (
              <MatchesTab tournamentId={id!} />
            )}
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-6">
            <LeaderboardTab tournamentId={id!} tournamentType={tournament.type} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;
