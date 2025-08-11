import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
import toast from "react-hot-toast";
import { invoke } from "@tauri-apps/api/core";
import { CreateAlimentationHistory } from "@/types";

// Form validation schema
const alimentationSchema = z.object({
  quantite: z.number().min(0.1, "La quantité doit être supérieure à 0"),
  created_at: z.date(),
});

type AlimentationForm = z.infer<typeof alimentationSchema>;

interface AlimentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bandeId: number;
  bandeNumber: number | null;
  onAlimentationAdded: () => void;
}

export default function CreateAlimentationModal({
  isOpen,
  onClose,
  bandeId,
  bandeNumber,
  onAlimentationAdded,
}: AlimentationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);

  // Form setup
  const form = useForm<AlimentationForm>({
    resolver: zodResolver(alimentationSchema),
    defaultValues: {
      quantite: 0,
      created_at: new Date(),
    },
  });

  /**
   * Add new alimentation record
   */
  const addAlimentation = async (data: AlimentationForm) => {
    try {
      setIsSubmitting(true);
      const createData: CreateAlimentationHistory = {
        bande_id: bandeId,
        quantite: data.quantite,
        created_at: data.created_at.toISOString(),
      };

      await invoke("create_alimentation_history", { alimentationData: createData });

      toast.success(`Alimentation de ${data.quantite} kg ajoutée avec succès`);

      form.reset({
        quantite: 0,
        created_at: new Date(),
      });

      onAlimentationAdded();
      onClose();
    } catch (error) {
      const errorMessage =
        typeof error === "string" ? error : "Impossible d'ajouter l'alimentation";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setOpenCalendar(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une alimentation</DialogTitle>
          <DialogDescription>
            Ajouter une nouvelle entrée d'alimentation pour la Bande #{bandeNumber}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(addAlimentation)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="quantite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantité (kg) <span className="text-red-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Quantité en kg"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value === 0 ? "" : field.value}
                        disabled={isSubmitting}
                        className="bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="created_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date d'ajout <span className="text-red-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                        <PopoverTrigger>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                            type="button"
                          >
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: fr })
                              : "Sélectionnez une date"}
                            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            locale={fr}
                            onSelect={(date) => {
                              field.onChange(date);
                              setOpenCalendar(false);
                            }}
                            disabled={(date) => date < new Date("1900-01-01") || date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
