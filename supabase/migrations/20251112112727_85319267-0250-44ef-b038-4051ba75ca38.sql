-- Add players_per_match to tournaments table for Swiss system
ALTER TABLE public.tournaments ADD COLUMN players_per_match integer DEFAULT 2;

-- Add winner_id to matches table
ALTER TABLE public.matches ADD COLUMN winner_id uuid REFERENCES public.participants(id);

-- Create improved Swiss standings function with opponent strength tiebreaker
CREATE OR REPLACE FUNCTION public.get_swiss_tournament_standings(tournament_id_input uuid)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  name text,
  wins bigint,
  losses bigint,
  draws bigint,
  matches_played bigint,
  total_score bigint,
  opponent_strength bigint
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $function$
  WITH participant_stats AS (
    SELECT 
      p.id,
      p.tournament_id,
      p.name,
      COUNT(CASE WHEN m.status = 'completed' AND m.winner_id = p.id THEN 1 END) as wins,
      COUNT(CASE WHEN m.status = 'completed' AND m.winner_id IS NOT NULL AND m.winner_id != p.id THEN 1 END) as losses,
      COUNT(CASE WHEN m.status = 'completed' AND m.winner_id IS NULL THEN 1 END) as draws,
      COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as matches_played,
      COALESCE(SUM(CASE 
        WHEN m.status = 'completed' AND m.player1_id = p.id THEN m.player1_score 
        WHEN m.status = 'completed' AND m.player2_id = p.id THEN m.player2_score 
        ELSE 0 
      END), 0) as total_score
    FROM participants p
    LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
      AND m.tournament_id = p.tournament_id
    WHERE p.tournament_id = tournament_id_input
    GROUP BY p.id, p.tournament_id, p.name
  ),
  opponent_scores AS (
    SELECT 
      p.id as participant_id,
      COALESCE(SUM(CASE 
        WHEN m.player1_id = p.id THEN opp.total_score
        WHEN m.player2_id = p.id THEN opp.total_score
        ELSE 0
      END), 0) as opponent_strength
    FROM participants p
    LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
      AND m.tournament_id = p.tournament_id AND m.status = 'completed'
    LEFT JOIN participant_stats opp ON (
      (m.player1_id = p.id AND m.player2_id = opp.id) OR
      (m.player2_id = p.id AND m.player1_id = opp.id)
    )
    WHERE p.tournament_id = tournament_id_input
    GROUP BY p.id
  )
  SELECT 
    ps.id,
    ps.tournament_id,
    ps.name,
    ps.wins,
    ps.losses,
    ps.draws,
    ps.matches_played,
    ps.total_score,
    COALESCE(os.opponent_strength, 0) as opponent_strength
  FROM participant_stats ps
  LEFT JOIN opponent_scores os ON ps.id = os.participant_id
  ORDER BY ps.wins DESC, ps.total_score DESC, os.opponent_strength DESC;
$function$;