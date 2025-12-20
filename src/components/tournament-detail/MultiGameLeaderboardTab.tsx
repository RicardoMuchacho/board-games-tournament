import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface MultiGameLeaderboardTabProps {
  tournamentId: string;
}

interface Standing {
  id: string;
  tournament_id: string;
  name: string;
  matches_played: number;
  first_positions: number;
  total_victory_points: number;
  total_tournament_points: number;
  games_played: number;
}

export const MultiGameLeaderboardTab = ({ tournamentId }: MultiGameLeaderboardTabProps) => {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();

    const channel = supabase
      .channel(`multigame-leaderboard-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_participants" },
        () => fetchStandings()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => fetchStandings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchStandings = async () => {
    try {
      const { data, error } = await supabase.rpc("get_multigame_tournament_standings", {
        tournament_id_input: tournamentId,
      });

      if (error) throw error;
      setStandings(data || []);
    } catch (error: any) {
      console.error("Failed to fetch standings:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Game Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No matches completed yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Games</TableHead>
                <TableHead className="text-center">Matches</TableHead>
                <TableHead className="text-center">1st Places</TableHead>
                <TableHead className="text-center">Victory Pts</TableHead>
                <TableHead className="text-center">Tournament Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => {
                const rank = index + 1;
                return (
                  <TableRow key={standing.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(rank)}
                        <span className={rank <= 3 ? "font-bold" : ""}>{rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {standing.name}
                      {rank === 1 && (
                        <Badge variant="default" className="ml-2">Leader</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{standing.games_played}</TableCell>
                    <TableCell className="text-center">{standing.matches_played}</TableCell>
                    <TableCell className="text-center">{standing.first_positions}</TableCell>
                    <TableCell className="text-center">{standing.total_victory_points}</TableCell>
                    <TableCell className="text-center font-bold">
                      {standing.total_tournament_points}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
