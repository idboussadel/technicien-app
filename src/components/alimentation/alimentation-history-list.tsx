import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { CreateAlimentationModal } from "./create-alimentation-modal";

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

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée?")) {
      return;
    }

    try {
      await invoke("delete_alimentation_history", { id });
      toast.success("Entrée supprimée avec succès");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Historique d'alimentation</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Contour total: <Badge variant="secondary">{contour.toFixed(1)} kg</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          {showAddButton && <CreateAlimentationModal bandeId={bandeId} onSuccess={fetchData} />}
        </div>
      </CardHeader>
      <CardContent>
        {histories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun historique d'alimentation trouvé</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div
                key={history.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={history.quantite > 0 ? "default" : "destructive"}>
                      {history.quantite > 0 ? "+" : ""}
                      {history.quantite} kg
                    </Badge>
                    <span className="text-sm text-gray-500">{formatDate(history.created_at)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => history.id && handleDelete(history.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
