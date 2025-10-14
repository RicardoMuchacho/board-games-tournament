import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Trophy } from "lucide-react";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";


const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Trophy className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/30 -z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Tournament Manager</h1>
              <p className="text-muted-foreground">Manage your board game tournaments</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/leaderboard")} variant="outline" className="gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Tournament
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          <TournamentList />
        </div>
      </div>

      <CreateTournamentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
};

export default Dashboard;
