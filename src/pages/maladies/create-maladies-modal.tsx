import { useState } from "react";
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
import { CreateMaladie } from "@/types";

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

interface CreateMaladiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaladieCreated: () => void;
}

export default function CreateMaladiesModal({
  open,
  onOpenChange,
  onMaladieCreated,
}: CreateMaladiesModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaladieForm>({
    resolver: zodResolver(maladieSchema),
    defaultValues: {
      nom: "",
    },
  });

  /**
   * Create a new maladie
   */
  const createMaladie = async (data: MaladieForm) => {
    try {
      setIsSubmitting(true);
      const createData: CreateMaladie = {
        nom: data.nom,
      };

      await invoke("create_maladie", { maladie: createData });

      toast.success(`La maladie "${data.nom}" a été créée avec succès`);

      form.reset();
      onOpenChange(false);
      onMaladieCreated();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de créer la maladie";
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
          <DialogTitle>Nouvelle Maladie</DialogTitle>
          <DialogDescription>Créer une nouvelle maladie dans le système.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(createMaladie)} className="space-y-4">
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
                {isSubmitting ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
