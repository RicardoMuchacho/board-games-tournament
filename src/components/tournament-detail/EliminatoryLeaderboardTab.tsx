import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EliminatoryBracket } from "./EliminatoryBracket";
import { toast } from "sonner";

interface EliminatoryLeaderboardTabProps {
  tournamentId: string;
}

export const EliminatoryLeaderboardTab = ({ tournamentId }: EliminatoryLeaderboardTabProps) => {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`eliminatory-leaderboard-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:participants!matches_player1_id_fkey(id, name),
          player2:participants!matches_player2_id_fkey(id, name)
        `
        )
        .eq("tournament_id", tournamentId)
        .order("round")
        .order("created_at");

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      toast.error("Failed to load tournament bracket");
      console.error(error);
    }
  };

  return <EliminatoryBracket matches={matches} tournamentId={tournamentId} />;
};
