import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import { Plus, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
import CreatePoussinModal from "./create-poussin-modal";
import UpdatePoussinModal from "./update-poussin-modal";
import { toast } from "react-hot-toast";
import { Poussin, PaginatedPoussins } from "@/types";

export default function Poussins() {
  const [poussins, setPoussins] = useState<Poussin[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingPoussin, setEditingPoussin] = useState<Poussin | null>(null);
  const [deletingPoussin, setDeletingPoussin] = useState<Poussin | null>(null);
  const [nomSearch, setNomSearch] = useState("");

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newPageSize: string) => {
    const newLimit = parseInt(newPageSize);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    loadPoussins(1, nomSearch, newLimit);
  };

  /**
   * Load poussins from backend with pagination and search
   */
  const loadPoussins = async (page: number = 1, nomSearch: string = "", perPage?: number) => {
    try {
      setIsLoading(true);

      const params = {
        page,
        perPage: perPage || pagination.limit,
        nomSearch: nomSearch.trim(),
      };

      const result = await invoke<PaginatedPoussins>("get_all_poussins", params);
      setPoussins(result.data);
      setPagination((prev) => ({
        ...prev,
        page: result.page,
        limit: perPage || prev.limit,
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.has_next,
        has_prev: result.has_prev,
      }));
    } catch (error) {
      console.error("Erreur lors du chargement des poussins:", error);
      toast.error("Erreur lors du chargement des poussins");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle poussin creation success
   */
  const handlePoussinCreated = () => {
    setIsCreateModalOpen(false);
    loadPoussins(pagination.page, nomSearch);
  };

  /**
   * Handle poussin update success
   */
  const handlePoussinUpdated = () => {
    setIsUpdateModalOpen(false);
    setEditingPoussin(null);
    loadPoussins(pagination.page, nomSearch);
  };

  /**
   * Handle edit action
   */
  const handleEdit = (poussin: Poussin) => {
    setEditingPoussin(poussin);
    setIsUpdateModalOpen(true);
  };

  /**
   * Handle delete action
   */
  const handleDelete = (poussin: Poussin) => {
    setDeletingPoussin(poussin);
  };

  /**
   * Confirm delete action
   */
  const confirmDelete = async () => {
    if (!deletingPoussin) return;

    try {
      await invoke("delete_poussin", { id: deletingPoussin.id });
      toast.success(`Le poussin "${deletingPoussin.nom}" a été supprimé`);

      // Recalculate pagination
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.limit);
      const currentPage = pagination.page > newTotalPages ? newTotalPages : pagination.page;
      loadPoussins(Math.max(currentPage, 1), nomSearch);
    } catch (error) {
      toast.error("Impossible de supprimer le poussin");
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setDeletingPoussin(null);
    }
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    loadPoussins(1, nomSearch);
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setNomSearch("");
    loadPoussins(1, "");
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    loadPoussins(page, nomSearch);
  };

  // Load data on component mount
  useEffect(() => {
    loadPoussins();
  }, []);

  const columns = [
    {
      key: "nom" as keyof Poussin,
      header: "Nom",
      sortable: false,
    },
    {
      key: "created_at" as keyof Poussin,
      header: "Date de création",
      sortable: false,
      render: (value: any) => {
        const date = new Date(value);
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Poussins</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter Poussin
        </Button>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Input
          placeholder="Rechercher par nom..."
          value={nomSearch}
          onChange={(e) => setNomSearch(e.target.value)}
          className="w-full max-w-[350px] bg-white"
        />
        <Button onClick={handleSearch} className="flex items-center !h-10 gap-2">
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
        {nomSearch && (
          <Button onClick={handleClearSearch} variant="ghost" className="text-muted-foreground">
            Effacer
          </Button>
        )}
      </div>

      <DataTable
        data={poussins}
        columns={columns}
        loading={isLoading}
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.total_pages,
          hasNext: pagination.has_next,
          hasPrev: pagination.has_prev,
          total: pagination.total,
          perPage: pagination.limit,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        actions={(poussin: Poussin) => (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground hover:border-1 focus:bg-accent">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit(poussin);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(poussin);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <CreatePoussinModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePoussinCreated}
      />

      <UpdatePoussinModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setEditingPoussin(null);
        }}
        onSuccess={handlePoussinUpdated}
        poussin={editingPoussin}
      />

      <AlertDialog open={!!deletingPoussin} onOpenChange={() => setDeletingPoussin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingPoussin?.nom}</strong> ? Cette
              action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
