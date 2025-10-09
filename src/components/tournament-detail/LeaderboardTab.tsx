import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardTabProps {
  tournamentId: string;
  tournamentType: string;
}

export const LeaderboardTab = ({ tournamentId, tournamentType }: LeaderboardTabProps) => {
  const navigate = useNavigate();
  const [standings, setStandings] = useState<any[]>([]);

  useEffect(() => {
    fetchStandings();

    const matchesChannel = supabase
      .channel(`standings-matches-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    const mpChannel = supabase
      .channel(`standings-mp-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_participants" },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(mpChannel);
    };
  }, [tournamentId, tournamentType]);

  const fetchStandings = async () => {
    if (tournamentType === "catan") {
      // @ts-ignore - RPC function type not yet updated in generated types
      const { data, error } = await supabase.rpc("get_catan_tournament_standings", {
        tournament_id_input: tournamentId,
      });

      if (error) {
        toast.error("Failed to load standings");
        return;
      }
      setStandings(data || []);
    } else {
      // @ts-ignore - RPC function type not yet updated in generated types
      const { data, error } = await supabase.rpc("get_tournament_standings", {
        tournament_id_input: tournamentId,
      });

      if (error) {
        toast.error("Failed to load standings");
        return;
      }
      setStandings(data || []);
    }
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
                <TableHead className="text-center">1st Place</TableHead>
                <TableHead className="text-center">Victory Points</TableHead>
                <TableHead className="text-center">Tournament Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow 
                  key={standing.id} 
                  className={`${index < 3 ? "bg-muted/30" : ""} cursor-pointer hover:bg-accent/50 transition-colors`}
                  onClick={() => navigate(`/participant/${standing.id}`)}
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
                    <Badge variant="secondary">{standing.first_positions || 0}</Badge>
                  </TableCell>
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
                <TableRow 
                  key={standing.id} 
                  className={`${index < 3 ? "bg-muted/30" : ""} cursor-pointer hover:bg-accent/50 transition-colors`}
                  onClick={() => navigate(`/participant/${standing.id}`)}
                >
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
