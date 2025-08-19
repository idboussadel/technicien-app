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

interface CreatePersonnel {
  nom: string;
  telephone?: string;
}

interface CreatePersonnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelCreated: () => void;
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
    .min(0)
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 10,
      "Le numéro de téléphone doit contenir exactement 10 chiffres"
    ),
});

const CreatePersonnelModal = ({
  open,
  onOpenChange,
  onPersonnelCreated,
}: CreatePersonnelModalProps): JSX.Element => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with validation - use the output type of the schema
  const form = useForm<{ nom: string; telephone: string }>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      nom: "",
      telephone: "",
    },
  });

  /**
   * Handles form submission for creating personnel
   */
  const onSubmit = async (data: { nom: string; telephone: string }) => {
    try {
      setIsSubmitting(true);

      // Create new personnel
      const createData: CreatePersonnel = {
        nom: data.nom,
        telephone: data.telephone || "",
      };

      await invoke("create_personnel", { personnel: createData });
      toast.success(`${data.nom} a été ajouté avec succès`);

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
          <DialogTitle>Ajouter du personnel</DialogTitle>
          <DialogDescription>
            Remplissez les informations du nouveau personnel ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nom <span className="text-red-600">*</span>
                  </FormLabel>
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
                {isSubmitting ? "En cours..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePersonnelModal;
