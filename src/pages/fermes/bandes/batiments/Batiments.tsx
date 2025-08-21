import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Trash2,
  Users,
  Home,
  ArrowLeft,
  Calendar,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Ferme, BandeWithDetails, BatimentWithDetails, Personnel, Poussin } from "@/types";
import { AlimentationHistoryList } from "@/pages/fermes/bandes/alimentation/alimentation-history-list";
import { useState, useEffect } from "react";
import SemainesView from "./semaines/semaines";
import CreateBatimentModal from "./create-batiment-modal";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";

interface BatimentsViewProps {
  bande: BandeWithDetails;
  ferme: Ferme;
  onBackToBandes: () => void;
  onBackToFermes: () => void;
  selectedBatiment?: BatimentWithDetails | null;
  onBatimentSelect?: (batiment: BatimentWithDetails) => void;
  onBackToBatiments?: () => void;
  currentView?: "ferme" | "bande" | "batiment" | "semaine";
  onRefreshBande?: () => void;
  personnel?: Personnel[];
  poussins?: Poussin[];
  availableBatiments?: string[];
}

export default function BatimentsView({
  bande,
  ferme,
  onBackToBandes,
  selectedBatiment: parentSelectedBatiment,
  onBatimentSelect,
  onBackToBatiments,
  currentView: parentCurrentView,
  onRefreshBande,
  personnel = [],
  poussins = [],
  availableBatiments = [],
}: BatimentsViewProps) {
  const [selectedBatiment, setSelectedBatiment] = useState<BatimentWithDetails | null>(
    parentSelectedBatiment || null
  );
  const [currentView, setCurrentView] = useState<"batiments" | "semaines">(
    parentSelectedBatiment && parentCurrentView === "semaine" ? "semaines" : "batiments"
  );
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [batimentToDelete, setBatimentToDelete] = useState<BatimentWithDetails | null>(null);
  const [isCreateBatimentModalOpen, setIsCreateBatimentModalOpen] = useState(false);
  const [localPersonnel, setLocalPersonnel] = useState<Personnel[]>(personnel);
  const [localPoussins, setLocalPoussins] = useState<Poussin[]>(poussins);

  // Update local state when props change
  useEffect(() => {
    setLocalPersonnel(personnel);
  }, [personnel]);

  useEffect(() => {
    setLocalPoussins(poussins);
  }, [poussins]);

  const handleCreateBatiment = async () => {
    // Load personnel and poussins data before opening the modal
    try {
      if (localPersonnel.length === 0) {
        const personnelResult = await invoke<Personnel[]>("get_personnel_list");
        setLocalPersonnel(personnelResult);
      }
      if (localPoussins.length === 0) {
        const poussinsResult = await invoke<Poussin[]>("get_poussin_list");
        setLocalPoussins(poussinsResult);
      }
    } catch (error) {
      console.error("Error loading data for create batiment modal:", error);
      toast.error("Erreur lors du chargement des données");
      return;
    }

    setIsCreateBatimentModalOpen(true);
  };

  const handleBatimentCreated = () => {
    // Refresh the bande data to show the new batiment
    onRefreshBande?.();
  };

  const handleDeleteBatiment = async () => {
    if (!batimentToDelete?.id) {
      toast.error("ID du bâtiment invalide");
      return;
    }

    if (deleteConfirmation !== "SUPPRIMER") {
      toast.error("Veuillez taper 'SUPPRIMER' pour confirmer la suppression");
      return;
    }

    setIsDeleting(batimentToDelete.id);

    try {
      await invoke("delete_batiment", { id: batimentToDelete.id });

      toast.success("Bâtiment supprimé avec succès");

      // Reset the delete state first
      setDeleteConfirmation("");
      setBatimentToDelete(null);

      // Small delay to ensure the database operation is complete
      setTimeout(() => {
        // Refresh the bande data to reflect the changes
        onRefreshBande?.();
      }, 200);
    } catch (error) {
      console.error("Erreur lors de la suppression du bâtiment:", error);

      // Check if the error indicates the batiment doesn't exist
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found") || errorMessage.includes("n'existe pas")) {
        toast.error("Ce bâtiment n'existe plus. Actualisation des données...");
        // Automatically refresh the data
        setTimeout(() => {
          onRefreshBande?.();
        }, 1000);
      } else {
        toast.error("Erreur lors de la suppression du bâtiment");
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBatimentClick = (batiment: BatimentWithDetails) => {
    setSelectedBatiment(batiment);
    setCurrentView("semaines");
    onBatimentSelect?.(batiment);
  };

  const handleBackToBatiments = () => {
    setCurrentView("batiments");
    setSelectedBatiment(null);
    onBackToBatiments?.();
  };

  // Si on est en mode semaines, afficher la vue des semaines
  if (currentView === "semaines" && selectedBatiment) {
    return (
      <SemainesView
        batiment={selectedBatiment}
        bande={bande}
        ferme={ferme}
        onBackToBatiments={handleBackToBatiments}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBackToBandes}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux bandes
            </Button>
            <Button onClick={handleCreateBatiment}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bâtiment
            </Button>
          </div>

          {/* Alimentation Section */}
          <AlimentationHistoryList bandeId={bande.id!} />

          <main>
            {bande.batiments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucun bâtiment</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Cette bande n'a pas encore de bâtiments. Utilisez le bouton "Nouveau bâtiment"
                  pour commencer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Batiment List */}
                {bande.batiments.map((batiment, index) => (
                  <div
                    key={batiment.id || index}
                    className="bg-white border border-border rounded-lg p-6 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => handleBatimentClick(batiment)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <Home className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              Bâtiment {batiment.numero_batiment}
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </h3>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>
                                  {batiment.quantite} {batiment.poussin_nom}
                                </span>
                              </div>

                              <div>
                                <span className="text-muted-foreground">Responsable: </span>
                                <span className="font-medium text-foreground">
                                  {batiment.personnel_nom}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={isDeleting === batiment.id}
                            onSelect={(e) => {
                              e.preventDefault();
                              setBatimentToDelete(batiment);
                              setDeleteConfirmation("");
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting === batiment.id ? "Suppression..." : "Supprimer"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </main>

      {/* Delete Confirmation Dialog - Moved outside the card structure */}
      <AlertDialog
        open={!!batimentToDelete}
        onOpenChange={(open) => !open && setBatimentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le bâtiment</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le bâtiment {batimentToDelete?.numero_batiment} ?
              Cette action supprimera également toutes les semaines, le suivi quotidien et les
              maladies associées.
              <br />
              <br />
              Pour confirmer, tapez <strong>SUPPRIMER</strong> dans le champ ci-dessous.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Tapez SUPPRIMER pour confirmer"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmation("");
                setBatimentToDelete(null);
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatiment}
              disabled={deleteConfirmation !== "SUPPRIMER" || isDeleting === batimentToDelete?.id}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting === batimentToDelete?.id ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Batiment Modal */}
      <CreateBatimentModal
        isOpen={isCreateBatimentModalOpen}
        onClose={() => setIsCreateBatimentModalOpen(false)}
        bande={bande}
        ferme={ferme}
        personnel={localPersonnel}
        poussins={localPoussins}
        availableBatiments={availableBatiments}
        onBatimentCreated={handleBatimentCreated}
      />
    </div>
  );
}
