import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowLeft,
  CalendarDays,
  Building,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import toast from "react-hot-toast";
import CreateBandeModal from "./create-bande-modal";
import BatimentsView from "./batiments/Batiments";
import {
  Ferme,
  Personnel,
  BandeWithDetails,
  Poussin,
  PaginatedBandes,
  BatimentWithDetails,
} from "@/types";
import { DataPagination } from "@/components/ui/data-pagination";

interface BandesPageProps {
  ferme: Ferme;
  selectedBande?: BandeWithDetails | null;
  onBandeSelect?: (bande: BandeWithDetails) => void;
  onBackToFermes: () => void;
  selectedBatiment?: BatimentWithDetails | null;
  onBatimentSelect?: (batiment: BatimentWithDetails) => void;
  onBackToBandes?: () => void;
  onBackToBatiments?: () => void;
  currentView?: "ferme" | "bande" | "batiment" | "semaine";
  onRefreshBandes?: () => void;
}

export default function Bandes({
  ferme,
  selectedBande: parentSelectedBande,
  onBandeSelect,
  onBackToFermes,
  selectedBatiment,
  onBatimentSelect,
  onBackToBandes,
  onBackToBatiments,
  currentView,
  onRefreshBandes,
}: BandesPageProps) {
  // State for bandes
  const [bandes, setBandes] = useState<BandeWithDetails[]>([]);
  const [isBandesLoading, setIsBandesLoading] = useState(false);
  const [selectedBande, setSelectedBande] = useState<BandeWithDetails | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  // State for create bande modal
  const [isCreateBandeDialogOpen, setIsCreateBandeDialogOpen] = useState(false);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [poussins, setPoussins] = useState<Poussin[]>([]);
  const [availableBatiments, setAvailableBatiments] = useState<string[]>([]);

  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  /**
   * Charge les bandes d'une ferme spécifique avec pagination
   */
  const loadBandes = async (
    fermeId: number,
    page: number = 1,
    perPage?: number,
    dateRangeFilter?: DateRange
  ) => {
    try {
      setIsBandesLoading(true);
      const result = await invoke<PaginatedBandes>("get_bandes_by_ferme_paginated", {
        fermeId,
        page,
        perPage: perPage || pagination.limit,
        dateFrom: dateRangeFilter?.from ? format(dateRangeFilter.from, "yyyy-MM-dd") : null,
        dateTo: dateRangeFilter?.to ? format(dateRangeFilter.to, "yyyy-MM-dd") : null,
      });
      setBandes(result.data);
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
      toast.error("Impossible de charger les bandes");
      console.error("Impossible de charger les bandes:", error);
    } finally {
      setIsBandesLoading(false);
    }
  };

  /**
   * Handle search with date filters
   */
  const handleSearch = () => {
    loadBandes(ferme.id, 1, pagination.limit, dateRange);
  };

  /**
   * Charge la liste du personnel
   */
  const loadPersonnel = async () => {
    try {
      const result = await invoke<Personnel[]>("get_personnel_list");
      setPersonnel(result);
    } catch (error) {
      toast.error("Impossible de charger le personnel");
      console.error("Impossible de charger le personnel:", error);
    }
  };

  /**
   * Charge la liste des poussins
   */
  const loadPoussins = async () => {
    try {
      const result = await invoke<Poussin[]>("get_poussin_list");
      setPoussins(result);
    } catch (error) {
      toast.error("Impossible de charger les poussins");
      console.error("Impossible de charger les poussins:", error);
    }
  };

  /**
   * Charge les bâtiments disponibles pour une ferme
   */
  const loadAvailableBatiments = async (fermeId: number) => {
    try {
      const result = await invoke<string[]>("get_available_batiments", { fermeId });
      setAvailableBatiments(result);
    } catch (error) {
      toast.error("Impossible de charger les bâtiments disponibles");
      console.error("Impossible de charger les bâtiments disponibles:", error);
    }
  };

  /**
   * Callback when a bande is created successfully
   */
  const handleBandeCreated = async () => {
    await loadBandes(ferme.id, pagination.page, pagination.limit, dateRange);
    await loadAvailableBatiments(ferme.id);
    // Refresh parent state to update breadcrumb
    onRefreshBandes?.();
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    loadBandes(ferme.id, page, pagination.limit, dateRange);
  };

  /**
   * Handle page size change
   */
  const handlePageSizeChange = (newPageSize: string) => {
    const newLimit = parseInt(newPageSize);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    loadBandes(ferme.id, 1, newLimit, dateRange);
  };

  /**
   * Handle opening the create bande modal
   */
  const handleOpenCreateModal = async () => {
    await loadPersonnel();
    await loadPoussins();
    await loadAvailableBatiments(ferme.id);
    setIsCreateBandeDialogOpen(true);
  };

  /**
   * Handle selecting a bande to view its batiments
   */
  const handleBandeSelect = (bande: BandeWithDetails) => {
    setSelectedBande(bande);
    // Notify parent component about the selection
    onBandeSelect?.(bande);
  };

  /**
   * Handle going back to bandes list
   */
  const handleBackToBandes = () => {
    setSelectedBande(null);
  };

  // Load bandes when component mounts or ferme changes
  useEffect(() => {
    loadBandes(ferme.id);
  }, [ferme.id]);

  // Synchronize with parent's selectedBande
  useEffect(() => {
    setSelectedBande(parentSelectedBande || null);
  }, [parentSelectedBande]);

  // If a bande is selected, show the batiments view
  if (selectedBande) {
    return (
      <BatimentsView
        bande={selectedBande}
        ferme={ferme}
        onBackToBandes={handleBackToBandes}
        onBackToFermes={onBackToFermes}
        selectedBatiment={selectedBatiment}
        onBatimentSelect={onBatimentSelect}
        onBackToBatiments={onBackToBatiments}
        currentView={currentView}
      />
    );
  }

  // Main view - bandes list
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBackToFermes}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux fermes
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle bande
            </Button>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-4">
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={!dateRange?.from && !dateRange?.to}>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
            </div>
          </div>

          {/* Bandes List */}
          <div className="space-y-4">
            {isBandesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : bandes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Aucune bande</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Cette ferme n'a pas encore de bandes. Créez la première bande pour commencer.
                </p>
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-foreground hover:bg-foreground/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer la première bande
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Bande Cards - New Design */}
                {bandes.map((bande) => (
                  <div
                    key={bande.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
                    onClick={() => handleBandeSelect(bande)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-semibold text-base">
                          {bande.id}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                          Bande #{bande.id}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span>
                              Entrée: {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span>
                              {bande.batiments.length} bâtiment
                              {bande.batiments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {bande.notes && (
                            <div className="max-w-xs truncate">
                              <span>Notes: {bande.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Handle edit
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Handle delete
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {bandes.length > 0 && (
              <div className="mt-6">
                <DataPagination
                  currentPage={pagination.page}
                  totalPages={pagination.total_pages}
                  hasNext={pagination.has_next}
                  hasPrev={pagination.has_prev}
                  total={pagination.total}
                  perPage={pagination.limit}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </div>

          {/* Create Bande Modal */}
          {isCreateBandeDialogOpen && (
            <CreateBandeModal
              isOpen={isCreateBandeDialogOpen}
              onClose={() => setIsCreateBandeDialogOpen(false)}
              fermeId={ferme.id}
              fermeName={ferme.nom}
              personnel={personnel || []}
              poussins={poussins || []}
              availableBatiments={availableBatiments || []}
              onBandeCreated={handleBandeCreated}
            />
          )}
        </div>
      </main>
    </div>
  );
}
