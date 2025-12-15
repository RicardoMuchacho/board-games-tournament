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
    const { token, matchId, results } = await req.json();

    if (!token || !matchId || !results) {
      return new Response(
        JSON.stringify({ error: "Token, matchId, and results are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, type")
      .eq("check_in_token", token)
      .single();

    if (tournamentError || !tournament) {
      console.error("Tournament error:", tournamentError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify match belongs to tournament
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, tournament_id, status")
      .eq("id", matchId)
      .eq("tournament_id", tournament.id)
      .single();

    if (matchError || !match) {
      console.error("Match error:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (match.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Match already completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update match participants with results
    const isCatan = tournament.type === "catan";
    
    for (const result of results) {
      const { participantId, victoryPoints, placement, tournamentPoints, score } = result;

      if (isCatan) {
        const { error: updateError } = await supabase
          .from("match_participants")
          .upsert({
            match_id: matchId,
            participant_id: participantId,
            victory_points: victoryPoints || 0,
            placement: placement || null,
            tournament_points: tournamentPoints || 0,
          }, {
            onConflict: "match_id,participant_id",
          });

        if (updateError) {
          console.error("Update error:", updateError);
          throw updateError;
        }
      } else {
        // For non-Catan games, update player scores in matches table
        const { data: currentMatch } = await supabase
          .from("matches")
          .select("player1_id, player2_id, player3_id, player4_id")
          .eq("id", matchId)
          .single();

        if (currentMatch) {
          const updateData: Record<string, any> = {};
          if (currentMatch.player1_id === participantId) updateData.player1_score = score;
          else if (currentMatch.player2_id === participantId) updateData.player2_score = score;
          else if (currentMatch.player3_id === participantId) updateData.player3_score = score;
          else if (currentMatch.player4_id === participantId) updateData.player4_score = score;

          if (Object.keys(updateData).length > 0) {
            const { error: matchUpdateError } = await supabase
              .from("matches")
              .update(updateData)
              .eq("id", matchId);

            if (matchUpdateError) {
              console.error("Match update error:", matchUpdateError);
              throw matchUpdateError;
            }
          }
        }
      }
    }

    // Mark match as completed
    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "completed" })
      .eq("id", matchId);

    if (statusError) {
      console.error("Status update error:", statusError);
      throw statusError;
    }

    console.log(`Match ${matchId} results submitted successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit results" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
