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
import CreateMaladiesModal from "./create-maladies-modal";
import UpdateMaladiesModal from "./update-maladies-modal";
import { toast } from "react-hot-toast";
import { Maladie, PaginatedMaladies } from "@/types";

export default function Maladies() {
  const [maladies, setMaladies] = useState<Maladie[]>([]);
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
  const [editingMaladie, setEditingMaladie] = useState<Maladie | null>(null);
  const [deletingMaladie, setDeletingMaladie] = useState<Maladie | null>(null);
  const [nomSearch, setNomSearch] = useState("");

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newPageSize: string) => {
    const newLimit = parseInt(newPageSize);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    // Reload with new page size - pass the new limit directly
    loadMaladies(1, nomSearch, newLimit);
  };

  /**
   * Load maladies from backend with pagination and search
   */
  const loadMaladies = async (page: number = 1, nomSearch: string = "", perPage?: number) => {
    try {
      setIsLoading(true);

      const params = {
        page,
        perPage: perPage || pagination.limit,
        nomSearch: nomSearch.trim(),
      };

      const result = await invoke<PaginatedMaladies>("get_maladies", params);
      setMaladies(result.data);
      setPagination((prev) => ({
        ...prev,
        page: result.page,
        limit: perPage || prev.limit, // Update limit if perPage was provided
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.has_next,
        has_prev: result.has_prev,
      }));
    } catch (error) {
      toast.error("Impossible de charger les maladies");
      console.error("Impossible de charger les maladies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle maladie creation
   */
  const handleMaladieCreated = () => {
    loadMaladies(pagination.page, nomSearch);
  };

  /**
   * Handle maladie update
   */
  const handleMaladieUpdated = () => {
    loadMaladies(pagination.page, nomSearch);
    setEditingMaladie(null);
  };

  /**
   * Handle edit maladie
   */
  const handleEdit = (maladie: Maladie) => {
    setEditingMaladie(maladie);
    setIsUpdateModalOpen(true);
  };

  /**
   * Handle delete maladie - show confirmation dialog
   */
  const handleDelete = (maladie: Maladie) => {
    setDeletingMaladie(maladie);
  };

  /**
   * Confirm delete maladie
   */
  const confirmDelete = async () => {
    if (!deletingMaladie) return;

    try {
      await invoke("delete_maladie", { id: deletingMaladie.id });
      toast.success("Maladie supprimée avec succès");
      // Reload current page, but if it becomes empty go to previous page
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.limit);
      const currentPage = pagination.page > newTotalPages ? newTotalPages : pagination.page;
      loadMaladies(Math.max(currentPage, 1), nomSearch);
    } catch (error) {
      toast.error("Impossible de supprimer la maladie");
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setDeletingMaladie(null);
    }
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    loadMaladies(1, nomSearch); // Reset to first page when searching
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setNomSearch("");
    loadMaladies(1, ""); // Reset to first page with no search
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    loadMaladies(page, nomSearch);
  };

  // Load maladies on component mount
  useEffect(() => {
    loadMaladies();
  }, []);

  // Table columns configuration
  const columns = [
    {
      key: "nom" as keyof Maladie,
      header: "Nom",
      sortable: false,
    },
    {
      key: "created_at" as keyof Maladie,
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
        <h1 className="text-3xl font-bold">Gestion des Maladies</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter Maladie
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
        data={maladies}
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
        actions={(maladie: Maladie) => (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground hover:border-1 focus:bg-accent">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit(maladie);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(maladie);
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

      <CreateMaladiesModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onMaladieCreated={handleMaladieCreated}
      />

      <UpdateMaladiesModal
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        onMaladieUpdated={handleMaladieUpdated}
        maladie={editingMaladie}
      />

      <AlertDialog open={!!deletingMaladie} onOpenChange={() => setDeletingMaladie(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingMaladie?.nom}</strong> ? Cette
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
