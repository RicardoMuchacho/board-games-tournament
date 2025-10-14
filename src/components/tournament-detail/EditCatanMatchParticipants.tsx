import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditCatanMatchParticipantsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  currentParticipantIds: string[];
  tournamentId: string;
}

export const EditCatanMatchParticipants = ({
  open,
  onOpenChange,
  matchId,
  currentParticipantIds,
  tournamentId,
}: EditCatanMatchParticipantsProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentParticipantIds);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchParticipants();
      setSelectedIds(currentParticipantIds);
    }
  }, [open, currentParticipantIds]);

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

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      } else {
        if (prev.length >= 4) {
          toast.error("Maximum 4 players per Catan match");
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    if (selectedIds.length < 3) {
      toast.error("Catan matches require at least 3 players");
      return;
    }

    if (selectedIds.length > 4) {
      toast.error("Catan matches can have maximum 4 players");
      return;
    }

    setLoading(true);
    try {
      // Delete existing match participants
      // @ts-ignore
      await (supabase as any)
        .from("match_participants")
        .delete()
        .eq("match_id", matchId);

      // Insert new match participants
      const participantRecords = selectedIds.map((participantId) => ({
        match_id: matchId,
        participant_id: participantId,
        victory_points: 0,
        tournament_points: 0,
      }));

      // @ts-ignore
      const { error } = await (supabase as any)
        .from("match_participants")
        .insert(participantRecords);

      if (error) throw error;

      toast.success("Match participants updated");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update participants: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Match Participants</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select 3-4 players for this match ({selectedIds.length} selected)
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={p.id}
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggleParticipant(p.id)}
                />
                <Label htmlFor={p.id} className="cursor-pointer">
                  {p.name}
                </Label>
              </div>
            ))}
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
