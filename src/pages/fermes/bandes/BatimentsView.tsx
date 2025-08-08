import { useState, useEffect } from "react";
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
  Calendar,
  Package,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import { invoke } from "@tauri-apps/api/core";
import { Ferme, BandeWithDetails, AlimentationHistory } from "@/types";
import AlimentationModal from "./AlimentationModal";

interface BatimentsViewProps {
  bande: BandeWithDetails;
  ferme: Ferme;
  onBackToBandes: () => void;
  onBackToFermes: () => void;
}

export default function BatimentsView({
  bande,
  ferme,
  onBackToBandes,
  onBackToFermes,
}: BatimentsViewProps) {
  const [alimentationHistory, setAlimentationHistory] = useState<AlimentationHistory[]>([]);
  const [isAlimentationDialogOpen, setIsAlimentationDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentContour, setCurrentContour] = useState(bande.alimentation_contour || 0);

  /**
   * Load alimentation history for the current bande
   */
  const loadAlimentationHistory = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<AlimentationHistory[]>("get_alimentation_history", {
        bandeId: bande.id,
      });
      setAlimentationHistory(result);
    } catch (error) {
      toast.error("Impossible de charger l'historique d'alimentation");
      console.error("Erreur lors du chargement de l'historique:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh alimentation data when new entry is added
   */
  const handleAlimentationAdded = async () => {
    await loadAlimentationHistory();
    // Refresh contour data (you might want to fetch this from backend)
    try {
      const updatedBande = await invoke<BandeWithDetails>("get_bande_details", {
        bandeId: bande.id,
      });
      setCurrentContour(updatedBande.alimentation_contour || 0);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du contour:", error);
    }
  };

  const handleCreateBatiment = () => {
    // TODO: Implement create batiment functionality
    console.log("Create new batiment");
  };

  const handleEditBatiment = (batimentId: number | null) => {
    // TODO: Implement edit batiment functionality
    console.log("Edit batiment:", batimentId);
  };

  const handleDeleteBatiment = (batimentId: number | null) => {
    // TODO: Implement delete batiment functionality
    console.log("Delete batiment:", batimentId);
  };

  // Load alimentation history on component mount
  useEffect(() => {
    if (bande.id) {
      loadAlimentationHistory();
    }
  }, [bande.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBackToBandes}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux bandes
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Bâtiments - Bande #{bande.id}</h1>
                <p className="text-sm text-muted-foreground">
                  {ferme.nom} • Entrée: {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBackToFermes}>
                Retour aux fermes
              </Button>
              <Button onClick={handleCreateBatiment}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau bâtiment
              </Button>
            </div>
          </div>

          {/* Bande Info & Alimentation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bande Info */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Informations de la bande</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p>Date d'entrée: {new Date(bande.date_entree).toLocaleDateString("fr-FR")}</p>
                <p>Nombre de bâtiments: {bande.batiments.length}</p>
                {bande.notes && <p>Notes: {bande.notes}</p>}
              </div>
            </Card>

            {/* Alimentation Contour */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Alimentation Contour</h3>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">{currentContour} kg</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsAlimentationDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter alimentation
                </Button>
              </div>
            </Card>

            {/* Alimentation History */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <History className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Historique</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {alimentationHistory.length} entrée{alimentationHistory.length !== 1 ? "s" : ""}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsHistoryDialogOpen(true)}
                >
                  <History className="mr-2 h-4 w-4" />
                  Voir l'historique
                </Button>
              </div>
            </Card>
          </div>

          {/* Batiments List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Bâtiments</h2>
            {bande.batiments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucun bâtiment</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Cette bande n'a pas encore de bâtiments. Créez le premier bâtiment pour commencer.
                </p>
                <Button
                  onClick={handleCreateBatiment}
                  className="bg-foreground hover:bg-foreground/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer le premier bâtiment
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Batiment Cards */}
                {bande.batiments.map((batiment, index) => (
                  <Card key={batiment.id || index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Bâtiment {batiment.numero_batiment}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleEditBatiment(batiment.id)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteBatiment(batiment.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {batiment.quantite} {batiment.type_poussin}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Responsable: </span>
                        <span className="font-medium">{batiment.personnel_nom}</span>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Add New Batiment Card */}
                <Card
                  className="p-4 border-2 border-dashed border-border hover:border-muted-foreground hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                  onClick={handleCreateBatiment}
                >
                  <div className="flex flex-col items-center justify-center h-full min-h-[120px]">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground font-medium text-center">
                      Nouveau bâtiment
                    </span>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Alimentation Modal */}
          <AlimentationModal
            isOpen={isAlimentationDialogOpen}
            onClose={() => setIsAlimentationDialogOpen(false)}
            bandeId={bande.id!}
            bandeNumber={bande.id}
            onAlimentationAdded={handleAlimentationAdded}
          />

          {/* Alimentation History Dialog */}
          <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Historique d'alimentation - Bande #{bande.id}</DialogTitle>
                <DialogDescription>
                  Historique complet des alimentations pour cette bande
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : alimentationHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun historique d'alimentation
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alimentationHistory.map((entry, index) => (
                      <Card key={entry.id || index} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{entry.quantite} kg</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(entry.date_alimentation).toLocaleDateString("fr-FR")}
                            </p>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                            )}
                          </div>
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setIsHistoryDialogOpen(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
