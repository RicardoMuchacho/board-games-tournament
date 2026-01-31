import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Trophy } from "lucide-react";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { boardGameDefaults, type BoardGameDefault } from "@/lib/boardGameDefaults";


const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<BoardGameDefault | null | undefined>(undefined);

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
            {/* <Button onClick={() => { setSelectedPreset(undefined); setShowCreateDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              New Tournament
            </Button> */}
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <h2 className="text-xl font-semibold mb-4">Create Tournament</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {boardGameDefaults.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                setSelectedPreset(game.defaults ? game : null);
                setShowCreateDialog(true);
              }}
              className="relative overflow-hidden rounded-xl h-36 group focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img
                src={game.image}
                alt={game.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-3 left-4 text-white text-lg font-semibold">
                {game.name}
              </span>
            </button>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4">Tournament History</h2>
        <div className="space-y-6">
          <TournamentList />
        </div>
      </div>

      <CreateTournamentDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setSelectedPreset(undefined);
        }}
        boardGamePreset={selectedPreset}
      />
    </div>
  );
};

export default Dashboard;
