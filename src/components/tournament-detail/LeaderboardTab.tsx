import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardTabProps {
  tournamentId: string;
  tournamentType: string;
}

export const LeaderboardTab = ({ tournamentId, tournamentType }: LeaderboardTabProps) => {
  const [standings, setStandings] = useState<any[]>([]);

  useEffect(() => {
    fetchStandings();

    const channel = supabase
      .channel(`standings-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchStandings = async () => {
    // @ts-ignore - RPC function type not yet updated in generated types
    const { data, error } = await supabase.rpc("get_tournament_standings", {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Tournament Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No standings available yet</p>
            <p className="text-sm mt-2">Complete some matches to see the leaderboard</p>
          </div>
        ) : tournamentType === "catan" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Played</TableHead>
                <TableHead className="text-center">Victory Points</TableHead>
                <TableHead className="text-center">Tournament Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow key={standing.id} className={index < 3 ? "bg-muted/30" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{standing.name}</TableCell>
                  <TableCell className="text-center">{standing.matches_played || 0}</TableCell>
                  <TableCell className="text-center font-bold text-primary">{standing.total_victory_points || 0}</TableCell>
                  <TableCell className="text-center font-semibold">{standing.total_tournament_points || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Played</TableHead>
                <TableHead className="text-center">Wins</TableHead>
                <TableHead className="text-center">Losses</TableHead>
                <TableHead className="text-center">Draws</TableHead>
                <TableHead className="text-center">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow key={standing.id} className={index < 3 ? "bg-muted/30" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{standing.name}</TableCell>
                  <TableCell className="text-center">{standing.matches_played || 0}</TableCell>
                  <TableCell className="text-center text-success">{standing.wins || 0}</TableCell>
                  <TableCell className="text-center text-destructive">{standing.losses || 0}</TableCell>
                  <TableCell className="text-center">{standing.draws || 0}</TableCell>
                  <TableCell className="text-center font-bold">{standing.total_score || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
