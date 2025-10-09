-- Create enum for tournament types
CREATE TYPE tournament_type AS ENUM ('swiss', 'eliminatory', 'round_robin');

-- Create enum for match status
CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type tournament_type NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player1_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status match_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create standings view for leaderboard
CREATE OR REPLACE VIEW tournament_standings AS
SELECT 
  p.id,
  p.name,
  p.tournament_id,
  COUNT(DISTINCT m.id) as matches_played,
  SUM(CASE 
    WHEN m.player1_id = p.id THEN m.player1_score 
    WHEN m.player2_id = p.id THEN m.player2_score 
    ELSE 0 
  END) as total_score,
  SUM(CASE 
    WHEN (m.player1_id = p.id AND m.player1_score > m.player2_score) OR 
         (m.player2_id = p.id AND m.player2_score > m.player1_score) 
    THEN 1 ELSE 0 
  END) as wins,
  SUM(CASE 
    WHEN (m.player1_id = p.id AND m.player1_score < m.player2_score) OR 
         (m.player2_id = p.id AND m.player2_score < m.player1_score) 
    THEN 1 ELSE 0 
  END) as losses,
  SUM(CASE 
    WHEN m.player1_score = m.player2_score AND m.status = 'completed'
    THEN 1 ELSE 0 
  END) as draws
FROM participants p
LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) AND m.status = 'completed'
GROUP BY p.id, p.name, p.tournament_id
ORDER BY wins DESC, total_score DESC;

-- Enable Row Level Security
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin)
CREATE POLICY "Authenticated users can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tournaments"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tournaments"
  ON tournaments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view participants"
  ON participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage participants"
  ON participants FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage matches"
  ON matches FOR ALL
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;