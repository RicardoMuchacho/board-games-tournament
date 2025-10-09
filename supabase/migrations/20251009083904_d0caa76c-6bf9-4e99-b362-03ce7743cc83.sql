-- Fix critical security vulnerabilities

-- 1. FIX SECURITY DEFINER VIEW (Critical)
-- Drop the insecure view and replace with SECURITY INVOKER function
DROP VIEW IF EXISTS public.tournament_standings;

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

-- 2. ADD INPUT VALIDATION CONSTRAINTS (Critical)
-- Drop existing constraints if they exist
DO $$ 
BEGIN
  ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_name_length;
  ALTER TABLE public.participants DROP CONSTRAINT IF EXISTS participants_name_length;
  ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_score_valid;
  ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_score2_valid;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraints
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_name_length 
  CHECK (char_length(name) >= 3 AND char_length(name) <= 100);

ALTER TABLE public.participants ADD CONSTRAINT participants_name_length 
  CHECK (char_length(name) >= 2 AND char_length(name) <= 100);

ALTER TABLE public.matches ADD CONSTRAINT matches_score_valid 
  CHECK (player1_score >= 0 AND player1_score <= 999);

ALTER TABLE public.matches ADD CONSTRAINT matches_score2_valid 
  CHECK (player2_score >= 0 AND player2_score <= 999);