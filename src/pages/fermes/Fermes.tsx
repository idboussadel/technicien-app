import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, MoreHorizontal, Edit, Trash2, Calendar, Users, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CreateBandeModal from "./bandes/create-bande-modal";

interface Ferme {
  id: number;
  nom: string;
  nbr_meuble: number;
}

interface BandeWithDetails {
  id: number | null;
  date_entree: string;
  quantite: number;
  ferme_id: number;
  ferme_nom: string;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  personnel_nom: string;
  notes: string | null;
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

interface Personnel {
  id: number;
  nom: string;
  telephone: string | null;
}

interface CreateFerme {
  nom: string;
  nbr_meuble: number;
}

interface UpdateFerme {
  id: number;
  nom: string;
  nbr_meuble: number;
}

interface FermesPageProps {
  selectedFerme: Ferme | null;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  onFermeSelect: (ferme: Ferme) => void;
  onBackToFermes: () => void;
}

// Form validation schema
const createFermeSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom de la ferme est obligatoire")
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
  nbr_meuble: z
    .number()
    .int("Le nombre de meubles doit être un entier")
    .min(0, "Le nombre de meubles ne peut pas être négatif"),
});

type CreateFermeForm = z.infer<typeof createFermeSchema>;

export default function Fermes({
  selectedFerme,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  onFermeSelect,
  onBackToFermes,
}: FermesPageProps) {
  const [fermes, setFermes] = useState<Ferme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFerme, setEditingFerme] = useState<Ferme | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingFerme, setDeletingFerme] = useState<Ferme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bande management state
  const [bandes, setBandes] = useState<BandeWithDetails[]>([]);
  const [isBandesLoading, setIsBandesLoading] = useState(false);
  const [isCreateBandeDialogOpen, setIsCreateBandeDialogOpen] = useState(false);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [availableBatiments, setAvailableBatiments] = useState<string[]>([]);

  // Form setup with validation
  const form = useForm<CreateFermeForm>({
    resolver: zodResolver(createFermeSchema),
    defaultValues: {
      nom: "",
      nbr_meuble: 0,
    },
  });

  // Edit form setup with validation
  const editForm = useForm<CreateFermeForm>({
    resolver: zodResolver(createFermeSchema),
    defaultValues: {
      nom: "",
      nbr_meuble: 0,
    },
  });

  /**
   * Charge toutes les fermes depuis le backend
   */
  const loadFermes = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<Ferme[]>("get_all_fermes");
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
        nbr_meuble: data.nbr_meuble,
      };

      await invoke("create_ferme", { ferme: createData });

      toast.success(`La ferme "${data.nom}" a été créée avec succès`);

      form.reset();
      setIsCreateDialogOpen(false);
      // Reload the farms list locally instead of calling onFermesUpdate
      await loadFermes();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de créer la ferme";
      toast.error(errorMessage);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  /**
   * Gère la modification d'une ferme
   */
  const handleModifier = (ferme: Ferme) => {
    setEditingFerme(ferme);
    editForm.setValue("nom", ferme.nom);
    editForm.setValue("nbr_meuble", ferme.nbr_meuble);
    setIsEditDialogOpen(true);
  };

  /**
   * Met à jour une ferme existante
   */
  const updateFerme = async (data: CreateFermeForm) => {
    if (!editingFerme) return;

    try {
      setIsEditSubmitting(true);
      const updateData: UpdateFerme = {
        id: editingFerme.id,
        nom: data.nom,
        nbr_meuble: data.nbr_meuble,
      };

      await invoke("update_ferme", { ferme: updateData });

      toast.success(`La ferme "${data.nom}" a été modifiée avec succès`);

      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingFerme(null);
      await loadFermes();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de modifier la ferme";
      toast.error(errorMessage);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  /**
   * Gère la suppression d'une ferme
   */
  const handleSupprimer = (ferme: Ferme) => {
    setDeletingFerme(ferme);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Confirme et exécute la suppression d'une ferme
   */
  const confirmDelete = async () => {
    if (!deletingFerme) return;

    try {
      setIsDeleting(true);
      await invoke("delete_ferme", { id: deletingFerme.id });
      toast.success(`La ferme "${deletingFerme.nom}" a été supprimée`);

      setIsDeleteDialogOpen(false);
      setDeletingFerme(null);
      await loadFermes();
    } catch (error) {
      const errorMessage = typeof error === "string" ? error : "Impossible de supprimer la ferme";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Charge les bandes d'une ferme spécifique
   */
  const loadBandes = async (fermeId: number) => {
    try {
      setIsBandesLoading(true);
      const result = await invoke<BandeWithDetails[]>("get_bandes_by_ferme", { fermeId });
      setBandes(result);
    } catch (error) {
      toast.error("Impossible de charger les bandes");
      console.error("Impossible de charger les bandes:", error);
    } finally {
      setIsBandesLoading(false);
    }
  };

  /**
   * Charge la liste du personnel
   */
  const loadPersonnel = async () => {
    try {
      const result = await invoke<Personnel[]>("get_personnel_list");
      setPersonnel(result);
    } catch (error) {
      toast.error("Impossible de charger le personnel");
      console.error("Impossible de charger le personnel:", error);
    }
  };

  /**
   * Charge les bâtiments disponibles pour une ferme
   */
  const loadAvailableBatiments = async (fermeId: number) => {
    try {
      const result = await invoke<string[]>("get_available_batiments", { fermeId });
      setAvailableBatiments(result);
    } catch (error) {
      toast.error("Impossible de charger les bâtiments disponibles");
      console.error("Impossible de charger les bâtiments disponibles:", error);
    }
  };

  /**
   * Callback when a bande is created successfully
   */
  const handleBandeCreated = async () => {
    if (selectedFerme) {
      await loadBandes(selectedFerme.id);
      await loadAvailableBatiments(selectedFerme.id);
    }
  };

  // Load data when a farm is selected
  useEffect(() => {
    if (selectedFerme) {
      loadBandes(selectedFerme.id);
      loadPersonnel();
      loadAvailableBatiments(selectedFerme.id);
    }
  }, [selectedFerme]);

  // Load farms on component mount
  useEffect(() => {
    loadFermes();
  }, []);

  // If a farm is selected, show the farm details with bandes
  if (selectedFerme) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-6 py-6">
          <div className="space-y-6">
            {/* Header */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold">{selectedFerme.nom}</h2>
                  <p className="text-muted-foreground">
                    {selectedFerme.nbr_meuble} meuble{selectedFerme.nbr_meuble !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsCreateBandeDialogOpen(true)}
                    disabled={availableBatiments.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle bande
                  </Button>
                  <Button variant="outline" onClick={onBackToFermes}>
                    Retour aux fermes
                  </Button>
                </div>
              </div>

              {availableBatiments.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    Tous les bâtiments de cette ferme sont occupés. Vous ne pouvez pas créer de
                    nouvelles bandes.
                  </p>
                </div>
              )}
            </Card>

            {/* Bandes List */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Bandes</h3>

              {isBandesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : bandes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Aucune bande</h4>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    Cette ferme n'a pas encore de bandes. Créez la première bande pour commencer.
                  </p>
                  {availableBatiments.length > 0 && (
                    <Button onClick={() => setIsCreateBandeDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Créer la première bande
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bandes.map((bande) => (
                    <Card key={bande.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Bâtiment {bande.numero_batiment}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Entrée: {bande.date_entree}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {bande.quantite} {bande.type_poussin}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Responsable: </span>
                          <span>{bande.personnel_nom}</span>
                        </div>
                        {bande.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">{bande.notes}</div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {/* Create Bande Modal */}
            {isCreateBandeDialogOpen && (
              <CreateBandeModal
                isOpen={isCreateBandeDialogOpen}
                onClose={() => setIsCreateBandeDialogOpen(false)}
                fermeId={selectedFerme.id}
                fermeName={selectedFerme.nom}
                personnel={personnel || []}
                availableBatiments={availableBatiments || []}
                onBandeCreated={handleBandeCreated}
              />
            )}
          </div>
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
            <DialogContent>
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
                            autoComplete="off"
                            {...field}
                            disabled={isFormSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nbr_meuble"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de meubles</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Entrez le nombre de meubles"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value === 0 ? "" : field.value}
                            disabled={isFormSubmitting}
                            min="0"
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
          <main className="py-3 px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fermes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucune ferme</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Vous n'avez pas encore créé de ferme. Commencez par en ajouter une pour gérer vos
                  bandes d'animaux.
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-foreground hover:bg-foreground/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première ferme
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Farm Cards */}
                {fermes.map((ferme) => (
                  <div key={ferme.id} className="group cursor-pointer">
                    <div
                      className="border border-border rounded-xl p-6 transition-all duration-200 aspect-[4/3] bg-[#1d2737] hover:bg-[#1d2737]/90 flex flex-col justify-between relative text-white"
                      onClick={() => onFermeSelect(ferme)}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute rounded-md hover:bg-[#1d2737]/90 hover:border-1 focus:bg-accent top-4 right-4 text-muted-foreground h-8 w-8 p-0 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4 text-white" />
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
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <h3 className="text-2xl capitalize font-bold text-center mb-2">
                          {ferme.nom}
                        </h3>
                        <p className="text-sm text-white/70">
                          {ferme.nbr_meuble} meuble{ferme.nbr_meuble !== 1 ? "s" : ""}
                        </p>
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

          {/* Dialog pour modifier une ferme */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Modifier la ferme</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(updateFerme)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la ferme</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nom de la ferme"
                            {...field}
                            disabled={isEditSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="nbr_meuble"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de meubles</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Entrez le nombre de meubles"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value === 0 ? "" : field.value}
                            disabled={isEditSubmitting}
                            min="0"
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
                      onClick={() => setIsEditDialogOpen(false)}
                      disabled={isEditSubmitting}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isEditSubmitting}>
                      {isEditSubmitting ? "Modification..." : "Modifier"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Dialog de confirmation pour supprimer une ferme */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer la ferme "{deletingFerme?.nom}" ? Cette action
                  est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
