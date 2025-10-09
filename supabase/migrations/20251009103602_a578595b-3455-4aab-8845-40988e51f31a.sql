-- Drop and recreate get_catan_tournament_standings with new columns
DROP FUNCTION IF EXISTS public.get_catan_tournament_standings(uuid);

CREATE FUNCTION public.get_catan_tournament_standings(tournament_id_input uuid)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  name text,
  matches_played bigint,
  first_positions bigint,
  total_victory_points bigint,
  total_tournament_points bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN mp.match_id END) as matches_played,
    COUNT(CASE WHEN m.status = 'completed' AND mp.placement = 1 THEN 1 END) as first_positions,
    COALESCE(SUM(CASE WHEN m.status = 'completed' THEN mp.victory_points ELSE 0 END), 0) as total_victory_points,
    COALESCE(SUM(CASE WHEN m.status = 'completed' THEN mp.tournament_points ELSE 0 END), 0) as total_tournament_points
  FROM participants p
  LEFT JOIN match_participants mp ON mp.participant_id = p.id
  LEFT JOIN matches m ON m.id = mp.match_id AND m.tournament_id = p.tournament_id
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY total_tournament_points DESC, total_victory_points DESC, first_positions DESC;
$function$;

-- Update get_tournament_standings to count only completed matches
CREATE OR REPLACE FUNCTION public.get_tournament_standings(tournament_id_input uuid)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  name text,
  wins bigint,
  losses bigint,
  draws bigint,
  matches_played bigint,
  total_score bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(CASE WHEN m.status = 'completed' AND ((m.player1_id = p.id AND m.player1_score > m.player2_score) OR 
                     (m.player2_id = p.id AND m.player2_score > m.player1_score)) 
              THEN 1 END) as wins,
    COUNT(CASE WHEN m.status = 'completed' AND ((m.player1_id = p.id AND m.player1_score < m.player2_score) OR 
                     (m.player2_id = p.id AND m.player2_score < m.player1_score)) 
              THEN 1 END) as losses,
    COUNT(CASE WHEN m.status = 'completed' AND m.player1_score = m.player2_score 
              THEN 1 END) as draws,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as matches_played,
    COALESCE(SUM(CASE WHEN m.status = 'completed' AND m.player1_id = p.id THEN m.player1_score 
                      WHEN m.status = 'completed' AND m.player2_id = p.id THEN m.player2_score 
                      ELSE 0 END), 0) as total_score
  FROM participants p
  LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
    AND m.tournament_id = p.tournament_id
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY wins DESC, total_score DESC;
$function$;