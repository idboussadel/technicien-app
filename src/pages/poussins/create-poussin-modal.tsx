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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";

interface CreatePoussinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Validation schema
const createPoussinSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
});

type CreatePoussinForm = z.infer<typeof createPoussinSchema>;

export default function CreatePoussinModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePoussinModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePoussinForm>({
    resolver: zodResolver(createPoussinSchema),
    defaultValues: {
      nom: "",
    },
  });

  const onSubmit = async (data: CreatePoussinForm) => {
    try {
      setIsSubmitting(true);
      await invoke("create_poussin", {
        poussin: {
          nom: data.nom,
        },
      });

      toast.success(`Le poussin "${data.nom}" a été créé avec succès`);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      const errorMessage =
        typeof error === "string" ? error : "Erreur lors de la création du poussin";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau poussin</DialogTitle>
          <DialogDescription>Ajoutez un nouveau poussin à votre liste</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nom du poussin <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Poussin Blanc"
                      autoComplete="off"
                      {...field}
                      disabled={isSubmitting}
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
                {isSubmitting ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
