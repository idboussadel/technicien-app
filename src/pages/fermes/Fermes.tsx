import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Ferme {
  id: number;
  nom: string;
}

interface CreateFerme {
  nom: string;
}

interface FermesPageProps {
  selectedFerme: Ferme | null;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  onFermesUpdate: () => Promise<void>;
  onFermeSelect: (ferme: Ferme) => void;
  onBackToFermes: () => void;
}

// Form validation schema
const createFermeSchema = z.object({
  nom: z.string()
    .min(1, "Le nom de la ferme est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim()
});

type CreateFermeForm = z.infer<typeof createFermeSchema>;

export default function Fermes({
  selectedFerme,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  onFermesUpdate,
  onFermeSelect,
  onBackToFermes
}: FermesPageProps) {
  const [fermes, setFermes] = useState<Ferme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Form setup with validation
  const form = useForm<CreateFermeForm>({
    resolver: zodResolver(createFermeSchema),
    defaultValues: {
      nom: "",
    },
  });

  /**
   * Charge toutes les fermes depuis le backend
   */
  const loadFermes = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<Ferme[]>('get_all_fermes');
      setFermes(result);
    } catch (error) {
      toast.error("Impossible de charger les fermes");
      console.error("Impossible de charger les fermes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Crée une nouvelle ferme
   */
  const createFerme = async (data: CreateFermeForm) => {
    try {
      setIsFormSubmitting(true);
      const createData: CreateFerme = {
        nom: data.nom,
      };
      
      await invoke('create_ferme', { ferme: createData });
      
      toast.success(`La ferme "${data.nom}" a été créée avec succès`);
      
      form.reset();
      setIsCreateDialogOpen(false);
      await onFermesUpdate();
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Impossible de créer la ferme';
      toast.error(errorMessage);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  /**
   * Gère la modification d'une ferme
   */
  const handleModifier = (ferme: Ferme) => {
    toast(`Modification de la ferme "${ferme.nom}" - À implémenter`);
  };

  /**
   * Gère la suppression d'une ferme
   */
  const handleSupprimer = async (ferme: Ferme) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la ferme "${ferme.nom}" ?`)) {
      try {
        await invoke('delete_ferme', { id: ferme.id });
        toast.success(`La ferme "${ferme.nom}" a été supprimée`);
        await onFermesUpdate();
      } catch (error) {
        const errorMessage = typeof error === 'string' ? error : 'Impossible de supprimer la ferme';
        toast.error(errorMessage);
      }
    }
  };

  // Charger les fermes au montage du composant
  useEffect(() => {
    loadFermes();
  }, []);

  // If a farm is selected, show the farm details
  if (selectedFerme) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-6 py-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Bandes de la ferme {selectedFerme.nom}</h2>
              <Button variant="outline" onClick={onBackToFermes}>
                Retour aux fermes
              </Button>
            </div>
            <p className="text-muted-foreground">
              La gestion des bandes sera implémentée prochainement.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  // Main view - farms list
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-6 py-6">
        <div className="space-y-6">
          {/* Create Farm Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle ferme</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle ferme à votre exploitation.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(createFerme)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la ferme</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Ferme de la Vallée"
                            {...field}
                            disabled={isFormSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isFormSubmitting}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isFormSubmitting}>
                      {isFormSubmitting ? "Création..." : "Créer"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Farms List */}
          <main className="px-6 py-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fermes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucune ferme</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Vous n'avez pas encore créé de ferme. Commencez par en ajouter une pour gérer vos bandes d'animaux.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-foreground hover:bg-foreground/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première ferme
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Farm Cards */}
                {fermes.map((ferme) => (
                  <div key={ferme.id} className="group cursor-pointer">
                    <div 
                      className="bg-card border border-border rounded-xl p-6 hover:bg-accent transition-all duration-200 aspect-[4/3] flex flex-col justify-between relative"
                      onClick={() => onFermeSelect(ferme)}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModifier(ferme);
                            }} 
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSupprimer(ferme);
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="flex-1 flex items-center justify-center">
                        <h3 className="text-card-foreground text-2xl capitalize font-bold text-center">{ferme.nom}</h3>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add New Farm Card */}
                <div className="group cursor-pointer">
                  <div 
                    className="border-2 border-dashed border-border rounded-xl p-6 hover:border-muted-foreground hover:bg-muted/50 transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="w-8 h-8 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                    <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                      Nouvelle ferme
                    </span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </main>
    </div>
  );
}
