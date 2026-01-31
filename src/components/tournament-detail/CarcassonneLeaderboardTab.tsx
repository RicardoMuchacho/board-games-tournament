import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

interface CarcassonneLeaderboardTabProps {
  tournamentId: string;
}

interface Standing {
  id: string;
  tournament_id: string;
  name: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  total_score: number;
  opponent_score: number;
  point_differential: number;
}

export const CarcassonneLeaderboardTab = ({ tournamentId }: CarcassonneLeaderboardTabProps) => {
  const [standings, setStandings] = useState<Standing[]>([]);

  useEffect(() => {
    fetchStandings();

    const matchesChannel = supabase
      .channel(`carcassonne-standings-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, [tournamentId]);

  const fetchStandings = async () => {
    // @ts-ignore - RPC function type not yet updated in generated types
    const { data, error } = await supabase.rpc("get_carcassonne_tournament_standings", {
      tournament_id_input: tournamentId,
    });

    if (error) {
      toast.error("Failed to load standings");
      return;
    }
    setStandings(data || []);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-primary" />;
    if (index === 1) return <Medal className="h-5 w-5 text-accent" />;
    if (index === 2) return <Award className="h-5 w-5 text-muted-foreground" />;
    return null;
  };

  const getDifferentialDisplay = (diff: number) => {
    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span>+{diff}</span>
        </div>
      );
    }
    if (diff < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <TrendingDown className="h-4 w-4" />
          <span>{diff}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span>0</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Carcassonne Standings
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked by wins, then by point differential (tiebreaker)
        </p>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No standings available yet</p>
            <p className="text-sm mt-2">Complete some matches to see the leaderboard</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Played</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">Opp. Points</TableHead>
                <TableHead className="text-center">Diff.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow 
                  key={standing.id} 
                  className={`${index < 3 ? "bg-muted/30" : ""}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{standing.name}</TableCell>
                  <TableCell className="text-center">{standing.matches_played || 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="bg-green-600">
                      {standing.wins || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">
                      {standing.losses || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {standing.draws || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {standing.total_score || 0}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {standing.opponent_score || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {getDifferentialDisplay(standing.point_differential || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};