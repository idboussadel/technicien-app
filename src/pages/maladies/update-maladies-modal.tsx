import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Maladie, UpdateMaladie } from "@/types";

// Form validation schema
const maladieSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom de la maladie est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(255, "Le nom ne peut pas dépasser 255 caractères")
    .trim(),
});

type MaladieForm = z.infer<typeof maladieSchema>;

interface UpdateMaladiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaladieUpdated: () => void;
  maladie: Maladie | null;
}

export default function UpdateMaladiesModal({
  open,
  onOpenChange,
  onMaladieUpdated,
  maladie,
}: UpdateMaladiesModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaladieForm>({
    resolver: zodResolver(maladieSchema),
    defaultValues: {
      nom: "",
    },
  });

  // Update form values when maladie changes
  useEffect(() => {
    if (maladie && open) {
      form.setValue("nom", maladie.nom);
    }
  }, [maladie, open, form]);

  /**
   * Update an existing maladie
   */
  const updateMaladie = async (data: MaladieForm) => {
    if (!maladie) return;

    try {
      setIsSubmitting(true);
      const updateData: UpdateMaladie = {
        id: maladie.id,
        nom: data.nom,
      };

      await invoke("update_maladie", { maladie: updateData });

      toast.success(`La maladie "${data.nom}" a été modifiée avec succès`);

      form.reset();
      onOpenChange(false);
      onMaladieUpdated();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de modifier la maladie";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la Maladie</DialogTitle>
          <DialogDescription>Modifier les informations de la maladie.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(updateMaladie)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la maladie</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Coccidiose, Newcastle..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Modification..." : "Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
