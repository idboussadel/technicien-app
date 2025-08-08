import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MoreHorizontal, Edit, Trash2, ArrowLeft, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import CreateBandeModal from "./create-bande-modal";
import BatimentsView from "./batiments/Batiments";
import { Ferme, Personnel, BandeWithDetails } from "@/types";

interface BandesPageProps {
  ferme: Ferme;
  onBackToFermes: () => void;
  onRefreshBandes?: () => void;
}

export default function Bandes({ ferme, onBackToFermes, onRefreshBandes }: BandesPageProps) {
  // State for bandes
  const [bandes, setBandes] = useState<BandeWithDetails[]>([]);
  const [isBandesLoading, setIsBandesLoading] = useState(false);
  const [selectedBande, setSelectedBande] = useState<BandeWithDetails | null>(null);

  // State for create bande modal
  const [isCreateBandeDialogOpen, setIsCreateBandeDialogOpen] = useState(false);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [availableBatiments, setAvailableBatiments] = useState<string[]>([]);

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
    await loadBandes(ferme.id);
    await loadAvailableBatiments(ferme.id);
    // Refresh parent state to update breadcrumb
    onRefreshBandes?.();
  };

  /**
   * Handle opening the create bande modal
   */
  const handleOpenCreateModal = async () => {
    await loadPersonnel();
    await loadAvailableBatiments(ferme.id);
    setIsCreateBandeDialogOpen(true);
  };

  /**
   * Handle selecting a bande to view its batiments
   */
  const handleBandeSelect = (bande: BandeWithDetails) => {
    setSelectedBande(bande);
  };

  /**
   * Handle going back to bandes list
   */
  const handleBackToBandes = () => {
    setSelectedBande(null);
  };

  // Load bandes when component mounts or ferme changes
  useEffect(() => {
    loadBandes(ferme.id);
  }, [ferme.id]);

  // If a bande is selected, show the batiments view
  if (selectedBande) {
    return (
      <BatimentsView
        bande={selectedBande}
        ferme={ferme}
        onBackToBandes={handleBackToBandes}
        onBackToFermes={onBackToFermes}
      />
    );
  }

  // Main view - bandes list
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBackToFermes}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux fermes
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle bande
            </Button>
          </div>

          {/* Bandes List */}
          <div className="space-y-4">
            {isBandesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : bandes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucune bande</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Cette ferme n'a pas encore de bandes. Créez la première bande pour commencer.
                </p>
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-foreground hover:bg-foreground/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer la première bande
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Bande Cards - Horizontal Layout */}
                {bandes.map((bande) => (
                  <div
                    key={bande.id}
                    className="group cursor-pointer"
                    onClick={() => handleBandeSelect(bande)}
                  >
                    <div className="border border-border rounded-md p-4 bg-white transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Bande #{bande.id}</h3>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>
                              Entrée: {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                            </span>
                            <span>
                              {bande.batiments.length} bâtiment
                              {bande.batiments.length !== 1 ? "s" : ""}
                            </span>
                            <span className="font-medium text-blue-600">
                              Alimentation: {bande.alimentation_contour || 0} kg
                            </span>
                            {bande.notes && (
                              <span className="max-w-xs truncate">Notes: {bande.notes}</span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-md hover:bg-gray-100 focus:bg-accent text-muted-foreground h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Handle edit
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Handle delete
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Bande Modal */}
          {isCreateBandeDialogOpen && (
            <CreateBandeModal
              isOpen={isCreateBandeDialogOpen}
              onClose={() => setIsCreateBandeDialogOpen(false)}
              fermeId={ferme.id}
              fermeName={ferme.nom}
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
