import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { generateSwissPairings, generateCatanPairings } from "@/lib/tournamentPairing";

const tournamentEditSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100, "Name must be less than 100 characters"),
  number_of_rounds: z.number().int().min(1, "Must have at least 1 round").max(100, "Maximum 100 rounds"),
});

interface EditTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  currentName: string;
  currentNumberOfRounds: number;
  tournamentType: string;
  playersPerMatch: number;
  onUpdate: () => void;
}

export const EditTournamentDialog = ({
  open,
  onOpenChange,
  tournamentId,
  currentName,
  currentNumberOfRounds,
  tournamentType,
  playersPerMatch,
  onUpdate,
}: EditTournamentDialogProps) => {
  const [name, setName] = useState(currentName);
  const [numberOfRounds, setNumberOfRounds] = useState(currentNumberOfRounds);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setNumberOfRounds(currentNumberOfRounds);
    }
  }, [open, currentName, currentNumberOfRounds]);

  const handleSave = async () => {
    const validation = tournamentEditSchema.safeParse({
      name,
      number_of_rounds: numberOfRounds,
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Update tournament
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({
          name: validation.data.name,
          number_of_rounds: validation.data.number_of_rounds,
        })
        .eq("id", tournamentId);

      if (updateError) throw updateError;

      // If rounds increased, generate new matches
      if (numberOfRounds > currentNumberOfRounds) {
        const { data: participants } = await supabase
          .from("participants")
          .select("*")
          .eq("tournament_id", tournamentId);

        if (participants && participants.length > 0) {
          // Get existing matches to determine highest round
          const { data: existingMatches } = await supabase
            .from("matches")
            .select("round")
            .eq("tournament_id", tournamentId)
            .order("round", { ascending: false })
            .limit(1);

          const currentHighestRound = existingMatches?.[0]?.round || 0;
          const roundsToGenerate = numberOfRounds - currentHighestRound;

          if (roundsToGenerate > 0) {
            let newMatches: any[] = [];

            if (tournamentType === "swiss") {
              // For Swiss, fetch all existing matches for proper pairing
              const { data: allMatches } = await supabase
                .from("matches")
                .select("*")
                .eq("tournament_id", tournamentId);

              // Convert matches to the format expected by generateSwissPairings
              const existingMatchesArray: any[][] = [];
              if (allMatches) {
                allMatches.forEach(match => {
                  const matchParticipants = [];
                  if (match.player1_id) matchParticipants.push(participants.find(p => p.id === match.player1_id));
                  if (match.player2_id) matchParticipants.push(participants.find(p => p.id === match.player2_id));
                  if (match.player3_id) matchParticipants.push(participants.find(p => p.id === match.player3_id));
                  if (match.player4_id) matchParticipants.push(participants.find(p => p.id === match.player4_id));
                  existingMatchesArray.push(matchParticipants.filter(Boolean));
                });
              }
              
              // Generate pairings for additional rounds
              const pairings = generateSwissPairings(
                participants,
                roundsToGenerate,
                existingMatchesArray,
                playersPerMatch
              );

              // Create matches starting from the next round
              pairings.forEach((round, roundIndex) => {
                round.forEach((pair) => {
                  const match: any = {
                    tournament_id: tournamentId,
                    round: currentHighestRound + roundIndex + 1,
                    player1_id: pair[0]?.id || null,
                    player2_id: pair[1]?.id || null,
                    status: "pending",
                  };
                  
                  if (playersPerMatch >= 3) match.player3_id = pair[2]?.id || null;
                  if (playersPerMatch >= 4) match.player4_id = pair[3]?.id || null;
                  
                  newMatches.push(match);
                });
              });
            } else if (tournamentType === "catan") {
              const pairings = generateCatanPairings(participants, roundsToGenerate);
              
              pairings.forEach((round, roundIndex) => {
                round.forEach((group) => {
                  newMatches.push({
                    tournament_id: tournamentId,
                    round: currentHighestRound + roundIndex + 1,
                    player1_id: group[0]?.id || null,
                    player2_id: group[1]?.id || null,
                    player3_id: group[2]?.id || null,
                    player4_id: group[3]?.id || null,
                    status: "pending",
                  });
                });
              });
            } else {
              // For other tournament types, create blank matches
              for (let round = currentHighestRound + 1; round <= numberOfRounds; round++) {
                const matchesPerRound = Math.ceil(participants.length / playersPerMatch);
                for (let i = 0; i < matchesPerRound; i++) {
                  newMatches.push({
                    tournament_id: tournamentId,
                    round,
                    status: "pending",
                  });
                }
              }
            }

            if (newMatches.length > 0) {
              const { error: matchError } = await supabase
                .from("matches")
                .insert(newMatches);

              if (matchError) throw matchError;
            }
          }
        }
      }

      toast.success("Tournament updated");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update tournament: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring Championship 2024"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rounds">Number of Rounds</Label>
            <Input
              id="rounds"
              type="number"
              min="1"
              max="100"
              value={numberOfRounds}
              onChange={(e) => setNumberOfRounds(parseInt(e.target.value) || 1)}
            />
            {numberOfRounds > currentNumberOfRounds && (
              <p className="text-sm text-muted-foreground">
                Increasing rounds will generate {numberOfRounds - currentNumberOfRounds} new round(s) following tournament rules
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
