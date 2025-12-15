import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tournament by token
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, name")
      .eq("check_in_token", token)
      .single();

    if (tournamentError || !tournament) {
      console.log("Tournament lookup error:", tournamentError);
      return new Response(
        JSON.stringify({ error: "Tournament not found or invalid token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get participants for this tournament
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("id, name, phone, checked_in")
      .eq("tournament_id", tournament.id)
      .order("name");

    if (participantsError) {
      console.log("Participants lookup error:", participantsError);
      return new Response(
        JSON.stringify({ error: "Failed to load participants" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        tournament: { name: tournament.name },
        participants: participants || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-checkin-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
