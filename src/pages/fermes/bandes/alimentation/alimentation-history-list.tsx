import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Trash2, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import CreateAlimentationModal from "@/pages/fermes/bandes/alimentation/create-alimentation-modal";

interface AlimentationHistory {
  id?: number;
  bande_id: number;
  quantite: number;
  created_at: string;
}

interface AlimentationHistoryListProps {
  bandeId: number;
  showAddButton?: boolean;
}

export function AlimentationHistoryList({
  bandeId,
  showAddButton = true,
}: AlimentationHistoryListProps) {
  const [histories, setHistories] = useState<AlimentationHistory[]>([]);
  const [contour, setContour] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch alimentation history
      const historyData = await invoke<AlimentationHistory[]>("get_alimentation_history_by_bande", {
        bandeId,
      });

      // Fetch current contour
      const contourData = await invoke<number>("get_alimentation_contour", { bandeId });

      setHistories(historyData);
      setContour(contourData);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bandeId]);

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await invoke("delete_alimentation_history", { id: itemToDelete });
      toast.success("Entrée supprimée avec succès");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat("fr-FR").format(Math.abs(number));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique d'alimentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative mt-6">
      {/* Contour Tag with Curved Borders */}
      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
        <div className="relative">
          {/* Curved borders - behind main tag */}
          <div
            className={`absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full opacity-30 ${
              contour < 10000 ? "bg-red-500" : "bg-emerald-500"
            }`}
          ></div>
          <div
            className={`absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full opacity-30 ${
              contour < 10000 ? "bg-red-500" : "bg-emerald-500"
            }`}
          ></div>
          {/* Main tag - on top */}
          <div
            className={`relative text-white px-6 py-3 rounded-full shadow-xl ${
              contour < 10000
                ? "bg-gradient-to-r from-red-500 to-red-600"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600"
            }`}
          >
            <span className="font-bold text-base">{formatNumber(contour)} kg</span>
          </div>
        </div>
      </div>

      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Historique d'alimentation</CardTitle>
        </div>
        <div className="flex gap-2">
          {showAddButton && (
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter alimentation
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {histories.length === 0 ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun historique d'alimentation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="flex items-center">
                {/* Quantity with fixed width */}
                <div className="w-28">
                  <p className={`font-medium text-sm text-emerald-900`}>
                    {history.quantite > 0 ? "+" : "-"}
                    {formatNumber(history.quantite)} kg
                  </p>
                </div>

                <div className="flex-1 flex justify-center">
                  <span className="text-sm text-gray-600 font-normal font-mono w-44 text-center">
                    {formatDate(history.created_at)}
                  </span>
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => history.id && handleDeleteClick(history.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Alimentation Modal */}
      {isModalOpen && (
        <CreateAlimentationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          bandeId={bandeId}
          bandeNumber={bandeId}
          onAlimentationAdded={() => {
            fetchData();
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette entrée d'alimentation ? Cette action est
              irréversible et affectera le contour total de la bande.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
