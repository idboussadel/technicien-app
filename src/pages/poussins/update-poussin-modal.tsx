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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";
import { Poussin } from "@/types";

interface UpdatePoussinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  poussin: Poussin | null;
}

// Validation schema
const updatePoussinSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
});

type UpdatePoussinForm = z.infer<typeof updatePoussinSchema>;

export default function UpdatePoussinModal({
  isOpen,
  onClose,
  onSuccess,
  poussin,
}: UpdatePoussinModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdatePoussinForm>({
    resolver: zodResolver(updatePoussinSchema),
    defaultValues: {
      nom: "",
    },
  });

  // Reset form when poussin changes
  useEffect(() => {
    if (poussin) {
      form.reset({
        nom: poussin.nom,
      });
    }
  }, [poussin, form]);

  const onSubmit = async (data: UpdatePoussinForm) => {
    if (!poussin) {
      toast.error("Aucun poussin sélectionné");
      return;
    }

    try {
      setIsSubmitting(true);
      await invoke("update_poussin", {
        id: poussin.id,
        poussin: {
          nom: data.nom,
        },
      });

      toast.success(`Le poussin "${data.nom}" a été modifié avec succès`);
      onSuccess();
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      const errorMessage =
        typeof error === "string" ? error : "Erreur lors de la modification du poussin";
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

  if (!poussin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le poussin</DialogTitle>
          <DialogDescription>Modifiez les informations du poussin sélectionné</DialogDescription>
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
                {isSubmitting ? "Modification..." : "Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
