import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Save, X, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Game {
  id: string;
  name: string;
  available_tables: number;
  players_per_table: number;
  min_players: number;
  order_index: number;
}

interface GameConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onGamesUpdated?: () => void;
}

export const GameConfigDialog = ({ 
  open, 
  onOpenChange, 
  tournamentId,
  onGamesUpdated 
}: GameConfigDialogProps) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [newGame, setNewGame] = useState({
    name: "",
    available_tables: 1,
    players_per_table: 4,
    min_players: 3,
  });
  const [editValues, setEditValues] = useState<Partial<Game>>({});

  useEffect(() => {
    if (open && tournamentId) {
      fetchGames();
      fetchCheckedInCount();
    }
  }, [open, tournamentId]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("games")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("order_index");

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      toast.error("Failed to load games: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckedInCount = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("id", { count: "exact" })
      .eq("tournament_id", tournamentId)
      .eq("checked_in", true);

    if (!error && data) {
      setCheckedInCount(data.length);
    }
  };

  const totalCapacity = games.reduce(
    (sum, game) => sum + game.available_tables * game.players_per_table,
    0
  );

  const capacityStatus = (): { type: "success" | "warning" | "error"; message: string } => {
    if (checkedInCount === 0) {
      return { type: "warning", message: "No participants checked in yet" };
    }
    if (totalCapacity === 0) {
      return { type: "error", message: `Need capacity for ${checkedInCount} participants` };
    }
    if (totalCapacity < checkedInCount) {
      const missing = checkedInCount - totalCapacity;
      return { type: "error", message: `Insufficient capacity: need ${missing} more slots` };
    }
    if (totalCapacity > checkedInCount * 1.5) {
      const excess = totalCapacity - checkedInCount;
      return { type: "warning", message: `Excess capacity: ${excess} unused slots` };
    }
    return { type: "success", message: `Capacity covers all ${checkedInCount} participants` };
  };

  const status = capacityStatus();

  const addGame = async () => {
    if (!newGame.name.trim()) {
      toast.error("Please enter a game name");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("games")
        .insert({
          tournament_id: tournamentId,
          name: newGame.name.trim(),
          available_tables: newGame.available_tables,
          players_per_table: newGame.players_per_table,
          min_players: newGame.min_players,
          order_index: games.length,
        });

      if (error) throw error;

      toast.success("Game added successfully");
      setNewGame({ name: "", available_tables: 1, players_per_table: 4, min_players: 3 });
      fetchGames();
      onGamesUpdated?.();
    } catch (error: any) {
      toast.error("Failed to add game: " + error.message);
    }
  };

  const updateGame = async (gameId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("games")
        .update(editValues)
        .eq("id", gameId);

      if (error) throw error;

      toast.success("Game updated");
      setEditingGame(null);
      setEditValues({});
      fetchGames();
      onGamesUpdated?.();
    } catch (error: any) {
      toast.error("Failed to update game: " + error.message);
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("games")
        .delete()
        .eq("id", gameId);

      if (error) throw error;

      toast.success("Game deleted");
      fetchGames();
      onGamesUpdated?.();
    } catch (error: any) {
      toast.error("Failed to delete game: " + error.message);
    }
  };

  const startEditing = (game: Game) => {
    setEditingGame(game.id);
    setEditValues({
      name: game.name,
      available_tables: game.available_tables,
      players_per_table: game.players_per_table,
      min_players: game.min_players,
    });
  };

  const cancelEditing = () => {
    setEditingGame(null);
    setEditValues({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Games</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Capacity Status Alert */}
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              {status.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="flex items-center justify-between">
                <span>{status.message}</span>
                <span className="font-medium">
                  {totalCapacity} / {checkedInCount} participants
                </span>
              </AlertDescription>
            </Alert>

            {/* Add new game form */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4">Add New Game</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <Label>Game Name</Label>
                    <Input
                      placeholder="e.g., Catan"
                      value={newGame.name}
                      onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tables Available</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={newGame.available_tables}
                      onChange={(e) =>
                        setNewGame({ ...newGame, available_tables: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Players per Table</Label>
                    <Input
                      type="number"
                      min="2"
                      max="10"
                      value={newGame.players_per_table}
                      onChange={(e) =>
                        setNewGame({ ...newGame, players_per_table: parseInt(e.target.value) || 4 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Min Players</Label>
                    <Input
                      type="number"
                      min="2"
                      max="10"
                      value={newGame.min_players}
                      onChange={(e) =>
                        setNewGame({ ...newGame, min_players: parseInt(e.target.value) || 3 })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Capacity: {newGame.available_tables * newGame.players_per_table} players
                  </p>
                  <Button onClick={addGame} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Game
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Games list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Configured Games ({games.length})</h3>
                <p className="text-sm text-muted-foreground">
                  Total Capacity: {totalCapacity} players
                </p>
              </div>

              {games.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No games configured yet. Add games above.
                </p>
              ) : (
                games.map((game) => (
                  <Card key={game.id}>
                    <CardContent className="py-4">
                      {editingGame === game.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                              <Label>Name</Label>
                              <Input
                                value={editValues.name || ""}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, name: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Tables</Label>
                              <Input
                                type="number"
                                min="1"
                                max="20"
                                value={editValues.available_tables || 1}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    available_tables: parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Per Table</Label>
                              <Input
                                type="number"
                                min="2"
                                max="10"
                                value={editValues.players_per_table || 4}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    players_per_table: parseInt(e.target.value) || 4,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Min</Label>
                              <Input
                                type="number"
                                min="2"
                                max="10"
                                value={editValues.min_players || 3}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    min_players: parseInt(e.target.value) || 3,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => updateGame(game.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{game.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {game.available_tables} table(s) × {game.players_per_table} players
                              {game.min_players < game.players_per_table &&
                                ` (min ${game.min_players})`}
                              {" = "}
                              {game.available_tables * game.players_per_table} max capacity
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(game)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteGame(game.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};