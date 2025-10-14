import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

interface Match {
  id: string;
  player1?: { id: string; name: string };
  player2?: { id: string; name: string };
  player1_score?: number;
  player2_score?: number;
  status: string;
  round: number;
}

interface EliminatoryBracketProps {
  matches: Match[];
}

export const EliminatoryBracket = ({ matches }: EliminatoryBracketProps) => {
  // Group matches by round
  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as { [key: number]: Match[] });

  const rounds = Object.keys(groupedMatches)
    .map(r => parseInt(r))
    .sort((a, b) => a - b);

  const maxRound = Math.max(...rounds);

  const getRoundName = (round: number) => {
    const matchesInRound = groupedMatches[round].length;
    if (matchesInRound === 1) return "Final";
    if (matchesInRound === 2) return "Semi-Finals";
    if (matchesInRound === 4) return "Quarter-Finals";
    return `Round ${round}`;
  };

  const getWinner = (match: Match) => {
    if (match.status !== "completed") return null;
    if (!match.player1_score && !match.player2_score) return null;
    if ((match.player1_score ?? 0) > (match.player2_score ?? 0)) return match.player1;
    if ((match.player2_score ?? 0) > (match.player1_score ?? 0)) return match.player2;
    return null;
  };

  if (matches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48">
          <p className="text-muted-foreground">No matches yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {rounds.map((round, roundIndex) => (
              <div key={round} className="flex-shrink-0 space-y-4" style={{ minWidth: '250px' }}>
                <h3 className="font-semibold text-center mb-4 sticky top-0 bg-background py-2">
                  {getRoundName(round)}
                </h3>
                <div className="space-y-6" style={{ marginTop: roundIndex > 0 ? `${roundIndex * 2}rem` : '0' }}>
                  {groupedMatches[round].map((match, matchIndex) => {
                    const winner = getWinner(match);
                    const isPlayer1Winner = winner?.id === match.player1?.id;
                    const isPlayer2Winner = winner?.id === match.player2?.id;
                    const isFinal = round === maxRound;

                    return (
                      <div
                        key={match.id}
                        className="relative"
                        style={{ marginBottom: roundIndex > 0 ? `${roundIndex * 2}rem` : '1.5rem' }}
                      >
                        <Card className={isFinal && winner ? "border-primary shadow-lg" : ""}>
                          <CardContent className="p-4 space-y-2">
                            <div className={`flex items-center justify-between p-2 rounded ${
                              isPlayer1Winner ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                            }`}>
                              <span className={`font-medium ${isPlayer1Winner ? 'text-primary' : ''}`}>
                                {match.player1?.name || "TBD"}
                              </span>
                              {match.status === "completed" && (
                                <span className={`font-bold ${isPlayer1Winner ? 'text-primary' : ''}`}>
                                  {match.player1_score ?? 0}
                                </span>
                              )}
                            </div>
                            <div className={`flex items-center justify-between p-2 rounded ${
                              isPlayer2Winner ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                            }`}>
                              <span className={`font-medium ${isPlayer2Winner ? 'text-primary' : ''}`}>
                                {match.player2?.name || "TBD"}
                              </span>
                              {match.status === "completed" && (
                                <span className={`font-bold ${isPlayer2Winner ? 'text-primary' : ''}`}>
                                  {match.player2_score ?? 0}
                                </span>
                              )}
                            </div>
                            {isFinal && winner && (
                              <div className="flex items-center justify-center gap-2 pt-2 border-t">
                                <Trophy className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-primary">CHAMPION</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Connector line to next round */}
                        {roundIndex < rounds.length - 1 && (
                          <div className="absolute top-1/2 -right-8 w-8 h-0.5 bg-border" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Podium for top 3 */}
      {maxRound >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Final Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-end gap-4">
              {/* 2nd Place */}
              {groupedMatches[maxRound]?.[0] && (
                <div className="text-center">
                  <div className="bg-muted rounded-lg p-6 h-32 flex flex-col justify-end items-center">
                    <Medal className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-semibold">
                      {getWinner(groupedMatches[maxRound][0])?.id === groupedMatches[maxRound][0].player1?.id
                        ? groupedMatches[maxRound][0].player2?.name
                        : groupedMatches[maxRound][0].player1?.name || "TBD"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium">2nd Place</p>
                </div>
              )}

              {/* 1st Place */}
              {groupedMatches[maxRound]?.[0] && getWinner(groupedMatches[maxRound][0]) && (
                <div className="text-center">
                  <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 h-40 flex flex-col justify-end items-center">
                    <Trophy className="h-10 w-10 text-primary mb-2" />
                    <p className="font-bold text-lg text-primary">
                      {getWinner(groupedMatches[maxRound][0])?.name}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-primary">Champion</p>
                </div>
              )}

              {/* 3rd Place - semifinal losers */}
              {groupedMatches[maxRound - 1]?.[0] && groupedMatches[maxRound - 1][0].status === "completed" && (
                <div className="text-center">
                  <div className="bg-muted rounded-lg p-6 h-28 flex flex-col justify-end items-center">
                    <Award className="h-7 w-7 text-muted-foreground mb-2" />
                    <p className="font-semibold text-sm">
                      {getWinner(groupedMatches[maxRound - 1][0])?.id === groupedMatches[maxRound - 1][0].player1?.id
                        ? groupedMatches[maxRound - 1][0].player2?.name
                        : groupedMatches[maxRound - 1][0].player1?.name || "TBD"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium">3rd Place</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
