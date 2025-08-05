import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  AlertTriangle,
  Calendar,
} from "lucide-react";
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
import CreateSoinModal from "./create-soin-modal";
import UpdateSoinModal from "./update-soin-modal";
import { toast } from "react-hot-toast";

interface Soin {
  id?: number;
  nom: string;
  unit: string;
  created_at: string;
}

interface PaginatedSoin {
  data: Soin[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function Medicaments() {
  const [soins, setSoins] = useState<Soin[]>([]);
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
  const [editingSoin, setEditingSoin] = useState<Soin | null>(null);
  const [deletingSoin, setDeletingSoin] = useState<Soin | null>(null);
  const [nomSearch, setNomSearch] = useState("");
  const [uniteSearch, setUniteSearch] = useState("");

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newPageSize: string) => {
    const newLimit = parseInt(newPageSize);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    // Reload with new page size - pass the new limit directly
    loadSoins(1, nomSearch, uniteSearch, newLimit);
  };

  /**
   * Load soins from backend with pagination and search
   */
  const loadSoins = async (
    page: number = 1,
    nomSearch: string = "",
    uniteSearch: string = "",
    perPage?: number
  ) => {
    try {
      setIsLoading(true);

      const params = {
        page,
        perPage: perPage || pagination.limit,
        nomSearch: nomSearch.trim(),
        uniteSearch: uniteSearch.trim(),
      };

      const result = await invoke<PaginatedSoin>("get_all_soins", params);
      setSoins(result.data);
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
      toast.error("Impossible de charger les médicaments");
      console.error("Impossible de charger les médicaments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle soin creation
   */
  const handleSoinCreated = () => {
    loadSoins(pagination.page, nomSearch, uniteSearch);
  };

  /**
   * Handle soin update
   */
  const handleSoinUpdated = () => {
    loadSoins(pagination.page, nomSearch, uniteSearch);
    setEditingSoin(null);
  };

  /**
   * Handle edit soin
   */
  const handleEdit = (soin: Soin) => {
    setEditingSoin(soin);
    setIsUpdateModalOpen(true);
  };

  /**
   * Handle delete soin - show confirmation dialog
   */
  const handleDelete = (soin: Soin) => {
    setDeletingSoin(soin);
  };

  /**
   * Confirm delete soin
   */
  const confirmDelete = async () => {
    if (!deletingSoin) return;

    try {
      await invoke("delete_soin", { id: deletingSoin.id });
      toast.success("Médicament supprimé avec succès");
      // Reload current page, but if it becomes empty go to previous page
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.limit);
      const currentPage = pagination.page > newTotalPages ? newTotalPages : pagination.page;
      loadSoins(Math.max(currentPage, 1), nomSearch, uniteSearch);
    } catch (error) {
      toast.error("Impossible de supprimer le médicament");
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setDeletingSoin(null);
    }
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    loadSoins(1, nomSearch, uniteSearch); // Reset to first page when searching
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setNomSearch("");
    setUniteSearch("");
    loadSoins(1, "", ""); // Reset to first page with no search
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    loadSoins(page, nomSearch, uniteSearch);
  };

  // Load soins on component mount
  useEffect(() => {
    loadSoins();
  }, []);

  // Table columns configuration
  const columns = [
    {
      key: "nom" as keyof Soin,
      header: "Nom",
      sortable: false,
    },
    {
      key: "unit" as keyof Soin,
      header: "Unité par défaut",
      sortable: false,
    },
    {
      key: "created_at" as keyof Soin,
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
        <h1 className="text-3xl font-bold">Gestion des Médicaments</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter Médicament
        </Button>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Input
          placeholder="Rechercher par nom..."
          value={nomSearch}
          onChange={(e) => setNomSearch(e.target.value)}
          className="w-full max-w-[350px] bg-white"
        />
        <Input
          placeholder="Rechercher par unité..."
          value={uniteSearch}
          onChange={(e) => setUniteSearch(e.target.value)}
          className="w-full max-w-[350px] bg-white"
        />
        <Button onClick={handleSearch} className="flex items-center !h-10 gap-2">
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
        {(nomSearch || uniteSearch) && (
          <Button onClick={handleClearSearch} variant="ghost" className="text-muted-foreground">
            Effacer
          </Button>
        )}
      </div>

      <DataTable
        data={soins}
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
        actions={(soin: Soin) => (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground hover:border-1 focus:bg-accent">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit(soin);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(soin);
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

      <CreateSoinModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSoinCreated={handleSoinCreated}
      />

      <UpdateSoinModal
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        onSoinUpdated={handleSoinUpdated}
        soin={editingSoin}
      />

      <AlertDialog open={!!deletingSoin} onOpenChange={() => setDeletingSoin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingSoin?.nom}</strong> ? Cette action
              est irréversible.
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
