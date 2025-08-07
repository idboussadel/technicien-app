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
import { Ferme, BandeWithDetails } from "@/types";

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

          {/* Bande Info Card */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Informations de la bande</h3>
                <p className="text-sm text-muted-foreground">
                  Date d'entrée: {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                </p>
                {bande.notes && (
                  <p className="text-sm text-muted-foreground mt-1">Notes: {bande.notes}</p>
                )}
              </div>
            </div>
          </div>

          {/* Batiments List */}
          <main className="py-3 px-4">
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
                  <div key={batiment.id || index} className="group">
                    <div className="border border-border rounded-xl p-6 transition-all duration-200 aspect-[4/3] bg-white hover:bg-gray-50 flex flex-col justify-between relative hover:shadow-md">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute rounded-md hover:bg-gray-100 focus:bg-accent top-4 right-4 text-muted-foreground h-8 w-8 p-0 z-10"
                          >
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

                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-3">
                          <Home className="h-6 w-6 text-primary" />
                          <h3 className="text-lg font-bold text-center">
                            Bâtiment {batiment.numero_batiment}
                          </h3>
                        </div>

                        <div className="space-y-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {batiment.quantite} {batiment.type_poussin}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            <span className="block">Responsable:</span>
                            <span className="font-medium text-foreground">
                              {batiment.personnel_nom}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBatiment(batiment.id)}
                            className="text-xs px-3 py-1"
                          >
                            Modifier
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add New Batiment Card */}
                <div className="group cursor-pointer">
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-6 hover:border-muted-foreground hover:bg-muted/50 transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center"
                    onClick={handleCreateBatiment}
                  >
                    <Plus className="w-8 h-8 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                    <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                      Nouveau bâtiment
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
