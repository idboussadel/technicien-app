import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Soin {
  id?: number;
  nom: string;
  unite_defaut: string;
}

interface UpdateSoinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSoinUpdated: () => void;
  soin: Soin | null;
}

// Form validation schema
const soinSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
  unite_defaut: z
    .string()
    .min(1, "L'unité est obligatoire")
    .max(20, "L'unité ne peut pas dépasser 20 caractères")
    .trim(),
});

type SoinForm = z.infer<typeof soinSchema>;

export default function UpdateSoinModal({
  open,
  onOpenChange,
  onSoinUpdated,
  soin,
}: UpdateSoinModalProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with validation
  const form = useForm<SoinForm>({
    resolver: zodResolver(soinSchema),
    defaultValues: {
      nom: soin?.nom || "",
      unite_defaut: soin?.unite_defaut || "",
    },
  });

  // Reset form when soin changes
  useEffect(() => {
    if (soin) {
      form.reset({
        nom: soin.nom,
        unite_defaut: soin.unite_defaut,
      });
    }
  }, [soin, form]);

  /**
   * Handles form submission for updating soin
   */
  const onSubmit = async (data: SoinForm) => {
    if (!soin) {
      toast.error("Aucun médicament à modifier");
      return;
    }

    try {
      setIsSubmitting(true);

      // Update existing soin
      await invoke("update_soin", {
        soin: {
          id: soin.id,
          ...data,
        },
      });

      toast.success(`${data.nom} a été modifié avec succès`);
      form.reset();
      onOpenChange(false);
      onSoinUpdated();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Une erreur est survenue";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles modal close and form reset
   */
  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le médicament</DialogTitle>
          <DialogDescription>Modifiez les informations du médicament ci-dessous.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrez le nom" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unite_defaut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité par défaut</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Entrez l'unité (ml, mg, etc.)"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "En cours..." : "Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
