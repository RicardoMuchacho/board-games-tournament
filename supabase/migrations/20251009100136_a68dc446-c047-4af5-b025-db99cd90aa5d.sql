-- Create match_participants table for Catan tournaments to track individual player scores
CREATE TABLE IF NOT EXISTS public.match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  victory_points integer DEFAULT 0,
  tournament_points integer DEFAULT 0,
  placement integer,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(match_id, participant_id)
);

-- Enable RLS on match_participants
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match_participants
CREATE POLICY "Users can view match participants in their tournaments"
ON public.match_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = match_participants.match_id
    AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can manage match participants in their tournaments"
ON public.match_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = match_participants.match_id
    AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.id = match_participants.match_id
    AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Enable realtime for match_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;

-- Create function to get Catan tournament standings
CREATE OR REPLACE FUNCTION public.get_catan_tournament_standings(tournament_id_input uuid)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  name text,
  matches_played bigint,
  total_victory_points bigint,
  total_tournament_points bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.tournament_id,
    p.name,
    COUNT(DISTINCT mp.match_id) as matches_played,
    COALESCE(SUM(mp.victory_points), 0) as total_victory_points,
    COALESCE(SUM(mp.tournament_points), 0) as total_tournament_points
  FROM participants p
  LEFT JOIN match_participants mp ON mp.participant_id = p.id
  LEFT JOIN matches m ON m.id = mp.match_id AND m.tournament_id = p.tournament_id AND m.status = 'completed'
  WHERE p.tournament_id = tournament_id_input
  GROUP BY p.id, p.tournament_id, p.name
  ORDER BY total_victory_points DESC, total_tournament_points DESC;
$$;