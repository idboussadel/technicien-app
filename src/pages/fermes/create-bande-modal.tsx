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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Personnel {
  id: number;
  nom: string;
  telephone: string | null;
}

interface CreateBande {
  date_entree: string;
  quantite: number;
  ferme_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  notes: string | null;
}

interface CreateBandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fermeId: number;
  fermeName: string;
  personnel?: Personnel[];
  availableBatiments?: string[];
  onBandeCreated: () => void;
}

const createBandeSchema = z.object({
  date_entree: z.string().min(1, "La date d'entrée est obligatoire"),
  quantite: z
    .number()
    .int("La quantité doit être un entier")
    .min(1, "La quantité doit être d'au moins 1"),
  numero_batiment: z.string().min(1, "Le numéro de bâtiment est obligatoire"),
  type_poussin: z.string().min(1, "Le type de poussin est obligatoire"),
  personnel_id: z.string().min(1, "Le personnel responsable est obligatoire"),
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
  const [openPersonnel, setOpenPersonnel] = useState(false);

  // Form setup with validation
  const form = useForm<CreateBandeForm>({
    resolver: zodResolver(createBandeSchema),
    defaultValues: {
      date_entree: "",
      quantite: 0,
      numero_batiment: "",
      type_poussin: "",
      personnel_id: "",
    },
  });

  /**
   * Crée une nouvelle bande
   */
  const createBande = async (data: CreateBandeForm) => {
    try {
      setIsSubmitting(true);
      const createData: CreateBande = {
        date_entree: data.date_entree,
        quantite: data.quantite,
        ferme_id: fermeId,
        numero_batiment: data.numero_batiment,
        type_poussin: data.type_poussin,
        personnel_id: parseInt(data.personnel_id),
        notes: null, // Notes will be added later via edit functionality
      };

      await invoke("create_bande", { bande: createData });
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

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle bande</DialogTitle>
          <DialogDescription>Ajoutez une nouvelle bande à la ferme {fermeName}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(createBande)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_entree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'entrée</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(new Date(field.value), "dd/MM/yyyy")
                              : "Sélectionnez une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                            }}
                            disabled={(date) => date < new Date("1900-01-01") || date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                    <FormLabel>Quantité</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Nombre d'animaux"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value === 0 ? "" : field.value}
                        disabled={isSubmitting}
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
                name="numero_batiment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bâtiment</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez un bâtiment" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(availableBatiments) &&
                            availableBatiments.map((batiment) => (
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
                name="type_poussin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de poussin</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Poulet de chair" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="personnel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personnel responsable</FormLabel>
                  <FormControl>
                    <Popover open={openPersonnel} onOpenChange={setOpenPersonnel}>
                      <PopoverTrigger>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPersonnel}
                          className="w-full justify-between"
                          disabled={isSubmitting}
                          type="button"
                        >
                          {field.value
                            ? personnel.find((person) => person.id.toString() === field.value)?.nom
                            : "Sélectionnez un responsable..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
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
                                <CommandItem disabled>
                                  {personnel
                                    ? "Aucun personnel disponible"
                                    : "Chargement du personnel..."}
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
