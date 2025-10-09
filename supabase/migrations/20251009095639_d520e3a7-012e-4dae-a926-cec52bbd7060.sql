-- Add player3_id and player4_id columns to matches table for Catan support
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player3_id uuid REFERENCES public.participants(id),
ADD COLUMN IF NOT EXISTS player4_id uuid REFERENCES public.participants(id);

-- Add player3_score and player4_score columns
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player3_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS player4_score integer DEFAULT 0;