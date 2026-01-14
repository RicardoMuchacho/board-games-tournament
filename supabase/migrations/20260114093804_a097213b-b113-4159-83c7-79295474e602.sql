-- Add carcassonne to tournament_type enum
ALTER TYPE tournament_type ADD VALUE IF NOT EXISTS 'carcassonne';

-- Create function for Carcassonne tournament standings
-- Winner criteria: most wins, then point differential (sum of score differences per match)
CREATE OR REPLACE FUNCTION public.get_carcassonne_tournament_standings(tournament_id_input uuid)
 RETURNS TABLE(
   id uuid,
   tournament_id uuid,
   name text,
   matches_played bigint,
   wins bigint,
   losses bigint,
   draws bigint,
   total_score bigint,
   opponent_score bigint,
   point_differential bigint
 )
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as matches_played,
    COUNT(CASE 
      WHEN m.status = 'completed' AND m.winner_id = p.id THEN 1 
    END) as wins,
    COUNT(CASE 
      WHEN m.status = 'completed' AND m.winner_id IS NOT NULL AND m.winner_id != p.id THEN 1 
    END) as losses,
    COUNT(CASE 
      WHEN m.status = 'completed' AND m.winner_id IS NULL AND m.player1_score IS NOT NULL THEN 1 
    END) as draws,
    COALESCE(SUM(CASE 
      WHEN m.status = 'completed' AND m.player1_id = p.id THEN m.player1_score 
      WHEN m.status = 'completed' AND m.player2_id = p.id THEN m.player2_score 
      ELSE 0 
    END), 0) as total_score,
    COALESCE(SUM(CASE 
      WHEN m.status = 'completed' AND m.player1_id = p.id THEN m.player2_score 
      WHEN m.status = 'completed' AND m.player2_id = p.id THEN m.player1_score 
      ELSE 0 
    END), 0) as opponent_score,
    COALESCE(SUM(CASE 
      WHEN m.status = 'completed' AND m.player1_id = p.id THEN (m.player1_score - m.player2_score)
      WHEN m.status = 'completed' AND m.player2_id = p.id THEN (m.player2_score - m.player1_score)
      ELSE 0 
    END), 0) as point_differential
  FROM participants p
  LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
    AND m.tournament_id = p.tournament_id
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY wins DESC, point_differential DESC, total_score DESC;
$function$;