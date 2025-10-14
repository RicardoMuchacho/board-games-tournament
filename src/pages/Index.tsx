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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-base sm:text-xl font-bold">Tournament Manager</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-primary/10 mb-6 sm:mb-8">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 text-foreground leading-tight">
            Manage Your Board Game Tournaments Like a Pro
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
            Create, organize, and track tournaments with real-time leaderboards. 
            Support for Swiss, Eliminatory, and Round Robin formats.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button size="lg" className="gap-2 text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto" onClick={() => navigate("/auth")}>
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
              Start Your First Tournament
            </Button>
            <Button size="lg" variant="outline" className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Everything You Need</h2>
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="card gradient-card p-6 sm:p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow">
            <div className="bg-primary/10 w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Easy Participant Management</h3>
            <p className="text-muted-foreground text-base sm:text-lg">
              Add, edit, and track participants with an intuitive interface designed for tournament organizers.
            </p>
          </div>
          
          <div className="card gradient-card p-6 sm:p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow">
            <div className="bg-accent/10 w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Multiple Formats</h3>
            <p className="text-muted-foreground text-base sm:text-lg">
              Choose from Swiss, Eliminatory, or Round Robin systems to match your tournament needs.
            </p>
          </div>
          
          <div className="card gradient-card p-6 sm:p-8 rounded-xl shadow-card border border-border transition-smooth hover:shadow-glow sm:col-span-2 md:col-span-1">
            <div className="bg-primary/10 w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Live Leaderboards</h3>
            <p className="text-muted-foreground text-base sm:text-lg">
              Watch standings update in real-time as matches are completed and results are recorded.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="card gradient-card rounded-2xl shadow-card border border-border p-6 sm:p-8 md:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">Ready to Get Started?</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Join tournament organizers who trust our platform to manage their events seamlessly.
          </p>
          <Button size="lg" className="gap-2 text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto" onClick={() => navigate("/auth")}>
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            Create Free Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
