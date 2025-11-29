import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditTournamentDialog } from "@/components/tournament-detail/EditTournamentDialog";
import { ParticipantsTab } from "@/components/tournament-detail/ParticipantsTab";
import { MatchesTab } from "@/components/tournament-detail/MatchesTab";
import { CatanMatchesTab } from "@/components/tournament-detail/CatanMatchesTab";
import { LeaderboardTab } from "@/components/tournament-detail/LeaderboardTab";
import { EliminatoryLeaderboardTab } from "@/components/tournament-detail/EliminatoryLeaderboardTab";
import { toast } from "sonner";

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTournament, setEditingTournament] = useState(false);

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
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground capitalize">
              {tournament.type.replace("_", " ")} Tournament • {tournament.status}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setEditingTournament(true)}>
            <Edit className="h-5 w-5" />
          </Button>
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
              matchGenerationMode={tournament.match_generation_mode}
              playersPerMatch={tournament.players_per_match}
            />
          </TabsContent>
          <TabsContent value="matches" className="mt-6">
            {tournament.type === "catan" ? (
              <CatanMatchesTab 
                tournamentId={id!} 
                numberOfRounds={tournament.number_of_rounds}
              />
            ) : (
              <MatchesTab 
                tournamentId={id!} 
                tournamentType={tournament.type}
                numberOfRounds={tournament.number_of_rounds}
                playersPerMatch={tournament.players_per_match}
              />
            )}
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-6">
            {tournament.type === "eliminatory" ? (
              <EliminatoryLeaderboardTab tournamentId={id!} />
            ) : (
              <LeaderboardTab tournamentId={id!} tournamentType={tournament.type} />
            )}
          </TabsContent>
        </Tabs>

        <EditTournamentDialog
          open={editingTournament}
          onOpenChange={setEditingTournament}
          tournamentId={id!}
          currentName={tournament.name}
          currentNumberOfRounds={tournament.number_of_rounds}
          tournamentType={tournament.type}
          playersPerMatch={tournament.players_per_match}
          onUpdate={fetchTournament}
        />
      </div>
    </div>
  );
};

export default TournamentDetail;
