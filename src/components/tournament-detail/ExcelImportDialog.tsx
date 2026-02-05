import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
}

interface ParsedParticipant {
  name: string;
  phone?: string;
}

export const ExcelImportDialog = ({
  open,
  onOpenChange,
  tournamentId,
}: ExcelImportDialogProps) => {
  const [parsedData, setParsedData] = useState<ParsedParticipant[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Try to find name and phone columns
        const headers = json[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
        let nameColIndex = headers.findIndex((h) =>
          ["name", "nombre", "participant", "participante", "player", "jugador"].includes(h)
        );
        let phoneColIndex = headers.findIndex((h) =>
          ["phone", "telefono", "teléfono", "tel", "mobile", "movil", "móvil"].includes(h)
        );

        // If no header found, assume first column is name
        if (nameColIndex === -1) {
          nameColIndex = 0;
        }

        const participants: ParsedParticipant[] = [];
        const startRow = headers.length > 0 ? 1 : 0;

        for (let i = startRow; i < json.length; i++) {
          const row = json[i];
          const name = row[nameColIndex]?.toString().trim();
          if (name && name.length >= 2) {
            participants.push({
              name,
              phone: phoneColIndex !== -1 ? row[phoneColIndex]?.toString().trim() : undefined,
            });
          }
        }

        if (participants.length === 0) {
          toast.error("No valid participants found in the file");
          return;
        }

        setParsedData(participants);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("participants").insert(
        parsedData.map((p) => ({
          tournament_id: tournamentId,
          name: p.name,
          phone: p.phone || null,
          checked_in: false,
        }))
      );

      if (error) throw error;

      toast.success(`Imported ${parsedData.length} participants`);
      onOpenChange(false);
      setParsedData([]);
      setFileName("");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import participants");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setParsedData([]);
    setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Participants from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {fileName || "Choose file..."}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts .xlsx, .xls, or .csv files. Include columns: Name (required), Phone (optional)
            </p>
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                <span>Found {parsedData.length} participants</span>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {parsedData.map((p, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    {p.phone && <span className="text-muted-foreground">{p.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedData.length === 0 || loading}>
            {loading ? "Importing..." : `Import ${parsedData.length} Participants`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
