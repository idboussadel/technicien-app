import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Personnel, CreateBande, CreateBatiment } from "@/types";

interface CreateBandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fermeId: number;
  fermeName: string;
  personnel?: Personnel[];
  availableBatiments?: string[];
  onBandeCreated: () => void;
}

const batimentSchema = z.object({
  numero_batiment: z.string().min(1, "Le numéro de bâtiment est obligatoire"),
  type_poussin: z.string().min(1, "Le type de poussin est obligatoire"),
  personnel_id: z.string().min(1, "Le personnel responsable est obligatoire"),
  quantite: z
    .number()
    .int("La quantité doit être un entier")
    .min(1, "La quantité doit être d'au moins 1"),
});

const createBandeSchema = z.object({
  date_entree: z.string().min(1, "La date d'entrée est obligatoire"),
  batiments: z
    .array(batimentSchema)
    .min(1, "Au moins un bâtiment doit être ajouté")
    .refine((batiments) => {
      const numeros = batiments.map((b) => b.numero_batiment);
      return new Set(numeros).size === numeros.length;
    }, "Chaque bâtiment doit avoir un numéro unique"),
});

type CreateBandeForm = z.infer<typeof createBandeSchema>;

export default function CreateBandeModal({
  isOpen,
  onClose,
  fermeId,
  fermeName,
  personnel = [],
  availableBatiments = [],
  onBandeCreated,
}: CreateBandeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openPersonnelIndex, setOpenPersonnelIndex] = useState<number | null>(null);

  // Form setup with validation
  const form = useForm<CreateBandeForm>({
    resolver: zodResolver(createBandeSchema),
    defaultValues: {
      date_entree: "",
      batiments: [
        {
          numero_batiment: "",
          type_poussin: "",
          personnel_id: "",
          quantite: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "batiments",
  });

  // Watch the batiments array for changes to update available options
  const watchedBatiments = useWatch({
    control: form.control,
    name: "batiments",
  });

  /**
   * Crée une nouvelle bande avec ses bâtiments
   */
  const createBande = async (data: CreateBandeForm) => {
    try {
      setIsSubmitting(true);

      // First create the bande
      const createBandeData: CreateBande = {
        date_entree: data.date_entree,
        ferme_id: fermeId,
        notes: null, // Notes will be added later via update
      };

      const bande = await invoke<{ id: number }>("create_bande", { bande: createBandeData });

      // Then create each batiment
      for (const batimentData of data.batiments) {
        const createBatimentData: CreateBatiment = {
          bande_id: bande.id,
          numero_batiment: batimentData.numero_batiment,
          type_poussin: batimentData.type_poussin,
          personnel_id: parseInt(batimentData.personnel_id),
          quantite: batimentData.quantite,
        };

        await invoke("create_batiment", { batiment: createBatimentData });
      }

      toast.success("Bande créée avec succès");
      form.reset();
      onClose();
      onBandeCreated();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de créer la bande";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBatiment = () => {
    append({
      numero_batiment: "",
      type_poussin: "",
      personnel_id: "",
      quantite: 0,
    });
  };

  const removeBatiment = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleClose = () => {
    form.reset();
    setOpenPersonnelIndex(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle bande</DialogTitle>
          <DialogDescription>
            Ajoutez une nouvelle bande avec ses bâtiments à la ferme {fermeName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(createBande)} className="space-y-6">
            {/* Bande Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="date_entree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date d'entrée <span className="text-red-600">*</span>
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
                                ? format(new Date(field.value), "dd/MM/yyyy", { locale: fr })
                                : "Sélectionnez une date"}
                              <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              captionLayout="dropdown"
                              locale={fr}
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                setOpenCalendar(false);
                              }}
                              disabled={(date) =>
                                date < new Date("1900-01-01") || date > new Date()
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Batiments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Bâtiments</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBatiment}
                  disabled={isSubmitting || fields.length >= availableBatiments.length}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un bâtiment
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50/60">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Bâtiment {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBatiment(index)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`batiments.${index}.numero_batiment`}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            Numéro de bâtiment <span className="text-red-600">*</span>
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full bg-white",
                                  fieldState.error &&
                                    "border-destructive focus-visible:ring-destructive/20"
                                )}
                                aria-invalid={!!fieldState.error}
                              >
                                <SelectValue placeholder="Sélectionnez un bâtiment" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableBatiments
                                  .filter((batiment) => {
                                    // Show available batiments plus the currently selected one
                                    const selectedBatiments =
                                      watchedBatiments
                                        ?.map((b) => b.numero_batiment)
                                        .filter((_, i) => i !== index)
                                        .filter(Boolean) || []; // Filter out empty values
                                    return !selectedBatiments.includes(batiment);
                                  })
                                  .map((batiment) => (
                                    <SelectItem key={batiment} value={batiment}>
                                      Bâtiment {batiment}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`batiments.${index}.type_poussin`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Type de poussin <span className="text-red-600">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Poulet de chair"
                              {...field}
                              className="bg-white"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`batiments.${index}.quantite`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Quantité <span className="text-red-600">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Nombre d'animaux"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value === 0 ? "" : field.value}
                              disabled={isSubmitting}
                              className="bg-white"
                              min="1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`batiments.${index}.personnel_id`}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            Personnel responsable <span className="text-red-600">*</span>
                          </FormLabel>
                          <FormControl>
                            <Popover
                              open={openPersonnelIndex === index}
                              onOpenChange={(open) => setOpenPersonnelIndex(open ? index : null)}
                            >
                              <PopoverTrigger>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPersonnelIndex === index}
                                  aria-invalid={!!fieldState.error}
                                  className={cn(
                                    "w-full bg-white justify-between font-normal",
                                    !field.value && "text-muted-foreground",
                                    fieldState.error &&
                                      "border-destructive focus-visible:ring-destructive/20"
                                  )}
                                  disabled={isSubmitting}
                                  type="button"
                                >
                                  {field.value
                                    ? personnel.find(
                                        (person) => person.id.toString() === field.value
                                      )?.nom
                                    : "Sélectionnez un responsable..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Rechercher un responsable..." />
                                  <CommandList>
                                    <CommandEmpty>Aucun responsable trouvé.</CommandEmpty>
                                    <CommandGroup>
                                      {personnel && personnel.length > 0 ? (
                                        personnel.map((person) => (
                                          <CommandItem
                                            key={person.id}
                                            value={person.nom}
                                            onSelect={() => {
                                              field.onChange(person.id.toString());
                                              setOpenPersonnelIndex(null);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === person.id.toString()
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {person.nom}
                                          </CommandItem>
                                        ))
                                      ) : (
                                        <CommandItem disabled>
                                          Aucun personnel disponible
                                        </CommandItem>
                                      )}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Création..." : "Créer la bande"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
