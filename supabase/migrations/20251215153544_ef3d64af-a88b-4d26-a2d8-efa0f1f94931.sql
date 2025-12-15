-- Add phone and checked_in fields to participants table
ALTER TABLE public.participants 
ADD COLUMN phone TEXT,
ADD COLUMN checked_in BOOLEAN DEFAULT false;

-- Add check_in_token to tournaments for public QR access
ALTER TABLE public.tournaments 
ADD COLUMN check_in_token UUID DEFAULT gen_random_uuid();

-- Create public policy for check-in page (read-only with token)
CREATE POLICY "Anyone can view participants with valid token"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = participants.tournament_id 
    AND t.check_in_token IS NOT NULL
  )
);