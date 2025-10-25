import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditMatchParticipantsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  currentPlayer1Id?: string | null;
  currentPlayer2Id?: string | null;
  tournamentId: string;
  roundNumber?: number;
}

export const EditMatchParticipants = ({
  open,
  onOpenChange,
  matchId,
  currentPlayer1Id,
  currentPlayer2Id,
  tournamentId,
  roundNumber,
}: EditMatchParticipantsProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [player1Id, setPlayer1Id] = useState<string | undefined>(currentPlayer1Id || undefined);
  const [player2Id, setPlayer2Id] = useState<string | undefined>(currentPlayer2Id || undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchParticipants();
      setPlayer1Id(currentPlayer1Id || undefined);
      setPlayer2Id(currentPlayer2Id || undefined);
    }
  }, [open, currentPlayer1Id, currentPlayer2Id]);

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

  const handleSave = async () => {
    if (!player1Id || !player2Id) {
      toast.error("Please select both players");
      return;
    }

    if (player1Id === player2Id) {
      toast.error("Players must be different");
      return;
    }

    setLoading(true);
    try {
      // Check if participants are already in other matches in the same round
      if (roundNumber) {
        const { data: roundMatches } = await supabase
          .from("matches")
          .select("id, player1_id, player2_id")
          .eq("tournament_id", tournamentId)
          .eq("round", roundNumber)
          .neq("id", matchId);

        if (roundMatches) {
          const usedParticipants = new Set<string>();
          roundMatches.forEach(m => {
            if (m.player1_id) usedParticipants.add(m.player1_id);
            if (m.player2_id) usedParticipants.add(m.player2_id);
          });

          if (usedParticipants.has(player1Id)) {
            const participant = participants.find(p => p.id === player1Id);
            toast.error(`${participant?.name || 'Player 1'} is already in another match this round`);
            setLoading(false);
            return;
          }
          if (usedParticipants.has(player2Id)) {
            const participant = participants.find(p => p.id === player2Id);
            toast.error(`${participant?.name || 'Player 2'} is already in another match this round`);
            setLoading(false);
            return;
          }
        }
      }

      const { error } = await supabase
        .from("matches")
        .update({
          player1_id: player1Id,
          player2_id: player2Id,
        })
        .eq("id", matchId);

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
          <div className="space-y-2">
            <Label>Player 1</Label>
            <Select value={player1Id} onValueChange={setPlayer1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select player 1" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Player 2</Label>
            <Select value={player2Id} onValueChange={setPlayer2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select player 2" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
