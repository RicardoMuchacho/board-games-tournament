import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Shuffle, Edit as EditIcon, CheckCircle2, Circle, QrCode, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditParticipantDialog } from "./EditParticipantDialog";
import { CheckInQRDialog } from "./CheckInQRDialog";
import { ExcelImportDialog } from "./ExcelImportDialog";
import { 
  generateCatanPairings, 
  generateSwissPairings, 
  generateRoundRobinPairings, 
  generateEliminatoryPairings,
  calculateTableDistribution
} from "@/lib/tournamentPairing";

interface ParticipantsTabProps {
  tournamentId: string;
  tournamentType: string;
  numberOfRounds?: number;
  matchGenerationMode?: string;
  playersPerMatch?: number;
  checkInToken?: string;
  onTournamentUpdate?: () => void;
  onMatchesGenerated?: () => void;
}

export const ParticipantsTab = ({
  tournamentId,
  tournamentType,
  numberOfRounds,
  matchGenerationMode,
  playersPerMatch = 2,
  checkInToken,
  onTournamentUpdate,
  onMatchesGenerated
}: ParticipantsTabProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<{ id: string; name: string } | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showExcelDialog, setShowExcelDialog] = useState(false);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const [pendingNotCheckedIn, setPendingNotCheckedIn] = useState<any[]>([]);

  useEffect(() => {
    fetchParticipants();

    const channel = supabase
      .channel(`participants-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("name");

    if (error) {
      toast.error("Failed to load participants");
      return;
    }
    setParticipants(data || []);
  };

  const addParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (newName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    if (newName.trim().length > 100) {
      toast.error("Name must be less than 100 characters");
      return;
    }

    const { error } = await supabase.from("participants").insert([
      {
        tournament_id: tournamentId,
        name: newName.trim(),
        checked_in: false,
      },
    ]);

    if (error) {
      toast.error(error.message || "Failed to add participant");
      return;
    }

    setNewName("");
    toast.success("Participant added");
  };

  const deleteParticipant = async (id: string) => {
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove participant");
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    toast.success("Participant removed");
  };

  const toggleCheckIn = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update check-in status");
      return;
    }
    toast.success(currentStatus ? "Checked out" : "Checked in");
  };

  const checkInAll = async () => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: true })
      .eq("tournament_id", tournamentId);

    if (error) {
      toast.error("Failed to check in all participants");
      return;
    }
    toast.success("All participants checked in");
  };

  const removeNotCheckedIn = async () => {
    const notCheckedIn = participants.filter(p => !p.checked_in);
    if (notCheckedIn.length === 0) return;

    const { error } = await supabase
      .from("participants")
      .delete()
      .in("id", notCheckedIn.map(p => p.id));
    if (error) throw error;

    fetchParticipants();
  };

  const insertCatanMatches = async (activeParticipants: any[], rounds: number) => {
    const allRoundMatches = generateCatanPairings(activeParticipants, rounds);
    const matches: any[] = [];

    for (let round = 1; round <= rounds; round++) {
      const roundMatches = allRoundMatches[round - 1] || [];
      for (const matchPlayers of roundMatches) {
        matches.push({
          tournament_id: tournamentId,
          round,
          player1_id: matchPlayers[0]?.id,
          player2_id: matchPlayers[1]?.id,
          player3_id: matchPlayers[2]?.id,
          player4_id: matchPlayers[3]?.id || null,
          status: "pending",
        });
      }
    }

    const { data: insertedMatches, error: matchError } = await supabase
      .from("matches")
      .insert(matches)
      .select();
    if (matchError) throw matchError;

    if (insertedMatches) {
      const matchParticipants: any[] = [];
      let matchIndex = 0;
      for (let round = 1; round <= rounds; round++) {
        const roundMatches = allRoundMatches[round - 1] || [];
        for (const matchPlayers of roundMatches) {
          const match = insertedMatches[matchIndex++];
          for (const player of matchPlayers) {
            matchParticipants.push({
              match_id: match.id,
              participant_id: player.id,
              victory_points: 0,
              tournament_points: 0,
            });
          }
        }
      }

      if (matchParticipants.length > 0) {
        // @ts-ignore - match_participants table type not yet in generated types
        const { error: mpError } = await (supabase as any)
          .from("match_participants")
          .insert(matchParticipants);
        if (mpError) throw mpError;
      }
    }

    return matches.length;
  };

  const insertPairMatches = async (pairings: any[][]) => {
    const matches: any[] = pairings.map(([player1, player2]) => ({
      tournament_id: tournamentId,
      round: 1,
      player1_id: player1.id,
      player2_id: player2.id,
      status: "pending",
    }));

    const { error } = await supabase.from("matches").insert(matches);
    if (error) throw error;

    return matches.length;
  };

  const generateMatches = async () => {
    const checkedInParticipants = participants.filter(p => p.checked_in);
    const notCheckedIn = participants.filter(p => !p.checked_in);
    const isManualMode = matchGenerationMode === "manual";

    if (checkedInParticipants.length === 0) {
      toast.error("No participants checked in. Please check in participants before generating matches.");
      return;
    }

    if (!isManualMode) {
      if (tournamentType === "catan") {
        if (checkedInParticipants.length < 3) {
          toast.error("Catan needs at least 3 checked-in participants");
          return;
        }
      } else if (checkedInParticipants.length < 2) {
        toast.error("Need at least 2 checked-in participants");
        return;
      }
    }

    if (notCheckedIn.length > 0) {
      setPendingNotCheckedIn(notCheckedIn);
      setShowConfirmGenerate(true);
      return;
    }

    await executeGenerateMatches(checkedInParticipants);
  };

  const executeGenerateMatches = async (activeParticipants: any[]) => {
    const isManualMode = matchGenerationMode === "manual";
    const rounds = numberOfRounds || 1;

    setLoading(true);
    try {
      await removeNotCheckedIn();

      await supabase
        .from("tournaments")
        .update({ number_of_participants: activeParticipants.length })
        .eq("id", tournamentId);
      onTournamentUpdate?.();

      await supabase.from("matches").delete().eq("tournament_id", tournamentId);

      let matchCount: number;

      if (tournamentType === "catan") {
        matchCount = await insertCatanMatches(activeParticipants, rounds);
        toast.success(`Generated ${matchCount} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      } else if (isManualMode) {
        const { tableSizes } = calculateTableDistribution(activeParticipants.length, playersPerMatch, 2);
        const matchesPerRound = tableSizes.length || Math.ceil(activeParticipants.length / playersPerMatch);
        const matches: any[] = [];

        // Only generate first round for manual mode
        for (let i = 0; i < matchesPerRound; i++) {
          matches.push({
            tournament_id: tournamentId,
            round: 1,
            player1_id: null,
            player2_id: null,
            status: "pending",
          });
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        matchCount = matches.length;
        toast.success(`Generated ${matchCount} blank matches for round 1`);
      } else if (tournamentType === "round_robin") {
        const allRoundMatches = generateRoundRobinPairings(activeParticipants);
        matchCount = await insertPairMatches(allRoundMatches[0]);
        toast.success(`Generated ${matchCount} matches`);
      } else if (tournamentType === "eliminatory") {
        const allRoundMatches = generateEliminatoryPairings(activeParticipants);
        matchCount = await insertPairMatches(allRoundMatches[0]);
        toast.success(`Generated ${matchCount} matches`);
      } else {
        // Swiss
        const allRoundMatches = generateSwissPairings(activeParticipants, rounds, [], playersPerMatch);
        const matches: any[] = [];

        for (let round = 1; round <= rounds; round++) {
          const roundMatches = allRoundMatches[round - 1] || [];
          for (const matchPlayers of roundMatches) {
            matches.push({
              tournament_id: tournamentId,
              round,
              player1_id: matchPlayers[0]?.id,
              player2_id: matchPlayers[1]?.id,
              status: "pending",
            });
          }
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        matchCount = matches.length;
        toast.success(`Generated ${matchCount} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      }

      onMatchesGenerated?.();
    } catch (error) {
      console.error("Match generation error:", error);
      toast.error("Failed to generate matches");
    } finally {
      setLoading(false);
    }
  };

  const checkedInCount = participants.filter(p => p.checked_in).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={addParticipant} className="flex flex-wrap gap-2">
            <Input
              placeholder="Enter participant name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button
              type="submit"
              className="gap-2"
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setShowExcelDialog(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="text-lg font-semibold">
            {participants.length} Participants
          </h3>
          <p className="text-sm text-muted-foreground">
            {checkedInCount} checked in
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={checkInAll}>
            <CheckCircle2 className="h-4 w-4" />
            Check In All
          </Button>
          {checkInToken && (
            <Button variant="outline" className="gap-2" onClick={() => setShowQRDialog(true)}>
              <QrCode className="h-4 w-4" />
              QR Code
            </Button>
          )}
          <Button
            onClick={generateMatches}
            disabled={loading || checkedInCount === 0}
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            {matchGenerationMode === "auto" ? "Generate Matches" : "Generate First Round"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <Card 
            key={participant.id}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              participant.checked_in ? "border-green-500/50 bg-green-500/5" : ""
            }`}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="p-1">
                  {participant.checked_in ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span
                  className="font-medium flex-1"
                  onClick={() => toggleCheckIn(participant.id, participant.checked_in)}
                >
                  {participant.name}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingParticipant({ id: participant.id, name: participant.name });
                  }}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                {!participant.checked_in && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteParticipant(participant.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingParticipant && (
        <EditParticipantDialog
          open={!!editingParticipant}
          onOpenChange={(open) => !open && setEditingParticipant(null)}
          participantId={editingParticipant.id}
          currentName={editingParticipant.name}
        />
      )}

      {checkInToken && (
        <CheckInQRDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          checkInToken={checkInToken}
        />
      )}

      <ExcelImportDialog
        open={showExcelDialog}
        onOpenChange={setShowExcelDialog}
        tournamentId={tournamentId}
      />

      <ConfirmDialog
        open={showConfirmGenerate}
        onOpenChange={setShowConfirmGenerate}
        title="Remove unchecked participants?"
        description={`${pendingNotCheckedIn.length} participant(s) are not checked in and will be permanently removed from the tournament.`}
        confirmLabel="Continue"
        variant="destructive"
        onConfirm={() => {
          const checkedIn = participants.filter(p => p.checked_in);
          executeGenerateMatches(checkedIn);
        }}
      />
    </div>
  );
};
