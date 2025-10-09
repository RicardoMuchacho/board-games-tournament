import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6 gap-3">
            <div className="relative">
              <Trophy className="h-16 w-16 text-primary" />
              <div className="absolute inset-0 blur-2xl bg-primary/30 -z-10" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            Tournament Manager
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional board game tournament management platform with real-time leaderboards and
            multiple tournament formats
          </p>
          <Button size="lg" className="mt-8 gap-2" onClick={() => navigate("/auth")}>
            <Trophy className="h-5 w-5" />
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="card gradient-card p-8 rounded-xl shadow-card">
            <Users className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Participant Management</h3>
            <p className="text-muted-foreground">
              Easily add and manage tournament participants with a clean, intuitive interface
            </p>
          </div>
          <div className="card gradient-card p-8 rounded-xl shadow-card">
            <Target className="h-12 w-12 text-accent mb-4" />
            <h3 className="text-xl font-bold mb-2">Multiple Formats</h3>
            <p className="text-muted-foreground">
              Support for Swiss, Eliminatory, and Round Robin tournament systems
            </p>
          </div>
          <div className="card gradient-card p-8 rounded-xl shadow-card">
            <BarChart3 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Real-time Leaderboards</h3>
            <p className="text-muted-foreground">
              Live standings that update instantly as match results are recorded
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
