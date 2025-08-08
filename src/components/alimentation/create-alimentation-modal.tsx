import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";

interface CreateAlimentationModalProps {
  bandeId: number;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

interface CreateAlimentationHistory {
  bande_id: number;
  quantite: number;
}

interface AlimentationHistory {
  id?: number;
  bande_id: number;
  quantite: number;
  created_at: string;
}

export function CreateAlimentationModal({
  bandeId,
  onSuccess,
  triggerButton,
}: CreateAlimentationModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantite, setQuantite] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantite || isNaN(Number(quantite))) {
      toast.error("Veuillez entrer une quantité valide");
      return;
    }

    setLoading(true);

    try {
      const alimentationData: CreateAlimentationHistory = {
        bande_id: bandeId,
        quantite: Number(quantite),
      };

      await invoke<AlimentationHistory>("create_alimentation_history", {
        alimentationData,
      });

      toast.success("Alimentation ajoutée avec succès");
      setOpen(false);
      setQuantite("");
      onSuccess?.();
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'alimentation:", error);
      toast.error("Erreur lors de l'ajout de l'alimentation");
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Ajouter alimentation
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une alimentation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quantite">Quantité (kg)</Label>
            <Input
              id="quantite"
              type="number"
              step="0.1"
              min="0"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="Ex: 50.5"
              required
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Cette quantité sera ajoutée au contour total de la bande
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
