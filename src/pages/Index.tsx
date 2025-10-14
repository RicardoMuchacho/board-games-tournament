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
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Tournament Manager</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 mb-8">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
            Manage Your Board Game Tournaments Like a Pro
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Create, organize, and track tournaments with real-time leaderboards. 
            Support for Swiss, Eliminatory, and Round Robin formats.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 text-lg h-14 px-8" onClick={() => navigate("/auth")}>
              <Trophy className="h-5 w-5" />
              Start Your First Tournament
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card gradient-card p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Easy Participant Management</h3>
            <p className="text-muted-foreground text-lg">
              Add, edit, and track participants with an intuitive interface designed for tournament organizers.
            </p>
          </div>
          
          <div className="card gradient-card p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow">
            <div className="bg-accent/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Multiple Formats</h3>
            <p className="text-muted-foreground text-lg">
              Choose from Swiss, Eliminatory, or Round Robin systems to match your tournament needs.
            </p>
          </div>
          
          <div className="card gradient-card p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Live Leaderboards</h3>
            <p className="text-muted-foreground text-lg">
              Watch standings update in real-time as matches are completed and results are recorded.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="card gradient-card rounded-2xl shadow-card border border-border p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join tournament organizers who trust our platform to manage their events seamlessly.
          </p>
          <Button size="lg" className="gap-2 text-lg h-14 px-8" onClick={() => navigate("/auth")}>
            <Trophy className="h-5 w-5" />
            Create Free Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
