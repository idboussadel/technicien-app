import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  ChevronDown,
  Download,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import {
  BatimentWithDetails,
  Ferme,
  BandeWithDetails,
  SemaineWithDetails,
  SuiviQuotidienWithTotals,
  Soin,
  Maladie,
} from "@/types";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { font1, font2 } from "@/assets/fonts/font-arabic";

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
  const [batimentMaladies, setBatimentMaladies] = useState<Maladie[]>([]);
  const [isMaladieModalOpen, setIsMaladieModalOpen] = useState<boolean>(false);
  const [maladies, setMaladies] = useState<Maladie[]>([]);
  const [selectedMaladieIds, setSelectedMaladieIds] = useState<string[]>([]);
  const [applyToSameBande, setApplyToSameBande] = useState<boolean>(false);
  const [maladieComboboxOpen, setMaladieComboboxOpen] = useState<boolean>(false);

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
          // Charger semaines et maladies en une seule fois
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
      // Utiliser la commande qui retourne semaines + maladies
      const result = await invoke<{ semaines: SemaineWithDetails[]; maladies: Maladie[] }>(
        "get_full_semaines_by_batiment",
        {
          batimentId,
        }
      );

      // Ajouter les totaux calculés à chaque suivi quotidien
      const semainesWithTotals = (result?.semaines ?? []).map((semaine) => ({
        ...semaine,
        suivi_quotidien: semaine.suivi_quotidien.map((suivi) => {
          // Calculer les totaux pour ce suivi spécifique
          const totals = calculateTotalsForSuivi(
            result?.semaines ?? [],
            semaine.numero_semaine,
            suivi.age
          );
          return {
            ...suivi,
            deces_total: totals.deces_total,
            alimentation_total: totals.alimentation_total,
          };
        }),
      }));

      setSemaines(semainesWithTotals);
      setBatimentMaladies(Array.isArray(result?.maladies) ? result.maladies : []);
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

      // Validation pour les champs numériques qui ne peuvent pas être négatifs
      if (
        field === "deces_par_jour" ||
        field === "alimentation_par_jour" ||
        field === "soins_quantite"
      ) {
        const numericValue = parseFloat(valueToSave);
        if (!isNaN(numericValue) && numericValue < 0) {
          toast.error("Les valeurs négatives ne sont pas autorisées pour ce champ");
          return;
        }
      }

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

      // Validation pour le poids - ne peut pas être négatif
      if (poidsNumber !== null && poidsNumber < 0) {
        toast.error("Le poids ne peut pas être négatif");
        return;
      }

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
          numero_bande: bande.numero_bande,
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

  // Maladies modal helpers
  const openMaladieModal = async () => {
    try {
      const list = await invoke<Maladie[]>("get_maladies_list");
      // Filter out maladies already assigned to this bâtiment
      const availableMaladies = Array.isArray(list)
        ? list.filter((maladie) => !batimentMaladies.some((bm) => bm.id === maladie.id))
        : [];
      setMaladies(availableMaladies);
      setIsMaladieModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les maladies");
    }
  };

  const toggleSelectedMaladie = (id: number) => {
    const idStr = id.toString();
    setSelectedMaladieIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  const submitMaladies = async () => {
    if (selectedMaladieIds.length === 0) {
      toast.error("Veuillez sélectionner au moins une maladie");
      return;
    }
    try {
      if (applyToSameBande) {
        for (const idStr of selectedMaladieIds) {
          await invoke("add_maladie_to_bande_batiments", {
            bandeId: bande.id,
            maladieId: parseInt(idStr, 10),
          });
        }
      } else {
        for (const idStr of selectedMaladieIds) {
          await invoke("add_maladie_to_batiment", {
            batimentId: batiment.id,
            maladieId: parseInt(idStr, 10),
          });
        }
      }
      toast.success("Maladie(s) ajoutée(s) avec succès");
      setIsMaladieModalOpen(false);
      setSelectedMaladieIds([]);
      setApplyToSameBande(false);

      // Refresh main data to show new maladies immediately
      if (batiment.id) {
        await loadSemaines(batiment.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'ajout des maladies");
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
   * Formate un nombre selon les règles spécifiées :
   * - Sans décimales si la valeur est un entier (ex. 15.0 → 15)
   * - Avec une seule décimale si la valeur contient un chiffre après la virgule (ex. 15.2 → 15.2)
   */
  const formatNumber = (value: number): string => {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(1);
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

  /**
   * Génère un PDF du suivi hebdomadaire avec le layout spécial pour la colonne poids
   */
  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Configuration des marges et largeurs
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;

    let yPosition = margin;

    // Ajouter le tableau de synthèse (sans en-tête) dans l'ordre demandé
    const summaryData = [
      ["Ferme", ferme.nom || "-"],
      ["Bâtiment", batiment.numero_batiment?.toString() || "-"],
      [
        "Date d'Entrée",
        new Date(bande.date_entree).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      ],
      ["Personnel", batiment.personnel_nom || "-"],
      ["Poussin", batiment.poussin_nom || "-"],
      ["Quantité", batiment.quantite?.toString() || "-"],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "left",
        valign: "middle",
        font: "helvetica",
        textColor: [60, 60, 60],
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: {
          cellWidth: 50,
          fillColor: [220, 220, 220], // Same as Semaine header background
          halign: "left",
          fontStyle: "bold",
          textColor: [0, 0, 0], // Dark text like header
        }, // Labels column with Semaine header styling
        1: { cellWidth: 50, halign: "left" }, // Values column
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // Keep white, no alternating
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5; // Space after summary table

    // Parcourir chaque semaine
    semaines.forEach((semaine) => {
      // Vérifier si on a assez de place sur la page
      if (yPosition + 80 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Préparer les données pour la table principale
      const tableData = semaine.suivi_quotidien.map((suivi, rowIndex) => {
        const row = [
          suivi.age.toString(),
          getDateForAge(suivi.age),
          suivi.deces_par_jour?.toString() || "-",
          // Pour deces_total, calculer seulement si deces_par_jour existe
          suivi.deces_par_jour !== null &&
          suivi.deces_par_jour !== undefined &&
          suivi.deces_total &&
          suivi.deces_total > 0
            ? suivi.deces_total.toString()
            : "-",
          suivi.alimentation_par_jour?.toString() || "-",
          // Pour alimentation_total, calculer seulement si alimentation_par_jour existe
          suivi.alimentation_par_jour !== null &&
          suivi.alimentation_par_jour !== undefined &&
          suivi.alimentation_total &&
          suivi.alimentation_total > 0
            ? suivi.alimentation_total.toString()
            : "-",
          suivi.soins_nom || "-",
          suivi.soins_quantite && suivi.soins_unit
            ? `${suivi.soins_quantite} ${suivi.soins_unit === "l" ? "L" : suivi.soins_unit}`
            : suivi.soins_quantite?.toString() || "-",
          suivi.analyses || "-",
          suivi.remarques || "-",
        ];

        // Ajouter la colonne poids pour les lignes 6 et 7
        if (rowIndex === 5) {
          row.push(""); // Empty cell instead of "Poids" text
        } else if (rowIndex === 6) {
          row.push(
            semaine.poids !== null && semaine.poids !== undefined ? `${semaine.poids} kg` : "-"
          ); // Value for the weight
        } else {
          row.push(""); // Cellule vide pour les autres lignes
        }

        return row;
      });

      // Headers avec titre de semaine et colonnes
      const headers = [
        [
          {
            content: `Semaine ${semaine.numero_semaine}`,
            colSpan: 10,
            styles: {
              halign: "center" as const,
              // Fond plus sombre pour la barre « Semaine X » afin de contraster avec la ligne d'entêtes
              fillColor: [220, 220, 220] as [number, number, number],
              textColor: [0, 0, 0] as [number, number, number],
              fontStyle: "bold" as const,
            },
          },
          "",
        ],
        [
          "Jour",
          "Date",
          "Décès (Jour)",
          "Décès (Total)",
          "Alimentation (Jour)",
          "Alimentation (Total)",
          "Soins (Traitement)",
          "Soins (Quantité)",
          "Analyses",
          "Remarques",
          "",
        ],
      ];

      // Créer la table avec autoTable
      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [180, 180, 180],
          lineWidth: 0.3,
          halign: "center",
          valign: "middle",
          font: "helvetica",
          textColor: [60, 60, 60],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [235, 235, 235],
          textColor: [60, 60, 60],
          fontStyle: "normal",
          fontSize: 7,
          cellPadding: 1.5,
          halign: "center",
          lineWidth: 0.3,
          lineColor: [180, 180, 180],
        },
        bodyStyles: {
          fillColor: [255, 255, 255], // bg-white
          textColor: [0, 0, 0], // black text as requested
          fontSize: 7,
          cellPadding: 1.5,
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255], // Keep white, no alternating
        },
        columnStyles: {
          0: { cellWidth: 8 }, // Jour
          1: { cellWidth: 12 }, // Date
          2: { cellWidth: 15 }, // Décès (Jour)
          3: { cellWidth: 15 }, // Décès (Total)
          4: { cellWidth: 18 }, // Alimentation (Jour)
          5: { cellWidth: 20 }, // Alimentation (Total)
          6: { cellWidth: 22 }, // Soins (Traitement)
          7: { cellWidth: 16 }, // Soins (Quantité)
          8: { cellWidth: 15 }, // Analyses
          9: { cellWidth: 25 }, // Remarques
          10: { cellWidth: 15 }, // Poids
        },
        tableWidth: "wrap",
        didParseCell: (data) => {
          const col = data.column.index;
          const section = (data as any).section as "head" | "body" | "foot";
          const rowIndex = data.row.index;
          const lastCol = data.table.columns.length - 1;

          // PDF: make the two top cells of the last column (in the header rows)
          // white and remove top/right/bottom borders; keep a thin left separator
          if (section === "head" && col === lastCol && (rowIndex === 0 || rowIndex === 1)) {
            data.cell.styles.fillColor = [255, 255, 255];
            (data.cell.styles as any).lineWidth = { top: 0, right: 0, bottom: 0, left: 0.3 } as any;
          }

          if (col === 10) {
            if (section === "body") {
              // Start by hiding top/right/bottom for all Poids BODY cells, keep left separator
              const base = { top: 0, right: 0, bottom: 0, left: 0.3 } as any;
              data.cell.styles.lineWidth = base;

              if (rowIndex === 5) {
                // Visible box for the "Poids" label row
                data.cell.styles.lineWidth = {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any;
              } else if (rowIndex === 6) {
                // Value row: include top border to visually match adjacent cells
                data.cell.styles.lineWidth = {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any;
              }
            }
          }
        },
        willDrawCell: (data) => {
          const columnIndex = data.column.index;
          const rowIndex = data.row.index;
          const section = (data as any).section as "head" | "body" | "foot";
          if (section === "body" && columnIndex === 10 && rowIndex === 5) {
            const cell = data.cell;
            // Fond gris de la cellule "Poids" (ligne 6) sans toucher aux bordures
            const inset = 0.4;
            doc.setFillColor(235, 235, 235);
            doc.rect(
              cell.x + inset,
              cell.y + inset,
              cell.width - 2 * inset,
              cell.height - 2 * inset,
              "F"
            );
          }
        },
      });

      // Ne pas redessiner les traits verticaux; les styles ci-dessus contrôlent les côtés visibles

      yPosition = (doc as any).lastAutoTable.finalY + 5; // Small space between tables
    });

    // Ajouter le tableau des résultats (collé au tableau précédent)
    // Supprimer l'espace de 5 ajouté après la dernière semaine
    yPosition = Math.max(margin, yPosition - 5);
    if (yPosition + 40 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Préparer les données du tableau des résultats
    const totalAlimentation = calculateTotalAlimentation();
    const finalWeight = calculateFinalWeight();
    const conversionFactor = calculateConversionFactor();
    const totalDeaths = calculateTotalDeaths();
    const deathPercentage = calculateDeathPercentage();

    const resultsData = [
      [
        totalAlimentation > 0
          ? `${formatNumber(totalAlimentation)} kg (${formatNumber(totalAlimentation / 50)} sacs)`
          : "-",
        finalWeight !== null ? `${finalWeight} kg` : "-",
        conversionFactor !== null ? formatNumber(conversionFactor) : "-",
        totalDeaths > 0 ? totalDeaths.toString() : "-",
        deathPercentage > 0 ? `${deathPercentage.toFixed(2)}%` : "-",
        bande.notes || "-",
      ],
    ];

    const resultsHead = [
      [
        {
          content: "Tableau des Résultats",
          colSpan: 6,
          styles: {
            halign: "center" as const,
            fillColor: [220, 220, 220] as [number, number, number],
            textColor: [50, 50, 50] as [number, number, number],
            fontStyle: "bold" as const,
          },
        },
      ],
      [
        "Alimentation Totale",
        "Poids Final",
        "Facteur de Conversion",
        "Décès Total",
        "Pourcentage de Mortalité",
        "Notes",
      ],
    ];

    autoTable(doc, {
      head: resultsHead,
      body: resultsData,
      startY: yPosition + 6, // petit espace au-dessus du tableau des résultats
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "center",
        valign: "middle",
        font: "helvetica",
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [235, 235, 235],
        textColor: [0, 0, 0],
        fontStyle: "normal",
        fontSize: 7,
        cellPadding: 1.5,
        halign: "center",
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
      },
      bodyStyles: {
        fillColor: [255, 255, 255], // bg-white
        textColor: [60, 60, 60],
        fontSize: 7,
        cellPadding: 1.5,
      },
    });

    // Sauvegarder le PDF
    const fileName = `suivi_hebdomadaire_batiment_${batiment.numero_batiment}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
    toast.success("PDF généré avec succès");
  };

  /**
   * Génère un PDF compact du suivi hebdomadaire avec 2 semaines côte à côte
   */
  const generateCompactPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Configuration des marges et largeurs
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 6; // Réduire les marges
    const tableWidth = (pageWidth - 2 * margin - 2) / 2; // 2 tables side by side with small gap

    let yPosition = margin;

    // Ajouter le tableau de synthèse (sans en-tête) dans l'ordre demandé
    const summaryData = [
      ["Ferme", ferme.nom || "-"],
      ["Bâtiment", batiment.numero_batiment?.toString() || "-"],
      [
        "Date d'Entrée",
        new Date(bande.date_entree).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      ],
      ["Personnel", batiment.personnel_nom || "-"],
      ["Poussin", batiment.poussin_nom || "-"],
      ["Quantité", batiment.quantite?.toString() || "-"],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "left",
        valign: "middle",
        font: "helvetica",
        textColor: [60, 60, 60],
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: {
          cellWidth: 45,
          fillColor: [220, 220, 220],
          halign: "left",
          fontStyle: "bold",
          textColor: [0, 0, 0],
        },
        1: { cellWidth: 45, halign: "left" },
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 4;

    // Grouper les semaines par paires pour l'affichage côte à côte
    const semainesPairs = [];
    for (let i = 0; i < semaines.length; i += 2) {
      semainesPairs.push(semaines.slice(i, i + 2));
    }

    // Parcourir chaque paire de semaines
    semainesPairs.forEach((semainesPair) => {
      // Vérifier si on a assez de place sur la page
      if (yPosition + 70 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Position X pour chaque table (gauche et droite)
      const leftTableX = margin;
      const rightTableX = margin + tableWidth + 2;

      semainesPair.forEach((semaine, tableIndex) => {
        const tableX = tableIndex === 0 ? leftTableX : rightTableX;

        // Préparer les données pour la table
        const tableData = semaine.suivi_quotidien.map((suivi, rowIndex) => {
          const row = [
            suivi.age.toString(),
            getDateForAge(suivi.age),
            suivi.deces_par_jour?.toString() || "-",
            suivi.deces_par_jour !== null &&
            suivi.deces_par_jour !== undefined &&
            suivi.deces_total &&
            suivi.deces_total > 0
              ? suivi.deces_total.toString()
              : "-",
            suivi.alimentation_par_jour?.toString() || "-",
            suivi.alimentation_par_jour !== null &&
            suivi.alimentation_par_jour !== undefined &&
            suivi.alimentation_total &&
            suivi.alimentation_total > 0
              ? suivi.alimentation_total.toString()
              : "-",
            suivi.soins_nom || "-",
            suivi.soins_quantite && suivi.soins_unit
              ? `${suivi.soins_quantite} ${suivi.soins_unit === "l" ? "L" : suivi.soins_unit}`
              : suivi.soins_quantite?.toString() || "-",
            suivi.analyses || "-",
            suivi.remarques || "-",
          ];

          // Pour les lignes 6 et 7 (index 5 et 6), ajouter la colonne poids
          if (rowIndex === 5) {
            row.push("Poids"); // Label pour la ligne 6 (keep this one!)
          } else if (rowIndex === 6) {
            row.push(
              semaine.poids !== null && semaine.poids !== undefined ? `${semaine.poids} kg` : "-"
            ); // Valeur pour la ligne 7
          } else {
            row.push(""); // Cellule vide pour les autres lignes
          }

          return row;
        });

        // Headers avec titre de semaine et colonnes compactes (3-row structure like Arabic)
        const headers = [
          [
            {
              content: `Semaine ${semaine.numero_semaine}`,
              colSpan: 10, // Span from Jour to Remarques (columns 0-9)
              styles: {
                halign: "center" as const,
                fillColor: [220, 220, 220] as [number, number, number],
                textColor: [0, 0, 0] as [number, number, number],
                fontStyle: "bold" as const,
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            "", // Empty cell for Poids column
          ],
          [
            {
              content: "Jour",
              rowSpan: 2, // Span 2 rows
            },
            {
              content: "Date",
              rowSpan: 2, // Span 2 rows
            },
            {
              content: "Décès",
              colSpan: 2, // Span over death columns (2-3)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "Alimentation",
              colSpan: 2, // Span over nutrition columns (4-5)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "Soins",
              colSpan: 2, // Span over treatment columns (6-7)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "Analyses",
              rowSpan: 2, // Span 2 rows
            },
            {
              content: "Remarques",
              rowSpan: 2, // Span 2 rows
            },
            "", // Empty cell for Poids column
          ],
          [
            "Jour", // Daily (for deaths)
            "Total", // Total (for deaths)
            "Jour", // Daily (for nutrition)
            "Total", // Total (for nutrition)
            "Traitement", // Treatment name
            "Quantité", // Treatment quantity
          ],
        ];

        // Créer la table compacte
        autoTable(doc, {
          head: headers,
          body: tableData,
          startY: yPosition,
          margin: { left: tableX, right: pageWidth - tableX - tableWidth },
          tableWidth: tableWidth,
          theme: "grid",
          styles: {
            fontSize: 6,
            cellPadding: 1,
            lineColor: [180, 180, 180],
            lineWidth: 0.3,
            halign: "center",
            valign: "middle",
            font: "helvetica",
            textColor: [60, 60, 60],
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [235, 235, 235],
            textColor: [60, 60, 60],
            fontStyle: "normal",
            fontSize: 5, // Smaller font to prevent wrapping
            cellPadding: 0.5, // Smaller padding to fit text
            halign: "center",
            lineWidth: 0.3,
            lineColor: [180, 180, 180],
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 6,
            cellPadding: 1,
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255],
          },
          columnStyles: {
            0: { cellWidth: 5 }, // Jour
            1: { cellWidth: 8 }, // Date
            2: { cellWidth: 7 }, // Décès (Jour) - 2 digits max
            3: { cellWidth: 7 }, // Décès (Total) - 2 digits max
            4: { cellWidth: 8 }, // Alim (Jour) - 2 digits max
            5: { cellWidth: 8 }, // Alim (Total) - 2 digits max
            6: { cellWidth: 14 }, // Soins (Traitement)
            7: { cellWidth: 8 }, // Quantité - prevent wrapping
            8: { cellWidth: 9 }, // Analyses - prevent wrapping
            9: { cellWidth: 11 }, // Remarques
            10: { cellWidth: 13 }, // Poids - wider for better readability
          },
          didParseCell: (data) => {
            const col = data.column.index;
            const section = (data as any).section as "head" | "body" | "foot";
            const rowIndex = data.row.index;

            // Handle header styling - weight column (col 10) gets special treatment
            if (section === "head") {
              if (col === 10) {
                // Weight column (column 10) in all header rows - white background, but keep left border for continuity
                data.cell.styles.fillColor = [255, 255, 255]; // White background
                data.cell.styles.lineWidth = {
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0.3, // Keep left border to connect with Remarques cell
                } as any;
              } else {
                // All other columns in all header rows - gray background with borders
                if (rowIndex === 0) {
                  data.cell.styles.fillColor = [220, 220, 220]; // Week header gray
                } else {
                  data.cell.styles.fillColor = [235, 235, 235]; // All other header rows gray
                }
                data.cell.styles.lineWidth = {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any;
              }
            }

            // For body cells, handle weight column special styling
            if (section === "body") {
              if (col === 10) {
                if (rowIndex === 5 || rowIndex === 6) {
                  // Weight label and value rows get full borders
                  data.cell.styles.lineWidth = {
                    top: 0.3,
                    right: 0.3,
                    bottom: 0.3,
                    left: 0.3,
                  } as any;
                } else {
                  // All other rows in weight column get NO borders and white background
                  data.cell.styles.lineWidth = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0.3, // Keep left border for continuity
                  } as any;
                  data.cell.styles.fillColor = [255, 255, 255]; // Force white background
                  data.cell.styles.textColor = [255, 255, 255]; // Hide text in non-weight rows
                }
              }
            }
          },
          willDrawCell: (data) => {
            const columnIndex = data.column.index;
            const rowIndex = data.row.index;
            const section = (data as any).section as "head" | "body" | "foot";

            // Weight column (column 10) - draw background for weight label row only
            if (section === "body" && columnIndex === 10 && rowIndex === 5) {
              const cell = data.cell;
              const inset = 0.4;
              doc.setFillColor(235, 235, 235); // Gray background for weight label
              doc.rect(
                cell.x + inset,
                cell.y + inset,
                cell.width - 2 * inset,
                cell.height - 2 * inset,
                "F"
              );
            }

            // Force white background for all other rows in weight column
            if (section === "body" && columnIndex === 10 && rowIndex !== 5 && rowIndex !== 6) {
              const cell = data.cell;
              doc.setFillColor(255, 255, 255); // White background
              doc.rect(cell.x, cell.y, cell.width, cell.height, "F");
            }

            // Force white background for weight column header cells (all rows)
            if (section === "head" && columnIndex === 10) {
              const cell = data.cell;
              doc.setFillColor(255, 255, 255); // White background
              doc.rect(cell.x, cell.y, cell.width, cell.height, "F");
            }
          },
        });
      });

      // Passer à la ligne suivante après chaque paire de semaines
      yPosition = (doc as any).lastAutoTable.finalY + 6;
    });

    // Ajouter le tableau des résultats
    if (yPosition + 35 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    const totalAlimentation = calculateTotalAlimentation();
    const finalWeight = calculateFinalWeight();
    const conversionFactor = calculateConversionFactor();
    const totalDeaths = calculateTotalDeaths();
    const deathPercentage = calculateDeathPercentage();

    const resultsData = [
      [
        totalAlimentation > 0
          ? `${formatNumber(totalAlimentation)} kg (${formatNumber(totalAlimentation / 50)} sacs)`
          : "-",
        finalWeight !== null ? `${finalWeight} kg` : "-",
        conversionFactor !== null ? formatNumber(conversionFactor) : "-",
        totalDeaths > 0 ? totalDeaths.toString() : "-",
        deathPercentage > 0 ? `${deathPercentage.toFixed(2)}%` : "-",
        bande.notes || "-",
      ],
    ];

    const resultsHead = [
      [
        {
          content: "Tableau des Résultats",
          colSpan: 6,
          styles: {
            halign: "center" as const,
            fillColor: [220, 220, 220] as [number, number, number],
            textColor: [50, 50, 50] as [number, number, number],
            fontStyle: "bold" as const,
          },
        },
      ],
      [
        "Alimentation Totale",
        "Poids Final",
        "Facteur de Conversion",
        "Décès Total",
        "Pourcentage de Mortalité",
        "Notes",
      ],
    ];

    autoTable(doc, {
      head: resultsHead,
      body: resultsData,
      startY: yPosition + 4,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        fontSize: 6,
        cellPadding: 1,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "center",
        valign: "middle",
        font: "helvetica",
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [235, 235, 235],
        textColor: [0, 0, 0],
        fontStyle: "normal",
        fontSize: 6,
        cellPadding: 1,
        halign: "center",
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [60, 60, 60],
        fontSize: 6,
        cellPadding: 1,
      },
    });

    // Sauvegarder le PDF
    const fileName = `suivi_compact_batiment_${batiment.numero_batiment}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
    toast.success("PDF compact généré avec succès");
  };

  /**
   * Génère un PDF compact en arabe avec layout RTL du suivi hebdomadaire
   */
  const generateArabicCompactPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Load and set Arabic fonts properly
    try {
      // Load the Rubik font for Latin text
      doc.addFileToVFS("Rubik-VariableFont_wght-normal.ttf", font1);
      doc.addFont("Rubik-VariableFont_wght-normal.ttf", "Rubik-VariableFont_wght", "normal");

      // Load the HONOR Arabic font for Arabic text
      doc.addFileToVFS("HONORSansArabicUI-R-normal.ttf", font2);
      doc.addFont("HONORSansArabicUI-R-normal.ttf", "HONORSansArabicUI-R", "normal");

      // Set the Arabic font as default
      doc.setFont("HONORSansArabicUI-R");
      console.log("Arabic fonts loaded successfully");
    } catch (error) {
      console.error("Failed to load Arabic fonts:", error);
      // Fallback to a system font
      doc.setFont("times");
      console.log("Using fallback font: times");
    }

    // Configuration des marges et largeurs
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 6;
    const tableWidth = (pageWidth - 2 * margin - 2) / 2;

    let yPosition = margin;

    // Ajouter le tableau de synthèse avec layout RTL (VALUE first, then LABEL)
    const summaryData = [
      [ferme.nom || "-", "الضيعة"],
      [batiment.numero_batiment?.toString() || "-", "رقم الكوري"],
      [
        new Date(bande.date_entree).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        "تاريخ الدخول",
      ],
      [batiment.personnel_nom || "-", "الموظفين"],
      [batiment.poussin_nom || "-", "المحضنة الاصل"],
      [batiment.quantite?.toString() || "-", "الكمية"],
    ];

    // Calculate position to place summary table on the far right
    const summaryTableWidth = 90;
    const summaryTableX = pageWidth - margin - summaryTableWidth;

    autoTable(doc, {
      body: summaryData,
      startY: yPosition,
      margin: { left: summaryTableX, right: margin },
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "right",
        valign: "middle",
        font: "HONORSansArabicUI-R", // Default Arabic font for labels
        textColor: [60, 60, 60],
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: {
          cellWidth: 45,
          halign: "right",
          font: "Rubik-VariableFont_wght", // Latin font for data values
        },
        1: {
          cellWidth: 45,
          fillColor: [220, 220, 220],
          halign: "right",
          textColor: [0, 0, 0],
          font: "HONORSansArabicUI-R", // Arabic font for labels
        },
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 4;

    // Grouper les semaines par paires pour l'affichage côte à côte (RTL: droite à gauche)
    const semainesPairs = [];
    for (let i = 0; i < semaines.length; i += 2) {
      semainesPairs.push(semaines.slice(i, i + 2));
    }

    // Parcourir chaque paire de semaines
    semainesPairs.forEach((semainesPair) => {
      if (yPosition + 70 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Position X pour chaque table (RTL: Odd weeks RIGHT, Even weeks LEFT)
      const week1TableX = pageWidth - margin - tableWidth; // Odd weeks (1,3,5...) go to RIGHT (far right)
      const week2TableX = pageWidth - margin - 2 * tableWidth - 2; // Even weeks (2,4,6...) go to LEFT

      // RTL: Odd weeks (1,3,5...) go to RIGHT, Even weeks (2,4,6...) go to LEFT
      semainesPair.forEach((semaine) => {
        // Check if week number is odd or even to determine position
        const isOddWeek = semaine.numero_semaine % 2 === 1;
        const tableX = isOddWeek ? week1TableX : week2TableX;

        // Préparer les données pour la table avec ordre RTL (colonnes inversées)
        const tableData = semaine.suivi_quotidien.map((suivi, rowIndex) => {
          // RTL: Poids d'abord, puis Notes, Analyses, etc. jusqu'à Jour en dernier
          const row = [
            // Colonne 0: Poids (pour les lignes 6 et 7)
            rowIndex === 5
              ? "الوزن"
              : rowIndex === 6
              ? semaine.poids !== null && semaine.poids !== undefined
                ? `${semaine.poids} kg`
                : "-"
              : "",
            // Colonne 1: Notes
            suivi.remarques || "-",
            // Colonne 2: Analyses
            suivi.analyses || "-",
            // Colonne 3: العلاج - الكمية (Treatment Quantity)
            suivi.soins_quantite && suivi.soins_unit
              ? `${suivi.soins_quantite} ${suivi.soins_unit === "l" ? "L" : suivi.soins_unit}`
              : suivi.soins_quantite?.toString() || "-",
            // Colonne 4: العلاج - الاسم (Treatment Name)
            suivi.soins_nom || "-",
            // Colonne 5: Alimentation (total)
            suivi.alimentation_par_jour !== null &&
            suivi.alimentation_par_jour !== undefined &&
            suivi.alimentation_total &&
            suivi.alimentation_total > 0
              ? suivi.alimentation_total.toString()
              : "-",
            // Colonne 6: Alimentation (jour)
            suivi.alimentation_par_jour?.toString() || "-",
            // Colonne 7: Décès (total)
            suivi.deces_par_jour !== null &&
            suivi.deces_par_jour !== undefined &&
            suivi.deces_total &&
            suivi.deces_total > 0
              ? suivi.deces_total.toString()
              : "-",
            // Colonne 8: Décès (jour)
            suivi.deces_par_jour?.toString() || "-",
            // Colonne 9: Date
            getDateForAge(suivi.age),
            // Colonne 10: Jour
            suivi.age.toString(),
          ];

          return row;
        });

        // Headers avec titre de semaine et colonnes compactes (RTL - ordre inversé)
        const headers = [
          [
            "", // Empty cell for weight column (column 0)
            {
              content: `الأسبوع ${semaine.numero_semaine}`,
              colSpan: 10, // Span from ملاحظات to اليوم (columns 1-10)
              styles: {
                halign: "center" as const,
                fillColor: [220, 220, 220] as [number, number, number],
                textColor: [0, 0, 0] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
          ],
          [
            "", // Empty cell for weight column (column 0)
            {
              content: "ملاحظات",
              rowSpan: 2,
            },
            {
              content: "التحاليل",
              rowSpan: 2,
            },
            {
              content: "العلاجات",
              colSpan: 2, // Span over treatment columns (3-4)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "التغذية",
              colSpan: 2, // Span over nutrition columns (5-6)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "الوفيات",
              colSpan: 2, // Span over death columns (7-8)
              styles: {
                halign: "center" as const,
                fillColor: [235, 235, 235] as [number, number, number],
                textColor: [60, 60, 60] as [number, number, number],
                lineWidth: {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any,
              },
            },
            {
              content: "التاريخ",
              rowSpan: 2,
            },
            {
              content: "اليوم",
              rowSpan: 2,
            },
          ],
          [
            "",
            "الكمية", // Quantity (for treatment)
            "الاسم", // Name (for treatment)
            "الجمع", // Total (for nutrition)
            "اليوم", // Day (for nutrition)
            "الجمع", // Total (for deaths)
            "اليوم", // Day (for deaths)
          ],
        ];

        // Créer la table compacte
        autoTable(doc, {
          head: headers,
          body: tableData,
          startY: yPosition,
          margin: { left: tableX, right: pageWidth - tableX - tableWidth },
          tableWidth: tableWidth,
          theme: "grid",
          styles: {
            fontSize: 6,
            cellPadding: 1,
            lineColor: [180, 180, 180],
            lineWidth: 0.3,
            halign: "center",
            valign: "middle",
            font: "HONORSansArabicUI-R",
            textColor: [60, 60, 60],
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [235, 235, 235],
            textColor: [60, 60, 60],
            fontStyle: "normal",
            fontSize: 5,
            cellPadding: 0.5,
            halign: "center",
            lineWidth: 0.3,
            lineColor: [180, 180, 180],
            font: "HONORSansArabicUI-R", // Arabic font for Arabic headers
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 6,
            cellPadding: 1,
            font: "Rubik-VariableFont_wght", // Latin font for data values
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255],
          },
          columnStyles: {
            0: { cellWidth: 13 }, // الوزن (Weight)
            1: { cellWidth: 12 }, // ملاحظات (Notes)
            2: { cellWidth: 9 }, // التحاليل (Analysis)
            3: { cellWidth: 8 }, // العلاج - الكمية (Treatment Quantity)
            4: { cellWidth: 14 }, // العلاج - الاسم (Treatment Name)
            5: { cellWidth: 7 }, // التغذية (المجموع) (Feeding Total)
            6: { cellWidth: 7 }, // التغذية (اليوم) (Feeding Daily)
            7: { cellWidth: 7 }, // الوفيات (المجموع) (Deaths Total)
            8: { cellWidth: 7 }, // الوفيات (اليوم) (Deaths Daily)
            9: { cellWidth: 8 }, // التاريخ (Date)
            10: { cellWidth: 6 }, // اليوم (Day)
          },
          didParseCell: (data) => {
            const col = data.column.index;
            const section = (data as any).section as "head" | "body" | "foot";
            const rowIndex = data.row.index;
            const lastCol = data.table.columns.length - 1;

            // PDF: make the two top cells of the last column (in the header rows)
            // white and remove top/right/bottom borders; keep a thin left separator
            if (section === "head" && col === lastCol && (rowIndex === 0 || rowIndex === 1)) {
              data.cell.styles.fillColor = [255, 255, 255];
              (data.cell.styles as any).lineWidth = {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0.3,
              } as any;
            }

            // For body cells, check if content contains Arabic text and set appropriate font
            if (section === "body") {
              const cellText = data.cell.text.join(" ");

              // Priority: If cell contains parentheses, numbers, or Latin text, use Latin font
              // This ensures "300.00 kg ( 6 sacs )" displays correctly
              if (/[()0-9a-zA-Z]/.test(cellText)) {
                data.cell.styles.font = "Rubik-VariableFont_wght";
              }
              // If cell contains Arabic characters and no Latin content, use Arabic font
              else if (/[\u0600-\u06FF]/.test(cellText)) {
                data.cell.styles.font = "HONORSansArabicUI-R";
              }
              // Default to Latin font for safety
              else {
                data.cell.styles.font = "Rubik-VariableFont_wght";
              }
            }

            // Handle header styling - weight column (col 0) gets special treatment
            if (section === "head") {
              if (col === 0) {
                // Weight column (column 0) in all header rows - white background, but keep right border for continuity
                data.cell.styles.fillColor = [255, 255, 255]; // White background
                data.cell.styles.lineWidth = {
                  top: 0,
                  right: 0.3, // Keep right border to connect with ملاحظات cell
                  bottom: 0,
                  left: 0,
                } as any;
              } else {
                // All other columns in all header rows - gray background with borders
                if (rowIndex === 0) {
                  data.cell.styles.fillColor = [220, 220, 220]; // Week header gray
                } else {
                  data.cell.styles.fillColor = [235, 235, 235]; // All other header rows gray
                }
                data.cell.styles.lineWidth = {
                  top: 0.3,
                  right: 0.3,
                  bottom: 0.3,
                  left: 0.3,
                } as any;

                // For single-column headers (col 1,2,3,4,9,10), make them appear to span both rows
                if (
                  rowIndex === 1 &&
                  (col === 1 || col === 2 || col === 3 || col === 4 || col === 9 || col === 10)
                ) {
                  // These are single-column headers that should appear to span both rows
                  // Keep the same styling but they'll naturally span both rows
                }
              }
            }

            // For body cells, apply weight column special styling
            if (section === "body") {
              // Handle weight column (now column 0) - special styling for rows 5 and 6 only
              if (col === 0) {
                if (rowIndex === 5 || rowIndex === 6) {
                  // Weight label and value rows get full borders
                  data.cell.styles.lineWidth = {
                    top: 0.3,
                    right: 0.3,
                    bottom: 0.3,
                    left: 0.3,
                  } as any;
                } else {
                  // All other rows in weight column get NO borders and white background
                  data.cell.styles.lineWidth = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  } as any;
                  data.cell.styles.fillColor = [255, 255, 255]; // Force white background
                  data.cell.styles.textColor = [255, 255, 255]; // Hide text in non-weight rows
                }
              }
            }
          },
          willDrawCell: (data) => {
            const columnIndex = data.column.index;
            const rowIndex = data.row.index;
            const section = (data as any).section as "head" | "body" | "foot";

            // Weight column (now column 0) - draw background for weight label row only
            if (section === "body" && columnIndex === 0 && rowIndex === 5) {
              const cell = data.cell;
              const inset = 0.4;
              doc.setFillColor(235, 235, 235); // Gray background for weight label
              doc.rect(
                cell.x + inset,
                cell.y + inset,
                cell.width - 2 * inset,
                cell.height - 2 * inset,
                "F"
              );
            }

            // Force white background for all other rows in weight column
            if (section === "body" && columnIndex === 0 && rowIndex !== 5 && rowIndex !== 6) {
              const cell = data.cell;
              doc.setFillColor(255, 255, 255); // White background
              doc.rect(cell.x, cell.y, cell.width, cell.height, "F");
            }

            // Force white background for weight column header cells (all header rows)
            if (section === "head" && columnIndex === 0) {
              const cell = data.cell;
              doc.setFillColor(255, 255, 255); // White background
              doc.rect(cell.x, cell.y, cell.width, cell.height, "F");
            }
          },
        });
      });

      yPosition = (doc as any).lastAutoTable.finalY + 6;
    });

    // Ajouter le tableau des résultats
    if (yPosition + 35 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    const totalAlimentation = calculateTotalAlimentation();
    const finalWeight = calculateFinalWeight();
    const conversionFactor = calculateConversionFactor();
    const totalDeaths = calculateTotalDeaths();
    const deathPercentage = calculateDeathPercentage();

    const resultsData = [
      [
        totalAlimentation > 0
          ? `${formatNumber(totalAlimentation)} kg (${formatNumber(totalAlimentation / 50)} sacs)`
          : "-",
        finalWeight !== null ? `${finalWeight} kg` : "-",
        conversionFactor !== null ? formatNumber(conversionFactor) : "-",
        totalDeaths > 0 ? totalDeaths.toString() : "-",
        deathPercentage > 0 ? `${deathPercentage.toFixed(2)}%` : "-",
        bande.notes || "-",
      ],
    ];

    const resultsHead = [
      [
        {
          content: "جدول النتائج",
          colSpan: 6,
          styles: {
            halign: "center" as const,
            fillColor: [220, 220, 220] as [number, number, number],
            textColor: [50, 50, 50] as [number, number, number],
          },
        },
      ],
      [
        "التغذية الإجمالية",
        "الوزن النهائي",
        "عامل التحويل",
        "إجمالي الوفيات",
        "نسبة الوفيات",
        "ملاحظات",
      ],
    ];

    const resultsTableX = margin; // Keep it centered but could be adjusted if needed

    autoTable(doc, {
      head: resultsHead,
      body: resultsData,
      startY: yPosition + 4,
      margin: { left: resultsTableX, right: margin },
      theme: "grid",
      styles: {
        fontSize: 6,
        cellPadding: 1,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        halign: "center",
        valign: "middle",
        font: "HONORSansArabicUI-R", // Arabic font for Arabic headers
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [235, 235, 235],
        textColor: [0, 0, 0],
        fontStyle: "normal",
        fontSize: 6,
        cellPadding: 1,
        halign: "center",
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
        font: "HONORSansArabicUI-R", // Arabic font for Arabic headers
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [60, 60, 60],
        fontSize: 6,
        cellPadding: 1,
        font: "Rubik-VariableFont_wght", // Latin font for data values
      },
      didParseCell: (data) => {
        const section = (data as any).section as "head" | "body" | "foot";

        // For body cells, check if content contains Arabic text
        if (section === "body") {
          const cellText = data.cell.text.join(" ");

          // Priority: If cell contains parentheses, numbers, or Latin text, use Latin font
          // This ensures "300.00 kg ( 6 أكياس )" displays correctly
          if (/[()0-9a-zA-Z]/.test(cellText)) {
            data.cell.styles.font = "Rubik-VariableFont_wght";
          }
          // If cell contains Arabic characters and no Latin content, use Arabic font
          else if (/[\u0600-\u06FF]/.test(cellText)) {
            data.cell.styles.font = "HONORSansArabicUI-R";
          }
          // Default to Latin font for safety
          else {
            data.cell.styles.font = "Rubik-VariableFont_wght";
          }
        }
      },
    });

    // Sauvegarder le PDF
    const fileName = `suivi_compact_arabe_batiment_${batiment.numero_batiment}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
    toast.success("PDF compact arabe généré avec succès");
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

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openMaladieModal}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter maladies
              </Button>
              {/* PDF Generation Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter PDF
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={generatePDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateCompactPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF Compact Français
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateArabicCompactPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF Compact Arabe
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tableau de synthèse */}
          <div className="bg-white dark:bg-slate-800 border mx-auto max-w-[1000px] border-slate-400/50 overflow-hidden mb-6">
            <Table>
              <TableBody>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Ferme
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {ferme.nom}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Bâtiment
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {batiment.numero_batiment}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Date d'Entrée
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {new Date(bande.date_entree).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Personnel
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {batiment.personnel_nom}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Poussin
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {batiment.poussin_nom}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-slate-400/50">
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Quantité
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {batiment.quantite}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200 bg-orange-200/80 dark:bg-slate-700 border-r border-slate-400/50 w-1/2">
                    Maladies
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300 bg-white dark:bg-white w-1/2">
                    {batimentMaladies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {batimentMaladies.map((m) => (
                          <Badge key={m.id} variant="outline" className="border-slate-300/80">
                            {m.nom}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Aucune</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Semaines Tables */}
          <div className="space-y-6">
            {semaines.map((semaine) => (
              <div key={semaine.id} className="flex items-end">
                <div className="flex-1 overflow-x-auto border border-slate-400/50">
                  <Table className="min-w-full" data-semaine-id={semaine.id}>
                    <TableHeader className="bg-yellow-100 dark:bg-slate-800">
                      {/* Row 0: Week header - spans all columns */}
                      <TableRow>
                        <TableHead
                          colSpan={11}
                          className="text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 border-b border-slate-400/50"
                        >
                          Semaine {semaine.numero_semaine}
                        </TableHead>
                      </TableRow>

                      {/* Row 1: Main category headers with merged cells */}
                      <TableRow>
                        {/* Single-column headers that span 2 rows */}
                        <TableHead
                          rowSpan={2}
                          className="w-[60px] text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Jour
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="w-[80px] text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Date
                        </TableHead>

                        {/* Multi-column headers that span 2 columns */}
                        <TableHead
                          colSpan={2}
                          className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Décès
                        </TableHead>
                        <TableHead
                          colSpan={2}
                          className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Alimentation
                        </TableHead>
                        <TableHead
                          colSpan={2}
                          className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Soins
                        </TableHead>

                        {/* Single-column headers that span 2 rows */}
                        <TableHead
                          rowSpan={2}
                          className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Analyses
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="text-center text-slate-700 dark:text-slate-300 border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 !py-0 !h-8 !min-h-0"
                        >
                          Remarques
                        </TableHead>
                      </TableRow>

                      {/* Row 2: Sub-category headers */}
                      <TableRow>
                        {/* Empty cells for rowSpan headers above */}
                        {/* Décès sub-headers */}
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Jour
                        </TableHead>
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Total
                        </TableHead>
                        {/* Alimentation sub-headers */}
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Jour
                        </TableHead>
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Total
                        </TableHead>
                        {/* Soins sub-headers */}
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Traitement
                        </TableHead>
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 border-r border-b border-slate-400/50 bg-yellow-100 dark:bg-yellow-100 text-sm !py-0 !h-8 !min-h-0">
                          Quantité
                        </TableHead>
                        {/* Empty cells for rowSpan headers */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semaine.suivi_quotidien.map((suivi) => (
                        <TableRow key={suivi.age} className="last:border-b-0">
                          <TableCell className="font-medium text-center text-gray-800 dark:text-gray-200 border-r border-b border-slate-400/50 bg-white dark:bg-white">
                            {suivi.age}
                          </TableCell>
                          <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-b border-slate-400/50 bg-white dark:bg-white">
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
                            } else if (field === "soins_quantite") {
                              // Afficher la quantité avec l'unité si disponible
                              if (value && suivi.soins_unit) {
                                // Format: "3 L" instead of "3 l" for better readability (L looks better than l)
                                const unit = suivi.soins_unit === "l" ? "L" : suivi.soins_unit;
                                displayValue = `${value} ${unit}`;
                              } else {
                                displayValue = value;
                              }
                            }

                            const isEditable = canEditCell(semaine.id!, suivi.age, fieldKey);
                            const isTotalColumn =
                              fieldKey === "deces_total" || fieldKey === "alimentation_total";

                            return (
                              <TableCell
                                key={field}
                                className={`text-center text-gray-700 dark:text-gray-300 p-0 border-b border-slate-400/50 bg-white dark:bg-white ${
                                  !isLastCellInRow ? "border-r border-slate-400/50" : ""
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
                                        field.includes("deces") ||
                                        field.includes("alimentation") ||
                                        field === "soins_quantite"
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
                          })}{" "}
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
                          className="w-32 px-4 py-2 text-center font-medium text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-100 border border-slate-400/50 flex items-center justify-center border-l-0"
                          style={{ minHeight: 54, height: h6 + 1 }}
                        >
                          Poids
                        </div>
                        <div
                          className="w-32 text-center text-gray-700 dark:text-gray-300 bg-white dark:bg-white border border-t-0 border-slate-400/50 border-l-0 border-b-2 flex items-center justify-center"
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
                              {semaine.poids !== null && semaine.poids !== undefined
                                ? `${semaine.poids} kg`
                                : "-"}
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
            <div className="bg-white dark:bg-slate-800 border border-slate-400/50 overflow-hidden">
              <div className="bg-slate-200 dark:bg-slate-700 px-4 py-3 border-b border-slate-400/50">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-center">
                  Tableau des Résultats
                </h3>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-yellow-100">
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50">
                      Alimentation Totale
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50">
                      Poids Final
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50">
                      Facteur de Conversion
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50">
                      Décès Total
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-400/50">
                      Pourcentage de Mortalité
                    </TableHead>
                    <TableHead className="text-center text-slate-700 dark:text-slate-300 border-b border-slate-400/50">
                      Remarques globale
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {/* Alimentation Totale */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-400/50 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const totalAlimentation = calculateTotalAlimentation();
                          if (totalAlimentation > 0) {
                            const totalSachets = totalAlimentation / 50;
                            return `${formatNumber(totalAlimentation)} kg ( ${formatNumber(
                              totalSachets
                            )} sacs )`;
                          }
                          return "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Poids Final */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-400/50 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const finalWeight = calculateFinalWeight();
                          return finalWeight !== null ? `${finalWeight} kg` : "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Facteur de Conversion */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-400/50 bg-white dark:bg-white">
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
                                    {formatNumber(totalAlimentation)}
                                  </span>
                                  <div className="w-12 border-t border-gray-400 my-0.5"></div>
                                  <span className="text-sm font-mono text-gray-700 leading-none">
                                    {finalWeight}
                                  </span>
                                </div>
                                <span className="text-gray-600 font-medium">=</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {formatNumber(conversionFactor)}
                                </span>
                              </div>
                            );
                          }
                          return "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Décès Total */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-400/50 bg-white dark:bg-white">
                      <div className="px-4 py-2 h-full w-full flex items-center justify-center">
                        {(() => {
                          const totalDeaths = calculateTotalDeaths();
                          return totalDeaths > 0 ? totalDeaths : "-";
                        })()}
                      </div>
                    </TableCell>

                    {/* Pourcentage de Mortalité */}
                    <TableCell className="text-center text-gray-700 dark:text-gray-300 border-r border-slate-400/50 bg-white dark:bg-white">
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
                        />
                      ) : (
                        <div
                          className="px-4 py-2 h-full w-full cursor-pointer hover:bg-gray-50 flex items-center justify-center min-h-[53px]"
                          onDoubleClick={handleNotesDoubleClick}
                          title="Double-cliquez pour modifier les notes"
                        >
                          {bande.notes || "-"}
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
      {/* Modal: Ajouter des maladies */}
      <Dialog open={isMaladieModalOpen} onOpenChange={setIsMaladieModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des maladies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 w-full">
            <div className="space-y-2 w-full">
              <Label>Maladies</Label>
              <Popover open={maladieComboboxOpen} onOpenChange={setMaladieComboboxOpen}>
                <PopoverTrigger>
                  <Button variant="outline" role="combobox" className="w-[29rem] justify-between">
                    {selectedMaladieIds.length > 0
                      ? `${selectedMaladieIds.length} sélectionnée(s)`
                      : "Choisir des maladies..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[29rem] max-w-none p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher une maladie..." />
                    <CommandList>
                      <CommandEmpty>Aucune maladie trouvée.</CommandEmpty>
                      <CommandGroup>
                        {maladies.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.nom}
                            onSelect={() => toggleSelectedMaladie(m.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMaladieIds.includes(m.id.toString())
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {m.nom}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedMaladieIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMaladieIds.map((idStr) => {
                    const m = maladies.find((mm) => mm.id.toString() === idStr);
                    return (
                      <Badge key={idStr} variant="secondary" className="flex items-center gap-1">
                        <span>{m?.nom ?? idStr}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelectedMaladie(parseInt(idStr, 10))}
                          className="hover:text-destructive/80"
                          aria-label={`Retirer ${m?.nom ?? idStr}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="apply-switch" className="mr-4">
                Appliquer à tous les bâtiments de cette bande
              </Label>
              <Switch
                id="apply-switch"
                checked={applyToSameBande}
                onCheckedChange={setApplyToSameBande}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaladieModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitMaladies}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
