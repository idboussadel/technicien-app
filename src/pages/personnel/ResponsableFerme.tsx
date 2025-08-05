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
import CreatePersonnelModal from "@/pages/personnel/create-personnel-modal";
import UpdatePersonnelModal from "@/pages/personnel/update-personnel-modal";
import { toast } from "react-hot-toast";

interface Personnel {
  id?: number;
  nom: string;
  telephone: string;
  created_at: string;
}

interface PaginatedPersonnel {
  data: Personnel[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function ResponsableFerme() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
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
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [deletingPersonnel, setDeletingPersonnel] = useState<Personnel | null>(null);
  const [nomSearch, setNomSearch] = useState("");
  const [teleSearch, setTeleSearch] = useState("");

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newPageSize: string) => {
    const newLimit = parseInt(newPageSize);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    // Reload with new page size - pass the new limit directly
    loadPersonnel(1, nomSearch, teleSearch, newLimit);
  };

  /**
   * Load personnel from backend with pagination and search
   */
  const loadPersonnel = async (
    page: number = 1,
    nomSearch: string = "",
    teleSearch: string = "",
    perPage?: number
  ) => {
    try {
      setIsLoading(true);

      const params = {
        page,
        perPage: perPage || pagination.limit,
        nomSearch: nomSearch.trim(),
        teleSearch: teleSearch.trim(),
      };

      const result = await invoke<PaginatedPersonnel>("get_all_personnel", params);
      setPersonnel(result.data);
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
      toast.error("Impossible de charger le personnel");
      console.error("Impossible de charger le personnel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle personnel creation
   */
  const handlePersonnelCreated = () => {
    loadPersonnel(pagination.page, nomSearch, teleSearch);
  };

  /**
   * Handle personnel update
   */
  const handlePersonnelUpdated = () => {
    loadPersonnel(pagination.page, nomSearch, teleSearch);
    setEditingPersonnel(null);
  };

  /**
   * Handle edit personnel
   */
  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    setIsUpdateModalOpen(true);
  };

  /**
   * Handle delete personnel - show confirmation dialog
   */
  const handleDelete = (person: Personnel) => {
    setDeletingPersonnel(person);
  };

  /**
   * Confirm delete personnel
   */
  const confirmDelete = async () => {
    if (!deletingPersonnel) return;

    try {
      await invoke("delete_personnel", { id: deletingPersonnel.id });
      toast.success("Personnel supprimé avec succès");
      // Reload current page, but if it becomes empty go to previous page
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.limit);
      const currentPage = pagination.page > newTotalPages ? newTotalPages : pagination.page;
      loadPersonnel(Math.max(currentPage, 1), nomSearch, teleSearch);
    } catch (error) {
      toast.error("Impossible de supprimer le personnel");
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setDeletingPersonnel(null);
    }
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    loadPersonnel(1, nomSearch, teleSearch); // Reset to first page when searching
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setNomSearch("");
    setTeleSearch("");
    loadPersonnel(1, "", ""); // Reset to first page with no search
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    loadPersonnel(page, nomSearch, teleSearch);
  };

  // Load personnel on component mount
  useEffect(() => {
    loadPersonnel();
  }, []);

  // Table columns configuration
  const columns = [
    {
      key: "nom" as keyof Personnel,
      header: "Nom",
      sortable: false,
    },
    {
      key: "telephone" as keyof Personnel,
      header: "Téléphone",
      sortable: false,
    },
    {
      key: "created_at" as keyof Personnel,
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
        <h1 className="text-3xl font-bold">Gestion du Personnel</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter Personnel
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
          placeholder="Rechercher par téléphone..."
          value={teleSearch}
          onChange={(e) => setTeleSearch(e.target.value)}
          className="w-full max-w-[350px] bg-white"
        />
        <Button onClick={handleSearch} className="flex items-center !h-10 gap-2">
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
        {(nomSearch || teleSearch) && (
          <Button onClick={handleClearSearch} variant="ghost" className="text-muted-foreground">
            Effacer
          </Button>
        )}
      </div>

      <DataTable
        data={personnel}
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
        actions={(person: Personnel) => (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground hover:border-1 focus:bg-accent">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit(person);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(person);
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

      <CreatePersonnelModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onPersonnelCreated={handlePersonnelCreated}
      />

      <UpdatePersonnelModal
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        onPersonnelUpdated={handlePersonnelUpdated}
        personnel={editingPersonnel}
      />

      <AlertDialog open={!!deletingPersonnel} onOpenChange={() => setDeletingPersonnel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingPersonnel?.nom}</strong> ? Cette
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
