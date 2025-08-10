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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ferme, BandeWithDetails, BatimentWithDetails } from "@/types";
import { AlimentationHistoryList } from "@/components/alimentation/alimentation-history-list";
import { useState } from "react";
import SemainesView from "./semaines/semaines";

interface BatimentsViewProps {
  bande: BandeWithDetails;
  ferme: Ferme;
  onBackToBandes: () => void;
  onBackToFermes: () => void;
  selectedBatiment?: BatimentWithDetails | null;
  onBatimentSelect?: (batiment: BatimentWithDetails) => void;
  onBackToBatiments?: () => void;
  currentView?: "ferme" | "bande" | "batiment" | "semaine";
}

export default function BatimentsView({
  bande,
  ferme,
  onBackToBandes,
  selectedBatiment: parentSelectedBatiment,
  onBatimentSelect,
  onBackToBatiments,
  currentView: parentCurrentView,
}: BatimentsViewProps) {
  const [selectedBatiment, setSelectedBatiment] = useState<BatimentWithDetails | null>(
    parentSelectedBatiment || null
  );
  const [currentView, setCurrentView] = useState<"batiments" | "semaines">(
    parentSelectedBatiment && parentCurrentView === "semaine" ? "semaines" : "batiments"
  );

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
          </div>

          {/* Alimentation Section */}
          <AlimentationHistoryList bandeId={bande.id!} />

          <main>
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
                            <p className="text-sm text-muted-foreground">
                              Cliquez pour voir le suivi hebdomadaire
                            </p>
                          </div>
                        </div>

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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </main>
    </div>
  );
}
