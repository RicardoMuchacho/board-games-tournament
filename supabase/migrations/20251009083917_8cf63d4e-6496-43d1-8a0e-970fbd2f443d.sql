-- Fix function search_path for get_tournament_standings
-- This is already set correctly, but ensuring it's explicit

CREATE OR REPLACE FUNCTION public.get_tournament_standings(tournament_id_input UUID)
RETURNS TABLE (
  id UUID,
  tournament_id UUID,
  name TEXT,
  wins BIGINT,
  losses BIGINT,
  draws BIGINT,
  matches_played BIGINT,
  total_score BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(CASE WHEN (m.player1_id = p.id AND m.player1_score > m.player2_score) OR 
                     (m.player2_id = p.id AND m.player2_score > m.player1_score) 
              THEN 1 END) as wins,
    COUNT(CASE WHEN (m.player1_id = p.id AND m.player1_score < m.player2_score) OR 
                     (m.player2_id = p.id AND m.player2_score < m.player1_score) 
              THEN 1 END) as losses,
    COUNT(CASE WHEN m.player1_score = m.player2_score AND m.status = 'completed' 
              THEN 1 END) as draws,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as matches_played,
    COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player1_score 
                      WHEN m.player2_id = p.id THEN m.player2_score 
                      ELSE 0 END), 0) as total_score
  FROM participants p
  LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
    AND m.tournament_id = p.tournament_id
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY wins DESC, total_score DESC;
$$;