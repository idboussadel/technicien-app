import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  BatimentWithDetails,
  Ferme,
  BandeWithDetails,
  SemaineWithDetails,
  SuiviQuotidienWithTotals,
  Soin,
} from "@/types";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface SemainesViewProps {
  batiment: BatimentWithDetails;
  bande: BandeWithDetails;
  ferme: Ferme;
  onBackToBatiments: () => void;
}

interface EditingCell {
  semaineId: number;
  age: number;
  field: keyof SuiviQuotidienWithTotals;
}

interface EditingPoids {
  semaineId: number;
}

/**
 * Page de gestion des semaines et du suivi quotidien pour un bâtiment
 *
 * Cette page affiche 8 semaines de suivi, chacune contenant 7 jours de données.
 * Les cellules peuvent être éditées en double-cliquant pour ajouter ou modifier les données.
 */
export default function SemainesView({
  batiment,
  bande,
  ferme,
  onBackToBatiments,
}: SemainesViewProps) {
  const [semaines, setSemaines] = useState<SemaineWithDetails[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [editingPoids, setEditingPoids] = useState<EditingPoids | null>(null);
  const [poidsValue, setPoidsValue] = useState<string>("");
  const [rowHeights, setRowHeights] = useState<Record<string, { row6: number; row7: number }>>({});
  const [editingNotes, setEditingNotes] = useState<boolean>(false);
  const [notesValue, setNotesValue] = useState<string>("");

  /**
   * Initialise les données du composant en récupérant les semaines et les soins
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Charger la liste des soins pour les combobox
        const soinsData = await invoke<Soin[]>("get_soins_list");
        setSoins(Array.isArray(soinsData) ? soinsData : []);

        if (batiment.id) {
          await loadSemaines(batiment.id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [batiment.id]);

  useEffect(() => {
    const measureRowHeights = () => {
      const newHeights: Record<string, { row6: number; row7: number }> = {};
      semaines.forEach((s) => {
        if (!s.id) return;
        const rows = document.querySelectorAll(`[data-semaine-id="${s.id}"] tbody tr`);
        if (rows.length >= 7) {
          const r6 = rows[5] as HTMLElement;
          const r7 = rows[6] as HTMLElement;
          newHeights[String(s.id)] = { row6: r6?.offsetHeight ?? 0, row7: r7?.offsetHeight ?? 0 };
        }
      });
      setRowHeights(newHeights);
    };

    const t = setTimeout(measureRowHeights, 0);
    window.addEventListener("resize", measureRowHeights);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measureRowHeights);
    };
  }, [semaines]);

  /**
   * Calcule les totaux pour un suivi spécifique en se basant sur les données brutes du backend
   */
  const calculateTotalsForSuivi = (
    allSemaines: SemaineWithDetails[],
    currentSemaineNumber: number,
    currentAge: number
  ) => {
    let deces_total = 0;
    let alimentation_total = 0;

    // Parcourir toutes les semaines jusqu'à la semaine actuelle
    for (const semaine of allSemaines) {
      if (semaine.numero_semaine < currentSemaineNumber) {
        // Additionner tous les décès et alimentation de cette semaine
        for (const suivi of semaine.suivi_quotidien) {
          deces_total += suivi.deces_par_jour || 0;
          alimentation_total += suivi.alimentation_par_jour || 0;
        }
      } else if (semaine.numero_semaine === currentSemaineNumber) {
        // Pour la semaine actuelle, additionner jusqu'à l'âge actuel (inclus)
        for (const suivi of semaine.suivi_quotidien) {
          if (suivi.age <= currentAge) {
            deces_total += suivi.deces_par_jour || 0;
            alimentation_total += suivi.alimentation_par_jour || 0;
          }
        }
        break;
      }
    }

    return { deces_total, alimentation_total };
  };

  /**
   * Charge les semaines d'un bâtiment avec leurs suivis quotidiens
   * Utilise la nouvelle commande qui gère automatiquement la création des données manquantes
   */
  const loadSemaines = async (batimentId: number) => {
    try {
      // Utiliser la nouvelle commande qui gère automatiquement la création des 8 semaines et leurs suivis
      const fullSemaines = await invoke<SemaineWithDetails[]>("get_full_semaines_by_batiment", {
        batimentId,
      });

      // Ajouter les totaux calculés à chaque suivi quotidien
      const semainesWithTotals = fullSemaines.map((semaine) => ({
        ...semaine,
        suivi_quotidien: semaine.suivi_quotidien.map((suivi) => {
          // Calculer les totaux pour ce suivi spécifique
          const totals = calculateTotalsForSuivi(fullSemaines, semaine.numero_semaine, suivi.age);
          return {
            ...suivi,
            deces_total: totals.deces_total,
            alimentation_total: totals.alimentation_total,
          };
        }),
      }));

      setSemaines(semainesWithTotals);
    } catch (error) {
      console.error("Erreur lors du chargement des semaines:", error);
    }
  };

  /**
   * Vérifie si le poids d'une semaine peut être édité selon les règles de progression
   */
  const canEditPoids = (semaineId: number): boolean => {
    const currentSemaine = semaines.find((s) => s.id === semaineId);
    if (!currentSemaine) return false;

    // Pour la première semaine, toujours autorisé
    if (currentSemaine.numero_semaine === 1) {
      return true;
    }

    // Pour les autres semaines, vérifier que la semaine précédente a un poids
    const previousSemaine = semaines.find(
      (s) => s.numero_semaine === currentSemaine.numero_semaine - 1
    );

    if (previousSemaine) {
      return previousSemaine.poids !== null && previousSemaine.poids !== undefined;
    }

    return false;
  };

  /**
   * Vérifie si une cellule peut être éditée selon les règles de progression
   */
  const canEditCell = (
    semaineId: number,
    age: number,
    field: keyof SuiviQuotidienWithTotals
  ): boolean => {
    // Les colonnes totales ne sont jamais éditables
    if (field === "deces_total" || field === "alimentation_total") {
      return false;
    }

    // Pour tous les autres champs, vérifier les règles de progression
    const currentSemaine = semaines.find((s) => s.id === semaineId);
    if (!currentSemaine) return false;

    const currentSuivi = currentSemaine.suivi_quotidien.find((s) => s.age === age);
    if (!currentSuivi) return false;

    // Pour le premier jour de la première semaine, toujours autorisé
    if (currentSemaine.numero_semaine === 1 && age === 1) {
      return true;
    }

    // Pour le premier jour d'une semaine (sauf la première semaine)
    if (age === 1 && currentSemaine.numero_semaine > 1) {
      // Vérifier que la dernière ligne de la semaine précédente contient des données
      const previousSemaine = semaines.find(
        (s) => s.numero_semaine === currentSemaine.numero_semaine - 1
      );
      if (previousSemaine) {
        const lastDayOfPreviousSemaine = previousSemaine.suivi_quotidien
          .slice()
          .sort((a, b) => b.age - a.age)[0]; // Dernier jour par âge

        // Vérifier si la dernière ligne a des données (au moins un champ EDITABLE rempli)
        const hasData =
          lastDayOfPreviousSemaine &&
          (lastDayOfPreviousSemaine.deces_par_jour !== null ||
            lastDayOfPreviousSemaine.alimentation_par_jour !== null ||
            lastDayOfPreviousSemaine.soins_id !== null ||
            lastDayOfPreviousSemaine.soins_quantite !== null ||
            lastDayOfPreviousSemaine.analyses !== null ||
            lastDayOfPreviousSemaine.remarques !== null);

        if (!hasData) {
          return false;
        }
      }
    }

    // Pour les autres jours de la semaine
    if (age > 1) {
      // Vérifier que la ligne précédente (âge - 1) contient des données
      const previousSuivi = currentSemaine.suivi_quotidien.find((s) => s.age === age - 1);
      if (previousSuivi) {
        const hasData =
          previousSuivi.deces_par_jour !== null ||
          previousSuivi.alimentation_par_jour !== null ||
          previousSuivi.soins_id !== null ||
          previousSuivi.soins_quantite !== null ||
          previousSuivi.analyses !== null ||
          previousSuivi.remarques !== null;

        if (!hasData) {
          return false;
        }
      }
    }

    return true;
  };

  /**
   * Gère le clic sur une cellule pour l'édition
   */
  const handleCellClick = (
    semaineId: number,
    age: number,
    field: keyof SuiviQuotidienWithTotals,
    currentValue: any,
    originalValue?: any
  ) => {
    // Vérifier si la cellule peut être éditée
    if (!canEditCell(semaineId, age, field)) {
      // Afficher un message d'erreur approprié
      if (field === "deces_total" || field === "alimentation_total") {
        toast.error("Cette colonne est calculée automatiquement et ne peut pas être modifiée");
      } else {
        toast.error("Veuillez d'abord remplir les données précédentes avant de continuer");
      }
      return;
    }

    setEditingCell({ semaineId, age, field });

    // For soins_id field, use the original ID value, not the displayed name
    if (field === "soins_id") {
      const actualValue = originalValue !== undefined ? originalValue : currentValue;
      setInputValue(actualValue ? actualValue.toString() : "");
      setComboboxOpen(true);
    } else {
      setInputValue(currentValue ? currentValue.toString() : "");
      setComboboxOpen(false);
    }
  };

  /**
   * Gère les changements dans le champ d'édition
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  /**
   * Gère la sélection dans le combobox des soins
   */
  const handleSoinSelect = (value: string) => {
    setInputValue(value);
    setComboboxOpen(false);
    handleSaveEdit(value); // Passer la valeur directement
  };

  /**
   * Gère les touches du clavier pour valider/annuler l'édition
   */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      resetEditingState();
    }
  };

  /**
   * Sauvegarde les modifications d'une cellule
   */
  const handleSaveEdit = async (overrideValue?: string) => {
    if (!editingCell) return;

    try {
      const { semaineId, field } = editingCell;
      const semaine = semaines.find((s) => s.id === semaineId);
      if (!semaine) return;

      const suivi = semaine.suivi_quotidien.find((s) => s.age === editingCell.age);
      if (!suivi) return;

      // Utiliser la valeur passée en paramètre ou celle de l'input
      const valueToSave = overrideValue !== undefined ? overrideValue : inputValue;

      // Utiliser la commande upsert pour créer ou mettre à jour
      await invoke("upsert_suivi_quotidien_field", {
        semaineId: semaine.id,
        age: suivi.age,
        field: field,
        value: valueToSave,
      });

      // Recharger les données pour afficher le nom du soin mis à jour
      if (batiment.id) {
        await loadSemaines(batiment.id);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      resetEditingState();
    }
  };

  /**
   * Gère la perte de focus pour sauvegarder
   */
  const handleInputBlur = () => {
    // Ne sauvegarder que si on est en mode édition
    if (editingCell) {
      handleSaveEdit();
    }
  };

  /**
   * Reset l'état d'édition et ferme le combobox
   */
  const resetEditingState = () => {
    setEditingCell(null);
    setInputValue("");
    setComboboxOpen(false);
  };

  /**
   * Gère le double-clic sur le poids d'une semaine
   */
  const handlePoidsDoubleClick = (semaine: SemaineWithDetails) => {
    // Vérifier si le poids peut être édité
    if (!canEditPoids(semaine.id!)) {
      toast.error("Veuillez d'abord renseigner le poids de la semaine précédente");
      return;
    }

    setEditingPoids({ semaineId: semaine.id! });
    setPoidsValue(semaine.poids?.toString() || "");
  };

  /**
   * Gère la sauvegarde du poids d'une semaine
   */
  const handleSavePoids = async () => {
    if (!editingPoids) return;

    try {
      const poidsNumber = poidsValue.trim() === "" ? null : parseFloat(poidsValue);

      await invoke("update_semaine_poids", {
        semaineId: editingPoids.semaineId,
        poids: poidsNumber,
      });

      // Recharger les données
      if (batiment.id) {
        await loadSemaines(batiment.id);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du poids:", error);
    } finally {
      setEditingPoids(null);
      setPoidsValue("");
    }
  };

  /**
   * Gère les touches du clavier pour le poids
   */
  const handlePoidsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSavePoids();
    } else if (e.key === "Escape") {
      setEditingPoids(null);
      setPoidsValue("");
    }
  };

  /**
   * Gère le double-clic sur les notes de la bande
   */
  const handleNotesDoubleClick = () => {
    setEditingNotes(true);
    setNotesValue(bande.notes || "");
  };

  /**
   * Gère la sauvegarde des notes de la bande
   */
  const handleSaveNotes = async () => {
    try {
      const newNotes = notesValue.trim() === "" ? null : notesValue;
      const currentNotes = bande.notes;

      // Ne sauvegarder que si les notes ont changé
      if (newNotes !== currentNotes) {
        const updateData = {
          id: bande.id,
          date_entree: bande.date_entree,
          ferme_id: bande.ferme_id,
          notes: newNotes,
        };

        await invoke("update_bande", {
          id: bande.id,
          bande: updateData,
        });

        // Mettre à jour les notes localement pour un affichage immédiat
        bande.notes = newNotes;

        toast.success("Notes mises à jour avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des notes:", error);
      toast.error("Erreur lors de la sauvegarde des notes");
    } finally {
      setEditingNotes(false);
      setNotesValue("");
    }
  };

  /**
   * Gère les touches du clavier pour les notes
   */
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveNotes();
    } else if (e.key === "Escape") {
      setEditingNotes(false);
      setNotesValue("");
    }
  };

  /**
   * Calcule les valeurs totales pour un suivi donné
   */
  const calculateTotals = (currentSemaine: SemaineWithDetails, currentAge: number) => {
    // Calculer décès total
    let deces_total = 0;
    let alimentation_total = 0;

    // Parcourir toutes les semaines jusqu'à la semaine actuelle
    for (const semaine of semaines) {
      if (semaine.numero_semaine < currentSemaine.numero_semaine) {
        // Additionner tous les décès de cette semaine
        for (const suivi of semaine.suivi_quotidien) {
          deces_total += suivi.deces_par_jour || 0;
          alimentation_total += suivi.alimentation_par_jour || 0;
        }
      } else if (semaine.numero_semaine === currentSemaine.numero_semaine) {
        // Pour la semaine actuelle, additionner jusqu'à l'âge actuel
        for (const suivi of semaine.suivi_quotidien) {
          if (suivi.age <= currentAge) {
            deces_total += suivi.deces_par_jour || 0;
            alimentation_total += suivi.alimentation_par_jour || 0;
          }
        }
        break;
      }
    }

    return { deces_total, alimentation_total };
  };

  /**
   * Génère la date pour un âge donné (approximative)
   */
  const getDateForAge = (age: number): string => {
    const entryDate = new Date(bande.date_entree);
    const targetDate = new Date(entryDate);
    targetDate.setDate(entryDate.getDate() + age - 1);
    return targetDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  /**
   * Calcule l'alimentation totale pour tous les suivis quotidiens
   */
  const calculateTotalAlimentation = (): number => {
    let total = 0;
    semaines.forEach((semaine) => {
      semaine.suivi_quotidien.forEach((suivi) => {
        // Convert sachets to kg by multiplying by 50
        total += (suivi.alimentation_par_jour || 0) * 50;
      });
    });
    return total;
  };

  /**
   * Calcule le poids final (le dernier poids renseigné dans les semaines)
   */
  const calculateFinalWeight = (): number | null => {
    // Trier les semaines par numéro décroissant et chercher le premier poids non null
    const sortedSemaines = [...semaines].sort((a, b) => b.numero_semaine - a.numero_semaine);
    for (const semaine of sortedSemaines) {
      if (semaine.poids !== null && semaine.poids !== undefined) {
        return semaine.poids;
      }
    }
    return null;
  };

  /**
   * Calcule le facteur de conversion (alimentation totale / poids final)
   */
  const calculateConversionFactor = (): number | null => {
    const totalAlimentation = calculateTotalAlimentation();
    const finalWeight = calculateFinalWeight();

    if (finalWeight && finalWeight > 0) {
      return totalAlimentation / finalWeight;
    }
    return null;
  };

  /**
   * Calcule le total des décès pour tous les suivis quotidiens
   */
  const calculateTotalDeaths = (): number => {
    let total = 0;
    semaines.forEach((semaine) => {
      semaine.suivi_quotidien.forEach((suivi) => {
        total += suivi.deces_par_jour || 0;
      });
    });
    return total;
  };

  /**
   * Calcule le pourcentage de mortalité (décès total / quantité initiale)
   */
  const calculateDeathPercentage = (): number => {
    const totalDeaths = calculateTotalDeaths();
    const initialQuantity = batiment.quantite || 0;

    if (initialQuantity > 0) {
      return (totalDeaths / initialQuantity) * 100;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des semaines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-18 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBackToBatiments}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux bâtiments
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Suivi Hebdomadaire - Bâtiment {batiment.numero_batiment}
              </h1>
              <p className="text-muted-foreground">
                Ferme {ferme.nom} • {batiment.quantite} {batiment.poussin_nom} • Responsable:{" "}
                {batiment.personnel_nom}
              </p>
            </div>
            <div className="w-[120px]"></div> {/* Spacer for symmetry */}
          </div>

          {/* Semaines Tables */}
          <div className="space-y-6">
            {semaines.map((semaine) => (
              <div key={semaine.id} className="flex items-end">
                <div className="flex-1 overflow-x-auto border border-slate-200 dark:border-slate-700">
                  <Table className="min-w-full" data-semaine-id={semaine.id}>
                    <TableHeader className="bg-slate-100 dark:bg-slate-800">
                      {/* Semaine X header row */}
                      <TableRow>
                        <TableHead
                          colSpan={10}
                          className="text-center font-bold text-slate-800 dark:text-slate-200 py-2 bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700"
                        >
                          Semaine {semaine.numero_semaine}
                        </TableHead>
                      </TableRow>
                      {/* Column headers row */}
                      <TableRow>
                        <TableHead className="w-[60px] text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Jour
                        </TableHead>
                        <TableHead className="w-[80px] text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Date
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Décès (Jour)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-center">Décès (Total)</div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Alimentation (Jour)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-center">
                            Alimentation (Total)
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Soins (Traitement)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Soins (Quantité)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Analyses
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          Remarques
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semaine.suivi_quotidien.map((suivi) => (
                        <TableRow key={suivi.age} className="last:border-b-0">
                          <TableCell className="font-medium text-center text-gray-800 dark:text-gray-200 border-r border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                            {suivi.age}
                          </TableCell>
                          <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                            {getDateForAge(suivi.age)}
                          </TableCell>

                          {/* Editable Cells */}
                          {[
                            "deces_par_jour",
                            "deces_total",
                            "alimentation_par_jour",
                            "alimentation_total",
                            "soins_id",
                            "soins_quantite",
                            "analyses",
                            "remarques",
                          ].map((field, index, array) => {
                            const isEditing =
                              editingCell?.semaineId === semaine.id &&
                              editingCell?.field === field &&
                              editingCell?.age === suivi.age;

                            const fieldKey = field as keyof SuiviQuotidienWithTotals;
                            let value = suivi[fieldKey];
                            const isLastCellInRow = index === array.length - 1;

                            // Pour soins_id, garder la valeur originale et préparer l'affichage
                            const originalValue = suivi[fieldKey];
                            let displayValue = value;

                            // Pour les colonnes totales, calculer les valeurs seulement si la ligne a des données par jour
                            if (field === "deces_total" || field === "alimentation_total") {
                              const hasDecesData =
                                suivi.deces_par_jour !== null && suivi.deces_par_jour !== undefined;
                              const hasAlimentationData =
                                suivi.alimentation_par_jour !== null &&
                                suivi.alimentation_par_jour !== undefined;

                              // Afficher le total seulement si la ligne correspondante a des données
                              if (
                                (field === "deces_total" && hasDecesData) ||
                                (field === "alimentation_total" && hasAlimentationData)
                              ) {
                                const calculatedTotals = calculateTotals(semaine, suivi.age);
                                displayValue =
                                  field === "deces_total"
                                    ? calculatedTotals.deces_total
                                    : calculatedTotals.alimentation_total;
                              } else {
                                displayValue = null; // Pas de total si pas de données par jour
                              }
                            } else if (field === "soins_id") {
                              // Utiliser directement soins_nom au lieu de chercher dans la liste
                              displayValue = suivi.soins_nom || (value ? "Soin inconnu" : "");
                            }

                            const isEditable = canEditCell(semaine.id!, suivi.age, fieldKey);
                            const isTotalColumn =
                              fieldKey === "deces_total" || fieldKey === "alimentation_total";

                            return (
                              <TableCell
                                key={field}
                                className={`text-center text-gray-700 dark:text-gray-300 p-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-white ${
                                  !isLastCellInRow ? "border-r" : ""
                                }`}
                                onDoubleClick={() => {
                                  if (isEditable) {
                                    handleCellClick(
                                      semaine.id!,
                                      suivi.age,
                                      fieldKey,
                                      displayValue,
                                      originalValue
                                    );
                                  }
                                }}
                              >
                                {isEditing ? (
                                  field === "soins_id" ? (
                                    <Popover
                                      open={comboboxOpen}
                                      onOpenChange={(open) => {
                                        setComboboxOpen(open);
                                        // Si le popover se ferme et qu'on n'a pas sélectionné de valeur, reset l'état d'édition
                                        if (!open) {
                                          setTimeout(() => {
                                            resetEditingState();
                                          }, 100);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={comboboxOpen}
                                          className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0 min-h-0 justify-between"
                                          style={{ boxShadow: "none" }}
                                        >
                                          {inputValue && inputValue !== ""
                                            ? soins.find(
                                                (soin) => soin.id.toString() === inputValue
                                              )?.nom || "Soin introuvable"
                                            : "Choisir un soin..."}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                          <CommandInput placeholder="Rechercher un soin..." />
                                          <CommandList>
                                            <CommandEmpty>Aucun soin trouvé.</CommandEmpty>
                                            <CommandGroup>
                                              {Array.isArray(soins) &&
                                                soins.map((soin) => (
                                                  <CommandItem
                                                    key={soin.id}
                                                    value={soin.nom}
                                                    onSelect={() =>
                                                      handleSoinSelect(soin.id.toString())
                                                    }
                                                  >
                                                    <Check
                                                      className={cn(
                                                        "mr-2 h-4 w-4",
                                                        inputValue === soin.id.toString()
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                      )}
                                                    />
                                                    {soin.nom}
                                                  </CommandItem>
                                                ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <Input
                                      type={
                                        field.includes("deces") || field.includes("alimentation")
                                          ? "number"
                                          : "text"
                                      }
                                      value={inputValue}
                                      onChange={handleInputChange}
                                      onBlur={handleInputBlur}
                                      onKeyDown={handleInputKeyDown}
                                      className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0"
                                      style={{ boxShadow: "none" }}
                                      autoFocus
                                    />
                                  )
                                ) : (
                                  <div
                                    className={`px-4 py-2 h-full w-full flex items-center justify-center ${
                                      isEditable
                                        ? "cursor-pointer hover:bg-gray-50"
                                        : isTotalColumn
                                        ? "cursor-default"
                                        : "cursor-not-allowed"
                                    }`}
                                    title={
                                      isTotalColumn
                                        ? "Valeur calculée automatiquement"
                                        : !isEditable
                                        ? "Veuillez d'abord remplir les données précédentes"
                                        : ""
                                    }
                                  >
                                    {(() => {
                                      // Pour les colonnes totales, ne rien afficher si la valeur est 0
                                      if (
                                        isTotalColumn &&
                                        (displayValue === 0 ||
                                          displayValue === null ||
                                          displayValue === undefined)
                                      ) {
                                        return "-";
                                      }

                                      // Pour les autres colonnes, affichage normal
                                      if (
                                        displayValue !== null &&
                                        displayValue !== undefined &&
                                        displayValue !== ""
                                      ) {
                                        return displayValue;
                                      }

                                      return "-";
                                    })()}
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Separate 2-cell Poids table positioned beside main table */}
                <div className="flex flex-col justify-end">
                  {(() => {
                    const h = semaine.id ? rowHeights[String(semaine.id)] : undefined;
                    const h6 = Math.max(h?.row6 ?? 0, 53);
                    const h7 = Math.max(h?.row7 ?? 0, 53);
                    return (
                      <>
                        <div
                          className="w-32 px-4 py-2 text-center font-medium text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center border-l-0"
                          style={{ minHeight: 54, height: h6 + 1 }}
                        >
                          Poids
                        </div>
                        <div
                          className="w-32 text-center text-gray-700 dark:text-gray-300 bg-white dark:bg-white border border-t-0 border-slate-200 dark:border-slate-700 border-l-0 border-b-2 flex items-center justify-center"
                          style={{ minHeight: 54, height: h7 + 1 }}
                        >
                          {editingPoids?.semaineId === semaine.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={poidsValue}
                              onChange={(e) => setPoidsValue(e.target.value)}
                              onKeyDown={handlePoidsKeyDown}
                              onBlur={() => {
                                if (editingPoids) {
                                  handleSavePoids();
                                }
                              }}
                              className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0 min-h-0"
                              style={{ boxShadow: "none" }}
                              autoFocus
                            />
                          ) : (
                            <div
                              className={`w-full h-full px-4 py-2 transition-colors flex items-center justify-center ${
                                canEditPoids(semaine.id!)
                                  ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-100"
                                  : "cursor-not-allowed"
                              }`}
                              onDoubleClick={() => handlePoidsDoubleClick(semaine)}
                              title={
                                canEditPoids(semaine.id!)
                                  ? "Double-cliquez pour modifier"
                                  : "Veuillez d'abord renseigner le poids de la semaine précédente"
                              }
                            >
                              {semaine.poids !== null ? `${semaine.poids}` : "-"}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Tableau des résultats */}
          <div className="mt-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 border-b border-slate-200 dark:border-slate-600">
                <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                  Tableau des Résultats
                </h2>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Alimentation Totale
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Poids Final
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Facteur de Conversion
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Décès Total
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Pourcentage de Mortalité
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300">
                      Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {/* Alimentation Totale */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const totalAlimentation = calculateTotalAlimentation();
                          if (totalAlimentation > 0) {
                            const totalSachets = totalAlimentation / 50;
                            return `${totalAlimentation.toFixed(2)} kg ( ${totalSachets} sacs )`;
                          }
                          return "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Poids Final */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const finalWeight = calculateFinalWeight();
                          return finalWeight !== null ? `${finalWeight} kg` : "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Facteur de Conversion */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const conversionFactor = calculateConversionFactor();
                          const totalAlimentation = calculateTotalAlimentation();
                          const finalWeight = calculateFinalWeight();

                          if (
                            conversionFactor !== null &&
                            totalAlimentation > 0 &&
                            finalWeight !== null
                          ) {
                            return (
                              <div className="flex items-center justify-center gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-mono text-gray-700 leading-none">
                                    {totalAlimentation.toFixed(2)}
                                  </span>
                                  <div className="w-12 border-t border-gray-400 my-0.5"></div>
                                  <span className="text-sm font-mono text-gray-700 leading-none">
                                    {finalWeight}
                                  </span>
                                </div>
                                <span className="text-gray-600 font-medium">=</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {conversionFactor.toFixed(3)}
                                </span>
                              </div>
                            );
                          }
                          return "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Décès Total */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const totalDeaths = calculateTotalDeaths();
                          return totalDeaths > 0 ? totalDeaths : "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Pourcentage de Mortalité */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const deathPercentage = calculateDeathPercentage();
                          const totalDeaths = calculateTotalDeaths();

                          if (deathPercentage > 0 && totalDeaths > 0) {
                            return (
                              <div className="flex items-center justify-center gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-mono text-gray-700 leading-none">
                                    {totalDeaths}
                                  </span>
                                  <div className="w-12 border-t border-gray-400 my-0.5"></div>
                                  <span className="text-sm font-mono text-gray-700 leading-none">
                                    {batiment.quantite}
                                  </span>
                                </div>
                                <span className="text-gray-500">×</span>
                                <span className="text-sm font-mono text-gray-700">100</span>
                                <span className="text-gray-600 font-medium">=</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {deathPercentage.toFixed(2)}%
                                </span>
                              </div>
                            );
                          }
                          return "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Notes (Editable) */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 bg-white dark:bg-white p-0">
                      {editingNotes ? (
                        <Input
                          type="text"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          onBlur={() => {
                            if (editingNotes) {
                              handleSaveNotes();
                            }
                          }}
                          onKeyDown={handleNotesKeyDown}
                          className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0"
                          style={{ boxShadow: "none" }}
                          autoFocus
                          placeholder="Ajouter des notes..."
                        />
                      ) : (
                        <div
                          className="px-4 py-2 h-full w-full cursor-pointer hover:bg-gray-50 flex items-center justify-center min-h-[53px]"
                          onDoubleClick={handleNotesDoubleClick}
                          title="Double-cliquez pour modifier les notes"
                        >
                          {bande.notes || "Double-cliquez pour ajouter des notes"}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
