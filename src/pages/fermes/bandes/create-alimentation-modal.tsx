import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { invoke } from "@tauri-apps/api/core";
import { CreateAlimentationHistory, AlimentationHistory } from "@/types";

// Form validation schema
const alimentationSchema = z.object({
  quantite: z
    .number()
    .min(0.1, "La quantité doit être supérieure à 0")
    .max(10000, "La quantité ne peut pas dépasser 10000 kg"),
  date_alimentation: z.string().min(1, "La date est obligatoire"),
  notes: z.string().optional(),
});

type AlimentationForm = z.infer<typeof alimentationSchema>;

interface AlimentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bandeId: number;
  bandeNumber: number | null;
  onAlimentationAdded: () => void;
}

export default function AlimentationModal({
  isOpen,
  onClose,
  bandeId,
  bandeNumber,
  onAlimentationAdded,
}: AlimentationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentHistory, setRecentHistory] = useState<AlimentationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form setup
  const form = useForm<AlimentationForm>({
    resolver: zodResolver(alimentationSchema),
    defaultValues: {
      quantite: 0,
      date_alimentation: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  /**
   * Load recent alimentation history (last 5 entries)
   */
  const loadRecentHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const result = await invoke<AlimentationHistory[]>("get_recent_alimentation_history", {
        bandeId: bandeId,
        limit: 5,
      });
      setRecentHistory(result);
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique récent:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Add new alimentation record
   */
  const addAlimentation = async (data: AlimentationForm) => {
    try {
      setIsSubmitting(true);
      const createData: CreateAlimentationHistory = {
        bande_id: bandeId,
        quantite: data.quantite,
        date_alimentation: data.date_alimentation,
        notes: data.notes || null,
      };

      await invoke("create_alimentation_history", { alimentation: createData });

      toast.success(`Alimentation de ${data.quantite} kg ajoutée avec succès`);

      form.reset({
        quantite: 0,
        date_alimentation: new Date().toISOString().split("T")[0],
        notes: "",
      });

      onAlimentationAdded();
      await loadRecentHistory(); // Refresh the recent history
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : "Impossible d'ajouter l'alimentation";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load recent history when modal opens
  const handleModalOpen = (open: boolean) => {
    if (open && bandeId) {
      loadRecentHistory();
    }
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une alimentation</DialogTitle>
          <DialogDescription>
            Ajouter une nouvelle entrée d'alimentation pour la Bande #{bandeNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(addAlimentation)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="quantite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité (kg) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Ex: 50.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value === 0 ? "" : field.value}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_alimentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'alimentation *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ajouter des notes..."
                          {...field}
                          disabled={isSubmitting}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onClose()}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Recent History Section */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              Historique récent
            </h4>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucun historique récent
                </div>
              ) : (
                recentHistory.map((entry, index) => (
                  <Card key={entry.id || index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{entry.quantite} kg</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date_alimentation).toLocaleDateString("fr-FR")}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
