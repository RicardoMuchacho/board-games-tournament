-- Add multigame to tournament_type enum
ALTER TYPE tournament_type ADD VALUE 'multigame';

-- Create games table for multi-game tournament configuration
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  available_tables INTEGER NOT NULL DEFAULT 1,
  players_per_table INTEGER NOT NULL DEFAULT 4,
  min_players INTEGER NOT NULL DEFAULT 3,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for games
CREATE POLICY "Users can view games in their tournaments"
ON public.games
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = games.tournament_id
    AND (tournaments.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can manage games in their tournaments"
ON public.games
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = games.tournament_id
    AND (tournaments.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = games.tournament_id
    AND (tournaments.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Add game_id column to matches table
ALTER TABLE public.matches ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE SET NULL;

-- Create function for multi-game tournament standings
CREATE OR REPLACE FUNCTION public.get_multigame_tournament_standings(tournament_id_input uuid)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  name text,
  matches_played bigint,
  first_positions bigint,
  total_victory_points bigint,
  total_tournament_points bigint,
  games_played bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN mp.match_id END) as matches_played,
    COUNT(CASE WHEN m.status = 'completed' AND mp.placement = 1 THEN 1 END) as first_positions,
    COALESCE(SUM(CASE WHEN m.status = 'completed' THEN mp.victory_points ELSE 0 END), 0) as total_victory_points,
    COALESCE(SUM(CASE WHEN m.status = 'completed' THEN mp.tournament_points ELSE 0 END), 0) as total_tournament_points,
    COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.game_id END) as games_played
  FROM participants p
  LEFT JOIN match_participants mp ON mp.participant_id = p.id
  LEFT JOIN matches m ON m.id = mp.match_id AND m.tournament_id = p.tournament_id
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY total_tournament_points DESC, total_victory_points DESC, first_positions DESC;
$$;