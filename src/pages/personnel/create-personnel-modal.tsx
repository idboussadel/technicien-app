import { useState } from "react";
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

interface CreatePersonnel {
  nom: string;
  telephone: string;
}

interface CreatePersonnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelCreated: () => void;
  editingPersonnel?: Personnel | null;
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

export default function CreatePersonnelModal({
  open,
  onOpenChange,
  onPersonnelCreated,
  editingPersonnel = null,
}: CreatePersonnelModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with validation
  const form = useForm<PersonnelForm>({
    resolver: zodResolver(personnelSchema),
    defaultValues: editingPersonnel
      ? {
          nom: editingPersonnel.nom,
          telephone: editingPersonnel.telephone,
        }
      : {
          nom: "",
          telephone: "",
        },
  });

  /**
   * Handles form submission for creating or updating personnel
   */
  const onSubmit = async (data: PersonnelForm) => {
    try {
      setIsSubmitting(true);

      if (editingPersonnel) {
        // Update existing personnel
        await invoke("update_personnel", {
          personnel: {
            id: editingPersonnel.id,
            ...data,
          },
        });
        console.log("DEBUG - Update successful");
        toast.success(`${data.nom} a été modifié avec succès`);
      } else {
        // Create new personnel
        const createData: CreatePersonnel = {
          nom: data.nom,
          telephone: data.telephone,
        };

        await invoke("create_personnel", { personnel: createData });
        toast.success(`${data.nom} a été ajouté avec succès`);
      }

      form.reset();
      onOpenChange(false);
      onPersonnelCreated();
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
          <DialogTitle>
            {editingPersonnel ? "Modifier le personnel" : "Ajouter du personnel"}
          </DialogTitle>
          <DialogDescription>
            {editingPersonnel
              ? "Modifiez les informations du personnel ci-dessous."
              : "Remplissez les informations du nouveau personnel ci-dessous."}
          </DialogDescription>
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
                {isSubmitting ? "En cours..." : editingPersonnel ? "Modifier" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
