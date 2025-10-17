import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const tournamentSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100, "Name must be less than 100 characters"),
  type: z.enum(["swiss", "eliminatory", "round_robin", "catan"]),
  number_of_participants: z.number().min(2).max(100).optional(),
  number_of_rounds: z.number().min(1).max(50).optional(),
  match_generation_mode: z.enum(["auto", "manual"]),
});

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTournamentDialog = ({ open, onOpenChange }: CreateTournamentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"swiss" | "eliminatory" | "round_robin" | "catan">("swiss");
  const [numberOfParticipants, setNumberOfParticipants] = useState<number | undefined>(undefined);
  const [numberOfRounds, setNumberOfRounds] = useState<number | undefined>(undefined);
  const [matchGenerationMode, setMatchGenerationMode] = useState<"auto" | "manual">("auto");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For eliminatory tournaments, calculate rounds automatically
      let finalNumberOfRounds = numberOfRounds;
      if (type === "eliminatory" && numberOfParticipants) {
        finalNumberOfRounds = Math.ceil(Math.log2(numberOfParticipants));
      }

      // Validate input
      const validation = tournamentSchema.safeParse({ 
        name, 
        type,
        number_of_participants: numberOfParticipants,
        number_of_rounds: finalNumberOfRounds,
        match_generation_mode: matchGenerationMode,
      });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a tournament");
        setLoading(false);
        return;
      }

      // @ts-ignore - tournament type 'catan' not yet in generated types
      const { error } = await (supabase as any).from("tournaments").insert([
        {
          name: validation.data.name,
          type: validation.data.type as any,
          status: "active",
          created_by: user.id,
          number_of_participants: validation.data.number_of_participants,
          number_of_rounds: finalNumberOfRounds,
          match_generation_mode: validation.data.match_generation_mode,
        },
      ]);

      if (error) throw error;

      toast.success("Tournament created successfully!");
      onOpenChange(false);
      setName("");
      setType("swiss");
      setNumberOfParticipants(undefined);
      setNumberOfRounds(undefined);
      setMatchGenerationMode("auto");
    } catch (error: any) {
      toast.error(error.message || "Failed to create tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              placeholder="Spring Championship 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tournament Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="swiss">Swiss System</SelectItem>
                <SelectItem value="eliminatory">Eliminatory (Bracket)</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="catan">Catan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchMode">Match Generation Mode</Label>
            <Select value={matchGenerationMode} onValueChange={(value: any) => setMatchGenerationMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-generate matches</SelectItem>
                <SelectItem value="manual">Manual assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="participants">Number of Participants (Optional)</Label>
            <Input
              id="participants"
              type="number"
              min="2"
              max="100"
              placeholder="e.g., 16"
              value={numberOfParticipants || ""}
              onChange={(e) => setNumberOfParticipants(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          {type !== "eliminatory" && (
            <div className="space-y-2">
              <Label htmlFor="rounds">Number of Rounds (Optional)</Label>
              <Input
                id="rounds"
                type="number"
                min="1"
                max="50"
                placeholder="e.g., 5"
                value={numberOfRounds || ""}
                onChange={(e) => setNumberOfRounds(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tournament
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
