import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { CopyTournamentDialog } from "./CopyTournamentDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const PAGE_SIZE = 10;

const fetchTournaments = async ({ pageParam = 0 }: { pageParam?: number }) => {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, participants(count)")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data || [], nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined };
};

export const TournamentList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [tournamentToCopy, setTournamentToCopy] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournaments,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const tournaments = data?.pages.flatMap((page) => page.data) ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete tournament");
    },
    onSettled: () => {
      setDeleteId(null);
    },
  });

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleCopy = (tournament: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournamentToCopy(tournament);
    setCopyDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">No tournaments yet</p>
          <p className="text-sm text-muted-foreground">Click "New Tournament" to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Card
          key={tournament.id}
          className="cursor-pointer hover:shadow-glow transition-smooth border-border/50"
          onClick={() => navigate(`/tournament/${tournament.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{tournament.name}</CardTitle>
                <CardDescription className="capitalize">
                  {tournament.type.replace("_", " ")} Tournament
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleCopy(tournament, e)}
                  title="Copy tournament"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => handleDeleteClick(tournament.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{tournament.participants?.[0]?.count || 0} participants</span>
              </div>
              <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
                {tournament.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      {hasNextPage && (
        <div className="col-span-full flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}

      <CopyTournamentDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        tournament={tournamentToCopy}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete tournament?"
        description="This action cannot be undone. The tournament and all its data will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
