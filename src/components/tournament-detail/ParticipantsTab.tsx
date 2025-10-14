import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Shuffle, Edit as EditIcon } from "lucide-react";
import { toast } from "sonner";
import { EditParticipantDialog } from "./EditParticipantDialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  generateCatanPairings, 
  generateSwissPairings, 
  generateRoundRobinPairings, 
  generateEliminatoryPairings 
} from "@/lib/tournamentPairing";

interface ParticipantsTabProps {
  tournamentId: string;
  tournamentType: string;
  maxParticipants?: number;
  numberOfRounds?: number;
}

export const ParticipantsTab = ({ tournamentId, tournamentType, maxParticipants, numberOfRounds }: ParticipantsTabProps) => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<any[]>([]);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchParticipants();
    fetchExistingNames();

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

  const fetchExistingNames = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("participants")
      .select(`
        name,
        tournaments!inner(created_by)
      `)
      .eq("tournaments.created_by", user.id);

    if (error) {
      console.error("Failed to fetch existing names:", error);
      return;
    }

    // Get unique names
    const uniqueNames = [...new Set(data?.map((p: any) => p.name) || [])];
    setExistingNames(uniqueNames.sort());
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

    if (maxParticipants && participants.length >= maxParticipants) {
      toast.error(`Maximum number of participants (${maxParticipants}) reached`);
      return;
    }

    const { error } = await supabase.from("participants").insert([
      {
        tournament_id: tournamentId,
        name: newName.trim(),
      },
    ]);

    if (error) {
      toast.error(error.message || "Failed to add participant");
      return;
    }

    setNewName("");
    setOpen(false);
    toast.success("Participant added");
    fetchExistingNames(); // Refresh the list of existing names
  };

  const deleteParticipant = async (id: string) => {
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove participant");
      return;
    }
    toast.success("Participant removed");
  };

  const generateMatches = async () => {
    if (tournamentType === "catan") {
      if (participants.length < 3) {
        toast.error("Catan needs at least 3 participants");
        return;
      }
    } else if (participants.length < 2) {
      toast.error("Need at least 2 participants");
      return;
    }

    setLoading(true);
    try {
      // Delete existing matches and match_participants
      await supabase.from("matches").delete().eq("tournament_id", tournamentId);

      const matches: any[] = [];
      const matchParticipants: any[] = [];
      const rounds = numberOfRounds || 1;

      if (tournamentType === "catan") {
        // Generate Catan pairings with no repeats
        const allRoundMatches = generateCatanPairings(participants, rounds);
        
        for (let round = 1; round <= rounds; round++) {
          const roundMatches = allRoundMatches[round - 1] || [];
          
          for (const matchPlayers of roundMatches) {
            matches.push({
              tournament_id: tournamentId,
              round: round,
              player1_id: matchPlayers[0]?.id,
              player2_id: matchPlayers[1]?.id,
              player3_id: matchPlayers[2]?.id,
              player4_id: matchPlayers[3]?.id || null,
              status: "pending",
            });
          }
        }

        // Insert matches first
        const { data: insertedMatches, error: matchError } = await supabase
          .from("matches")
          .insert(matches)
          .select();
        
        if (matchError) throw matchError;

        // Create match_participants using the pairing results
        if (insertedMatches) {
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

          // Insert match_participants
          if (matchParticipants.length > 0) {
            // @ts-ignore - match_participants table type not yet in generated types
            const { error: mpError } = await (supabase as any)
              .from("match_participants")
              .insert(matchParticipants);
            if (mpError) throw mpError;
          }
        }

        toast.success(`Generated ${matches.length} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      } else if (tournamentType === "round_robin") {
        // Generate Round Robin pairings
        const allRoundMatches = generateRoundRobinPairings(participants);
        const roundMatches = allRoundMatches[0];
        
        for (const [player1, player2] of roundMatches) {
          matches.push({
            tournament_id: tournamentId,
            round: 1,
            player1_id: player1.id,
            player2_id: player2.id,
            status: "pending",
          });
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches`);
      } else if (tournamentType === "eliminatory") {
        // Generate Eliminatory bracket
        const allRoundMatches = generateEliminatoryPairings(participants);
        const roundMatches = allRoundMatches[0];
        
        for (const [player1, player2] of roundMatches) {
          matches.push({
            tournament_id: tournamentId,
            round: 1,
            player1_id: player1.id,
            player2_id: player2.id,
            status: "pending",
          });
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches`);
      } else {
        // Swiss: Generate pairings with no repeats
        const allRoundMatches = generateSwissPairings(participants, rounds);
        
        for (let round = 1; round <= rounds; round++) {
          const roundMatches = allRoundMatches[round - 1] || [];
          
          for (const [player1, player2] of roundMatches) {
            matches.push({
              tournament_id: tournamentId,
              round: round,
              player1_id: player1.id,
              player2_id: player2.id,
              status: "pending",
            });
          }
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Match generation error:", error);
      toast.error("Failed to generate matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="flex-1 justify-start"
                >
                  {newName || "Select existing or type new name..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search or type new name..." 
                    value={newName}
                    onValueChange={setNewName}
                  />
                  <CommandList>
                    {existingNames.length > 0 && (
                      <>
                        <CommandEmpty>Type to create new participant</CommandEmpty>
                        <CommandGroup heading="Existing Participants">
                          {existingNames
                            .filter(name => 
                              name.toLowerCase().includes(newName.toLowerCase()) &&
                              !participants.some(p => p.name === name)
                            )
                            .map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={async (selectedName) => {
                                  if (maxParticipants && participants.length >= maxParticipants) {
                                    toast.error(`Maximum number of participants (${maxParticipants}) reached`);
                                    setOpen(false);
                                    return;
                                  }

                                  const { error } = await supabase.from("participants").insert([
                                    {
                                      tournament_id: tournamentId,
                                      name: selectedName,
                                    },
                                  ]);

                                  if (error) {
                                    toast.error(error.message || "Failed to add participant");
                                  } else {
                                    toast.success("Participant added");
                                    fetchExistingNames();
                                  }
                                  
                                  setNewName("");
                                  setOpen(false);
                                }}
                              >
                                {name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </>
                    )}
                    {existingNames.length === 0 && (
                      <CommandEmpty>Type name and click Add</CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                addParticipant(e as any);
              }} 
              className="gap-2"
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {participants.length} {maxParticipants ? `/ ${maxParticipants}` : ""} Participants
        </h3>
        <Button onClick={generateMatches} disabled={loading || participants.length < 2} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Generate Matches
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <Card 
            key={participant.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <CardContent className="flex items-center justify-between p-4">
              <span 
                className="font-medium flex-1"
                onClick={() => navigate(`/participant/${participant.id}`)}
              >
                {participant.name}
              </span>
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
    </div>
  );
};
