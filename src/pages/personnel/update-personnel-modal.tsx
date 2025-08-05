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

interface Personnel {
  id?: number;
  nom: string;
  telephone: string;
}

interface UpdatePersonnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelUpdated: () => void;
  personnel: Personnel | null;
}

// Form validation schema
const personnelSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
  telephone: z
    .string()
    .min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres")
    .max(15, "Le numéro de téléphone ne peut pas dépasser 15 chiffres")
    .regex(/^[\d\s\-\+\(\)]+$/, "Format de téléphone invalide"),
});

type PersonnelForm = z.infer<typeof personnelSchema>;

export default function UpdatePersonnelModal({
  open,
  onOpenChange,
  onPersonnelUpdated,
  personnel,
}: UpdatePersonnelModalProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with validation
  const form = useForm<PersonnelForm>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      nom: personnel?.nom || "",
      telephone: personnel?.telephone || "",
    },
  });

  // Reset form when personnel changes
  useEffect(() => {
    if (personnel) {
      form.reset({
        nom: personnel.nom,
        telephone: personnel.telephone,
      });
    }
  }, [personnel, form]);

  /**
   * Handles form submission for updating personnel
   */
  const onSubmit = async (data: PersonnelForm) => {
    if (!personnel) {
      toast.error("Aucun personnel à modifier");
      return;
    }

    try {
      setIsSubmitting(true);

      // Update existing personnel
      await invoke("update_personnel", {
        personnel: {
          id: personnel.id,
          ...data,
        },
      });

      toast.success(`${data.nom} a été modifié avec succès`);
      form.reset();
      onOpenChange(false);
      onPersonnelUpdated();
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
          <DialogTitle>Modifier le personnel</DialogTitle>
          <DialogDescription>Modifiez les informations du personnel ci-dessous.</DialogDescription>
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
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Entrez le numéro de téléphone"
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
