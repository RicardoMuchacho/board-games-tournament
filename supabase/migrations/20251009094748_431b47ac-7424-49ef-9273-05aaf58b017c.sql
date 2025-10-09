-- Add number_of_participants and number_of_rounds columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN number_of_participants integer,
ADD COLUMN number_of_rounds integer;