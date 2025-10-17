-- Add match_generation_mode column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN match_generation_mode text DEFAULT 'auto' CHECK (match_generation_mode IN ('auto', 'manual'));