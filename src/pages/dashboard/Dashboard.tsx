import { Ferme } from "@/types";
import DashboardGlobal from "./DashboardGlobal";
import DashboardFerme from "./DashboardFerme";

interface DashboardProps {
  selectedFerme: Ferme | null;
  fermes: Ferme[];
}

/**
 * Composant Dashboard principal qui gère l'affichage selon la sélection
 */
export default function Dashboard({ selectedFerme, fermes }: DashboardProps) {
  // Si aucune ferme n'est sélectionnée ou si c'est "Toutes les fermes", afficher le dashboard global
  if (!selectedFerme || selectedFerme.id === 0) {
    return <DashboardGlobal fermes={fermes} />;
  }

  // Sinon, afficher le dashboard de la ferme sélectionnée
  return <DashboardFerme selectedFerme={selectedFerme} />;
}
