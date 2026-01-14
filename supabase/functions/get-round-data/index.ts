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
    const roundParam = url.searchParams.get("round");

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
      .select("id, name, type, players_per_match, status")
      .eq("check_in_token", token)
      .single();

    if (tournamentError || !tournament) {
      console.error("Tournament error:", tournamentError);
      return new Response(
        JSON.stringify({ error: "Tournament not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all matches with status
    const { data: allMatches, error: allMatchesError } = await supabase
      .from("matches")
      .select("round, status")
      .eq("tournament_id", tournament.id);

    if (allMatchesError) {
      console.error("Matches error:", allMatchesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rounds" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rounds = [...new Set(allMatches?.map(m => m.round))].sort((a, b) => a - b);

    // Calculate current active round (first round with incomplete matches)
    const roundStats: Record<number, { total: number; completed: number }> = {};
    for (const match of allMatches || []) {
      if (!roundStats[match.round]) {
        roundStats[match.round] = { total: 0, completed: 0 };
      }
      roundStats[match.round].total++;
      if (match.status === "completed") {
        roundStats[match.round].completed++;
      }
    }

    let currentRound: number | null = null;
    for (const round of rounds) {
      const stats = roundStats[round];
      if (stats && stats.completed < stats.total) {
        currentRound = round;
        break;
      }
    }

    // If all rounds complete, use the last round
    if (currentRound === null && rounds.length > 0) {
      currentRound = rounds[rounds.length - 1];
    }

    // Determine which round to fetch
    const roundToFetch = roundParam ? parseInt(roundParam) : currentRound;

    let matches = [];
    let matchParticipants: Record<string, any[]> = {};

    if (roundToFetch) {
      // For 1v1 games (swiss, carcassonne, etc.), include player info directly
      const { data: roundMatches, error: roundMatchesError } = await supabase
        .from("matches")
        .select(`
          *, 
          game:games(id, name),
          player1:participants!matches_player1_id_fkey(id, name),
          player2:participants!matches_player2_id_fkey(id, name)
        `)
        .eq("tournament_id", tournament.id)
        .eq("round", roundToFetch)
        .order("created_at");

      if (roundMatchesError) {
        console.error("Round matches error:", roundMatchesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch matches" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      matches = roundMatches || [];

      // Get match participants with participant names (for multigame/catan)
      for (const match of matches) {
        const { data: mpData, error: mpError } = await supabase
          .from("match_participants")
          .select(`
            *,
            participant:participants(id, name)
          `)
          .eq("match_id", match.id);

        if (!mpError && mpData && mpData.length > 0) {
          matchParticipants[match.id] = mpData;
        } else if (match.player1 || match.player2) {
          // For 1v1 matches, create matchParticipants from player1/player2
          const participants = [];
          if (match.player1) {
            participants.push({
              id: `${match.id}-p1`,
              match_id: match.id,
              participant_id: match.player1.id,
              victory_points: 0,
              tournament_points: 0,
              placement: null,
              participant: match.player1,
            });
          }
          if (match.player2) {
            participants.push({
              id: `${match.id}-p2`,
              match_id: match.id,
              participant_id: match.player2.id,
              victory_points: 0,
              tournament_points: 0,
              placement: null,
              participant: match.player2,
            });
          }
          if (participants.length > 0) {
            matchParticipants[match.id] = participants;
          }
        }
      }
    }

    // Calculate progress for current round
    const currentRoundStats = currentRound ? roundStats[currentRound] : null;
    const progress = currentRoundStats 
      ? Math.round((currentRoundStats.completed / currentRoundStats.total) * 100)
      : 0;

    return new Response(
      JSON.stringify({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          type: tournament.type,
          players_per_match: tournament.players_per_match,
          status: tournament.status || "active",
        },
        rounds,
        currentRound,
        progress,
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