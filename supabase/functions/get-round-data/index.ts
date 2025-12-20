import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const round = url.searchParams.get("round");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find tournament by check_in_token
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, name, type, players_per_match")
      .eq("check_in_token", token)
      .single();

    if (tournamentError || !tournament) {
      console.error("Tournament error:", tournamentError);
      return new Response(
        JSON.stringify({ error: "Tournament not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all rounds for this tournament
    const { data: allMatches, error: allMatchesError } = await supabase
      .from("matches")
      .select("round")
      .eq("tournament_id", tournament.id);

    if (allMatchesError) {
      console.error("Matches error:", allMatchesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rounds" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rounds = [...new Set(allMatches?.map(m => m.round))].sort((a, b) => a - b);

    // If round specified, get matches for that round
    let matches = [];
    let matchParticipants: Record<string, any[]> = {};

    if (round) {
      const { data: roundMatches, error: roundMatchesError } = await supabase
        .from("matches")
        .select("*, game:games(id, name)")
        .eq("tournament_id", tournament.id)
        .eq("round", parseInt(round))
        .order("created_at");

      if (roundMatchesError) {
        console.error("Round matches error:", roundMatchesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch matches" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      matches = roundMatches || [];

      // Get match participants with participant names
      for (const match of matches) {
        const { data: mpData, error: mpError } = await supabase
          .from("match_participants")
          .select(`
            *,
            participant:participants(id, name)
          `)
          .eq("match_id", match.id);

        if (!mpError && mpData) {
          matchParticipants[match.id] = mpData;
        }
      }
    }

    return new Response(
      JSON.stringify({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          type: tournament.type,
          players_per_match: tournament.players_per_match,
        },
        rounds,
        matches,
        matchParticipants,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
