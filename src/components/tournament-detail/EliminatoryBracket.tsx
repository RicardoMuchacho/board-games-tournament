import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Edit } from "lucide-react";
import { EditMatchParticipants } from "./EditMatchParticipants";

interface Match {
  id: string;
  player1?: { id: string; name: string };
  player2?: { id: string; name: string };
  player1_id?: string;
  player2_id?: string;
  player1_score?: number;
  player2_score?: number;
  status: string;
  round: number;
}

interface EliminatoryBracketProps {
  matches: Match[];
  tournamentId: string;
}

export const EliminatoryBracket = ({ matches, tournamentId }: EliminatoryBracketProps) => {
  const [editingMatch, setEditingMatch] = useState<{ id: string; player1Id?: string; player2Id?: string } | null>(null);

  // Filter out matches where both players are null/undefined
  const validMatches = matches.filter(match => match.player1 || match.player2);
  
  // Group matches by round
  const groupedMatches = validMatches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as { [key: number]: Match[] });

  const rounds = Object.keys(groupedMatches)
    .map(r => parseInt(r))
    .sort((a, b) => a - b);

  if (rounds.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48">
          <p className="text-muted-foreground">No matches yet</p>
        </CardContent>
      </Card>
    );
  }

  const maxRound = Math.max(...rounds);

  const getRoundName = (round: number) => {
    const matchesInRound = groupedMatches[round].length;
    if (matchesInRound === 1) return "Final";
    if (matchesInRound === 2) return "Semi-Finals";
    if (matchesInRound === 4) return "Quarter-Finals";
    if (matchesInRound === 8) return "Round of 16";
    return `Round ${round}`;
  };

  const getWinner = (match: Match) => {
    if (match.status !== "completed") return null;
    if (!match.player1_score && !match.player2_score) return null;
    if ((match.player1_score ?? 0) > (match.player2_score ?? 0)) return match.player1;
    if ((match.player2_score ?? 0) > (match.player1_score ?? 0)) return match.player2;
    return null;
  };

  // Calculate match height and spacing for proper bracket layout
  const matchHeight = 140; // Height of each match card
  const matchSpacing = 20; // Spacing between matches in the same round
  const connectorWidth = 60; // Width of connector lines

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex gap-4 py-8 px-4" style={{ minWidth: 'max-content' }}>
            {rounds.map((round, roundIndex) => {
              const roundMatches = groupedMatches[round];
              const verticalSpacing = Math.pow(2, roundIndex) * (matchHeight + matchSpacing);
              const topOffset = (verticalSpacing - matchHeight) / 2;

              return (
                <div key={round} className="flex flex-col relative" style={{ minWidth: '280px' }}>
                  {/* Round title */}
                  <div className="text-center mb-6 font-semibold text-lg">
                    {getRoundName(round)}
                  </div>

                  {/* Matches for this round */}
                  <div className="relative flex-1">
                    {roundMatches.map((match, matchIndex) => {
                      const winner = getWinner(match);
                      const isPlayer1Winner = winner?.id === match.player1?.id;
                      const isPlayer2Winner = winner?.id === match.player2?.id;
                      const isFinal = round === maxRound;
                      
                      const yPosition = matchIndex * verticalSpacing + topOffset;

                      return (
                        <div
                          key={match.id}
                          className="absolute"
                          style={{ 
                            top: `${yPosition}px`,
                            left: 0,
                            width: '260px'
                          }}
                        >
                          <Card className={`${isFinal && winner ? "border-primary shadow-lg" : ""} bg-card`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Match {matchIndex + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditingMatch({ 
                                    id: match.id, 
                                    player1Id: match.player1_id, 
                                    player2Id: match.player2_id 
                                  })}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className={`flex items-center justify-between p-2 rounded transition-colors ${
                                isPlayer1Winner ? 'bg-primary/20 border-2 border-primary' : 'bg-muted/50'
                              }`}>
                                <span className={`font-medium text-sm ${isPlayer1Winner ? 'text-primary font-bold' : ''}`}>
                                  {match.player1?.name || "TBD"}
                                </span>
                                {match.status === "completed" && (
                                  <span className={`font-bold ${isPlayer1Winner ? 'text-primary' : ''}`}>
                                    {match.player1_score ?? 0}
                                  </span>
                                )}
                              </div>
                              
                              <div className={`flex items-center justify-between p-2 rounded transition-colors ${
                                isPlayer2Winner ? 'bg-primary/20 border-2 border-primary' : 'bg-muted/50'
                              }`}>
                                <span className={`font-medium text-sm ${isPlayer2Winner ? 'text-primary font-bold' : ''}`}>
                                  {match.player2?.name || "TBD"}
                                </span>
                                {match.status === "completed" && (
                                  <span className={`font-bold ${isPlayer2Winner ? 'text-primary' : ''}`}>
                                    {match.player2_score ?? 0}
                                  </span>
                                )}
                              </div>
                              
                              {isFinal && winner && (
                                <div className="flex items-center justify-center gap-2 pt-2 border-t border-primary">
                                  <Trophy className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-bold text-primary">CHAMPION</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Connector lines to next round */}
                          {roundIndex < rounds.length - 1 && (
                            <svg
                              className="absolute"
                              style={{
                                left: '260px',
                                top: '50%',
                                width: `${connectorWidth}px`,
                                height: `${verticalSpacing}px`,
                                transform: 'translateY(-50%)',
                                overflow: 'visible'
                              }}
                            >
                              {/* Horizontal line from match */}
                              <line
                                x1="0"
                                y1="50%"
                                x2={connectorWidth / 2}
                                y2="50%"
                                stroke="hsl(var(--border))"
                                strokeWidth="2"
                              />
                              
                              {/* Vertical line connecting to pair */}
                              {matchIndex % 2 === 0 && (
                                <>
                                  <line
                                    x1={connectorWidth / 2}
                                    y1="50%"
                                    x2={connectorWidth / 2}
                                    y2={verticalSpacing / 2 + (matchHeight + matchSpacing) / 2}
                                    stroke="hsl(var(--border))"
                                    strokeWidth="2"
                                  />
                                  <line
                                    x1={connectorWidth / 2}
                                    y1={verticalSpacing / 2 + (matchHeight + matchSpacing) / 2}
                                    x2={connectorWidth}
                                    y2={verticalSpacing / 2 + (matchHeight + matchSpacing) / 2}
                                    stroke="hsl(var(--border))"
                                    strokeWidth="2"
                                  />
                                </>
                              )}
                              
                              {matchIndex % 2 === 1 && (
                                <line
                                  x1={connectorWidth / 2}
                                  y1="50%"
                                  x2={connectorWidth / 2}
                                  y2={-(verticalSpacing / 2 - (matchHeight + matchSpacing) / 2)}
                                  stroke="hsl(var(--border))"
                                  strokeWidth="2"
                                />
                              )}
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculate height for this round column */}
                  <div style={{ height: `${roundMatches.length * verticalSpacing}px` }} />
                </div>
              );
            })}
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

      {editingMatch && (
        <EditMatchParticipants
          open={!!editingMatch}
          onOpenChange={(open) => !open && setEditingMatch(null)}
          matchId={editingMatch.id}
          currentPlayer1Id={editingMatch.player1Id}
          currentPlayer2Id={editingMatch.player2Id}
          tournamentId={tournamentId}
        />
      )}
    </div>
  );
};
