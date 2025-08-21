import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Personnel, CreateBatiment, Poussin, BandeWithDetails, Ferme } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CreateBatimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bande: BandeWithDetails;
  ferme: Ferme;
  personnel?: Personnel[];
  poussins?: Poussin[];
  availableBatiments?: string[];
  onBatimentCreated: () => void;
}

const createBatimentSchema = z.object({
  numero_batiment: z.string().min(1, "Le numéro de bâtiment est obligatoire"),
  poussin_id: z.string().min(1, "Le poussin est obligatoire"),
  personnel_id: z.string().min(1, "Le personnel responsable est obligatoire"),
  quantite: z
    .number()
    .int("La quantité doit être un entier")
    .min(1, "La quantité doit être d'au moins 1"),
});

type CreateBatimentForm = z.infer<typeof createBatimentSchema>;

export default function CreateBatimentModal({
  isOpen,
  onClose,
  bande,
  ferme,
  personnel = [],
  poussins = [],
  availableBatiments = [],
  onBatimentCreated,
}: CreateBatimentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPersonnel, setOpenPersonnel] = useState(false);
  const [openPoussin, setOpenPoussin] = useState(false);

  // Form setup with validation
  const form = useForm<CreateBatimentForm>({
    resolver: zodResolver(createBatimentSchema),
    defaultValues: {
      numero_batiment: "",
      poussin_id: "",
      personnel_id: "",
      quantite: 0,
    },
  });

  // Get available batiment numbers based on ferme's nbr_meuble
  // Buildings can be reused across different bandes, but not within the same bande
  const getAvailableBatimentNumbers = () => {
    // Use the ferme's nbr_meuble to determine how many buildings are available
    const maxBuildings = ferme.nbr_meuble;
    const allNumbers = Array.from({ length: maxBuildings }, (_, i) => (i + 1).toString());

    // Filter out buildings that are already used in this bande
    const usedNumbers = bande.batiments.map((b) => b.numero_batiment);
    const availableNumbers = allNumbers.filter((num) => !usedNumbers.includes(num));

    return availableNumbers;
  };

  const availableNumbers = getAvailableBatimentNumbers();

  /**
   * Crée un nouveau bâtiment
   */
  const createBatiment = async (data: CreateBatimentForm) => {
    try {
      setIsSubmitting(true);

      const createBatimentData: CreateBatiment = {
        bande_id: bande.id!,
        numero_batiment: data.numero_batiment,
        poussin_id: parseInt(data.poussin_id),
        personnel_id: parseInt(data.personnel_id),
        quantite: data.quantite,
      };

      await invoke("create_batiment", { batiment: createBatimentData });

      toast.success("Bâtiment créé avec succès");
      form.reset();
      onClose();
      onBatimentCreated();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de créer le bâtiment";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setOpenPersonnel(false);
    setOpenPoussin(false);
    onClose();
  };

  // If no available batiment numbers, show message
  if (availableNumbers.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Impossible de créer un bâtiment</DialogTitle>
            <DialogDescription>
              Tous les bâtiments disponibles ont déjà été créés pour cette bande.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau bâtiment</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau bâtiment à la bande {bande.numero_bande}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(createBatiment)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_batiment"
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
                          {availableNumbers.map((numero) => (
                            <SelectItem key={numero} value={numero}>
                              Bâtiment {numero}
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
                name="quantite"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="poussin_id"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Poussin <span className="text-red-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Popover open={openPoussin} onOpenChange={setOpenPoussin}>
                        <PopoverTrigger>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPoussin}
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
                              ? poussins.find((poussin) => poussin.id?.toString() === field.value)
                                  ?.nom
                              : "Sélectionnez un poussin..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Rechercher un poussin..." />
                            <CommandList>
                              <CommandEmpty>Aucun poussin trouvé.</CommandEmpty>
                              <CommandGroup>
                                {poussins && poussins.length > 0 ? (
                                  poussins.map((poussin) => (
                                    <CommandItem
                                      key={poussin.id}
                                      value={poussin.nom}
                                      onSelect={() => {
                                        field.onChange(poussin.id?.toString());
                                        setOpenPoussin(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === poussin.id?.toString()
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {poussin.nom}
                                    </CommandItem>
                                  ))
                                ) : (
                                  <CommandItem disabled>Aucun poussin disponible</CommandItem>
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

              <FormField
                control={form.control}
                name="personnel_id"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Personnel responsable <span className="text-red-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Popover open={openPersonnel} onOpenChange={setOpenPersonnel}>
                        <PopoverTrigger>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPersonnel}
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
                              ? personnel.find((person) => person.id.toString() === field.value)
                                  ?.nom
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
                                        setOpenPersonnel(false);
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
                                  <CommandItem disabled>Aucun personnel disponible</CommandItem>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Création..." : "Créer le bâtiment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
