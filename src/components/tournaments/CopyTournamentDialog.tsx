import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type TournamentType = Database["public"]["Enums"]["tournament_type"];

interface Participant {
  id: string;
  name: string;
  phone: string | null;
  selected: boolean;
}

interface CopyTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: {
    id: string;
    name: string;
    type: TournamentType;
    number_of_rounds: number | null;
    players_per_match: number | null;
    match_generation_mode: string | null;
  } | null;
}

export const CopyTournamentDialog = ({ open, onOpenChange, tournament }: CopyTournamentDialogProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<TournamentType>("swiss");
  const [numberOfRounds, setNumberOfRounds] = useState<number>(3);
  const [playersPerMatch, setPlayersPerMatch] = useState<number>(2);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    if (open && tournament) {
      setName(`${tournament.name} (Copia)`);
      setType(tournament.type);
      setNumberOfRounds(tournament.number_of_rounds || 3);
      setPlayersPerMatch(tournament.players_per_match || 2);
      fetchParticipants();
    }
  }, [open, tournament]);

  const fetchParticipants = async () => {
    if (!tournament) return;
    
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, phone")
        .eq("tournament_id", tournament.id)
        .order("name");

      if (error) throw error;

      setParticipants((data || []).map(p => ({ ...p, selected: true })));
    } catch (error: any) {
      toast.error("Error al cargar participantes");
    } finally {
      setLoadingParticipants(false);
    }
  };

  const toggleParticipant = (id: string) => {
    setParticipants(prev => 
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const selectAll = () => {
    setParticipants(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setParticipants(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Create new tournament
      const { data: newTournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert({
          name: name.trim(),
          type,
          number_of_rounds: numberOfRounds,
          players_per_match: type === "catan" || type === "multigame" ? playersPerMatch : 2,
          match_generation_mode: tournament?.match_generation_mode || "auto",
          created_by: user.id,
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Copy selected participants
      const selectedParticipants = participants.filter(p => p.selected);
      if (selectedParticipants.length > 0) {
        const newParticipants = selectedParticipants.map(p => ({
          name: p.name,
          phone: p.phone,
          tournament_id: newTournament.id,
          checked_in: false,
        }));

        const { error: insertError } = await supabase
          .from("participants")
          .insert(newParticipants);

        if (insertError) throw insertError;
      }

      toast.success("Torneo copiado correctamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al copiar torneo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = participants.filter(p => p.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copiar Torneo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del torneo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del torneo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de torneo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TournamentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="swiss">Suizo</SelectItem>
                <SelectItem value="round_robin">Todos contra todos</SelectItem>
                <SelectItem value="eliminatory">Eliminatorio</SelectItem>
                <SelectItem value="catan">Catán</SelectItem>
                <SelectItem value="carcassonne">Carcassonne (1v1)</SelectItem>
                <SelectItem value="multigame">Multijuego</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rounds">Número de rondas</Label>
              <Input
                id="rounds"
                type="number"
                min={1}
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(parseInt(e.target.value) || 1)}
              />
            </div>

            {(type === "catan" || type === "multigame") && (
              <div className="space-y-2">
                <Label htmlFor="players">Jugadores por mesa</Label>
                <Input
                  id="players"
                  type="number"
                  min={2}
                  max={6}
                  value={playersPerMatch}
                  onChange={(e) => setPlayersPerMatch(parseInt(e.target.value) || 4)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Participantes ({selectedCount}/{participants.length})</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Ninguno
                </Button>
              </div>
            </div>
            
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay participantes en el torneo original
              </p>
            ) : (
              <ScrollArea className="flex-1 border rounded-md p-2 min-h-[150px] max-h-[200px]">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleParticipant(participant.id)}
                    >
                      <Checkbox
                        checked={participant.selected}
                        onCheckedChange={() => toggleParticipant(participant.id)}
                      />
                      <span className="flex-1">{participant.name}</span>
                      {participant.phone && (
                        <span className="text-xs text-muted-foreground">{participant.phone}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Copia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
