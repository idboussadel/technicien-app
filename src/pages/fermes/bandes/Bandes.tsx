import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Home,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import CreateBandeModal from "./create-bande-modal";
import { Ferme, Personnel, BandeWithDetails } from "@/types";

interface BandesPageProps {
  ferme: Ferme;
  onBackToFermes: () => void;
}

export default function Bandes({ ferme, onBackToFermes }: BandesPageProps) {
  // State for bandes
  const [bandes, setBandes] = useState<BandeWithDetails[]>([]);
  const [isBandesLoading, setIsBandesLoading] = useState(false);

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
  };

  /**
   * Handle opening the create bande modal
   */
  const handleOpenCreateModal = async () => {
    await loadPersonnel();
    await loadAvailableBatiments(ferme.id);
    setIsCreateBandeDialogOpen(true);
  };

  // Load bandes when component mounts or ferme changes
  useEffect(() => {
    loadBandes(ferme.id);
  }, [ferme.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBackToFermes}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle bande
            </Button>
          </div>

          {/* Bandes List */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Bandes de {ferme.nom}</h3>

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
                <Button onClick={handleOpenCreateModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer la première bande
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bandes.map((bande) => (
                  <Card key={bande.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">
                          Bande du {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                        </h4>
                        {bande.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{bande.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {bande.batiments.length} bâtiment
                          {bande.batiments.length !== 1 ? "s" : ""}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
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
                    </div>

                    {/* Batiments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {bande.batiments.map((batiment, index) => (
                        <div
                          key={batiment.id || index}
                          className="border rounded-lg p-4 bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                Bâtiment {batiment.numero_batiment}
                              </span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="w-3 h-3 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {batiment.quantite} {batiment.type_poussin}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Responsable: </span>
                              <span className="font-medium">{batiment.personnel_nom}</span>
                            </div>
                          </div>
                        </div>
                      ))}
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
