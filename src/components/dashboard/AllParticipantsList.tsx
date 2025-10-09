import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  tournament_count: number;
  total_wins: number;
  total_victory_points: number;
  total_tournament_points: number;
}

export function AllParticipantsList() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllParticipants();
  }, []);

  const fetchAllParticipants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      if (!user) return;

      // Get all participants from tournaments created by this user
      const { data: participants, error } = await supabase
        .from('participants')
        .select(`
          id,
          name,
          tournament_id,
          tournaments!inner(id, created_by, type)
        `)
        .eq('tournaments.created_by', user.id);

      console.log('Participants query result:', { participants, error });
      if (error) throw error;

      // Get all matches for these participants
      const participantIds = participants?.map(p => p.id) || [];
      
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          player1_id,
          player2_id,
          player1_score,
          player2_score,
          tournament_id
        `)
        .eq('status', 'completed')
        .or(`player1_id.in.(${participantIds.join(',')}),player2_id.in.(${participantIds.join(',')})`, { referencedTable: 'matches' });

      const { data: matchParticipants, error: mpError } = await supabase
        .from('match_participants')
        .select('participant_id, victory_points, tournament_points')
        .in('participant_id', participantIds);

      if (matchesError) throw matchesError;
      if (mpError) throw mpError;

      // Calculate stats for each unique participant name
      const participantMap = new Map<string, {
        id: string;
        tournament_count: number;
        total_wins: number;
        total_victory_points: number;
        total_tournament_points: number;
      }>();

      participants?.forEach((p: any) => {
        if (!participantMap.has(p.name)) {
          participantMap.set(p.name, {
            id: p.id,
            tournament_count: 0,
            total_wins: 0,
            total_victory_points: 0,
            total_tournament_points: 0,
          });
        }
        const stats = participantMap.get(p.name)!;
        stats.tournament_count++;

        // Count wins from regular matches
        const wins = matches?.filter(m => 
          (m.player1_id === p.id && m.player1_score > m.player2_score) ||
          (m.player2_id === p.id && m.player2_score > m.player1_score)
        ).length || 0;
        stats.total_wins += wins;

        // Sum victory points and tournament points from Catan matches
        const vpSum = matchParticipants
          ?.filter(mp => mp.participant_id === p.id)
          .reduce((sum, mp) => sum + (mp.victory_points || 0), 0) || 0;
        
        const tpSum = matchParticipants
          ?.filter(mp => mp.participant_id === p.id)
          .reduce((sum, mp) => sum + (mp.tournament_points || 0), 0) || 0;

        stats.total_victory_points += vpSum;
        stats.total_tournament_points += tpSum;
      });

      const uniqueParticipants = Array.from(participantMap.entries()).map(
        ([name, stats]) => ({
          id: stats.id,
          name,
          tournament_count: stats.tournament_count,
          total_wins: stats.total_wins,
          total_victory_points: stats.total_victory_points,
          total_tournament_points: stats.total_tournament_points,
        })
      );

      // Sort by total wins descending
      uniqueParticipants.sort((a, b) => b.total_wins - a.total_wins || b.total_tournament_points - a.total_tournament_points);
      setParticipants(uniqueParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>Loading participants...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>No participants yet. Create a tournament and add participants to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>Participants Leaderboard</CardTitle>
        </div>
        <CardDescription>
          {participants.length} unique participant{participants.length !== 1 ? 's' : ''} across all your tournaments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="text-center">Tournaments</TableHead>
                <TableHead className="text-center">Wins</TableHead>
                <TableHead className="text-center">Victory Points</TableHead>
                <TableHead className="text-center">Tournament Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant, index) => (
                <TableRow 
                  key={participant.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/participant/${participant.id}`)}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  <TableCell className="text-center">{participant.tournament_count}</TableCell>
                  <TableCell className="text-center font-semibold">{participant.total_wins}</TableCell>
                  <TableCell className="text-center">{participant.total_victory_points}</TableCell>
                  <TableCell className="text-center">{participant.total_tournament_points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
