import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const TournamentList = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();

    const channel = supabase
      .channel("tournaments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => {
          fetchTournaments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*, participants(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      toast.error("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this tournament?")) return;

    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tournament deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete tournament");
    }
  };

  const handleCopy = async (tournament: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create new tournament with same format
      const { data: newTournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert({
          name: `${tournament.name} (Copy)`,
          type: tournament.type,
          number_of_participants: tournament.number_of_participants,
          number_of_rounds: tournament.number_of_rounds,
          players_per_match: tournament.players_per_match,
          match_generation_mode: tournament.match_generation_mode,
          created_by: user.id,
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Fetch and copy participants
      const { data: originalParticipants, error: participantsError } = await supabase
        .from("participants")
        .select("name, phone")
        .eq("tournament_id", tournament.id);

      if (participantsError) throw participantsError;

      if (originalParticipants && originalParticipants.length > 0) {
        const newParticipants = originalParticipants.map(p => ({
          name: p.name,
          phone: p.phone,
          tournament_id: newTournament.id,
          checked_in: false,
        }));

        const { error: insertError } = await supabase
          .from("participants")
          .insert(newParticipants);

        if (insertError) throw insertError;
      }

      toast.success("Tournament copied successfully");
    } catch (error: any) {
      toast.error("Failed to copy tournament: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">No tournaments yet</p>
          <p className="text-sm text-muted-foreground">Click "New Tournament" to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Card
          key={tournament.id}
          className="cursor-pointer hover:shadow-glow transition-smooth border-border/50"
          onClick={() => navigate(`/tournament/${tournament.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{tournament.name}</CardTitle>
                <CardDescription className="capitalize">
                  {tournament.type.replace("_", " ")} Tournament
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleCopy(tournament, e)}
                  title="Copy tournament"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => handleDelete(tournament.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{tournament.participants?.[0]?.count || 0} participants</span>
              </div>
              <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
                {tournament.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
