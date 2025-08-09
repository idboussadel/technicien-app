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
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import {
  BatimentWithDetails,
  Ferme,
  BandeWithDetails,
  SemaineWithDetails,
  SuiviQuotidienWithDetails,
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
  field: keyof SuiviQuotidienWithDetails;
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
   * Charge les semaines d'un bâtiment avec leurs suivis quotidiens
   * Utilise la nouvelle commande qui gère automatiquement la création des données manquantes
   */
  const loadSemaines = async (batimentId: number) => {
    try {
      // Utiliser la nouvelle commande qui gère automatiquement la création des 8 semaines et leurs suivis
      const fullSemaines = await invoke<SemaineWithDetails[]>("get_full_semaines_by_batiment", {
        batimentId,
      });

      setSemaines(fullSemaines);
    } catch (error) {
      console.error("Erreur lors du chargement des semaines:", error);
    }
  };

  /**
   * Gère le clic sur une cellule pour l'édition
   */
  const handleCellClick = (
    semaineId: number,
    age: number,
    field: keyof SuiviQuotidienWithDetails,
    currentValue: any,
    originalValue?: any
  ) => {
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
    handleSaveEdit();
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
                          Décès (Total)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Alimentation (Jour)
                        </TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-700">
                          Alimentation (Total)
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

                            const fieldKey = field as keyof SuiviQuotidienWithDetails;
                            let value = suivi[fieldKey];
                            const isLastCellInRow = index === array.length - 1;

                            // Pour soins_id, garder la valeur originale et préparer l'affichage
                            const originalValue = suivi[fieldKey];
                            let displayValue = value;
                            if (field === "soins_id") {
                              // Utiliser directement soins_nom au lieu de chercher dans la liste
                              displayValue = suivi.soins_nom || (value ? "Soin inconnu" : "");
                            }

                            return (
                              <TableCell
                                key={field}
                                className={`text-center text-gray-700 dark:text-gray-300 p-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-white ${
                                  !isLastCellInRow ? "border-r" : ""
                                }`}
                                onDoubleClick={() =>
                                  handleCellClick(
                                    semaine.id!,
                                    suivi.age,
                                    fieldKey,
                                    displayValue,
                                    originalValue
                                  )
                                }
                              >
                                {isEditing ? (
                                  field === "soins_id" ? (
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
                                      className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0 min-h-0"
                                      style={{ boxShadow: "none" }}
                                      autoFocus
                                    />
                                  )
                                ) : (
                                  <div className="px-4 py-2 h-full w-full flex items-center justify-center cursor-pointer hover:bg-gray-50">
                                    {displayValue !== null &&
                                    displayValue !== undefined &&
                                    displayValue !== ""
                                      ? field.includes("alimentation")
                                        ? `${displayValue} kg`
                                        : displayValue
                                      : "-"}
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
                          className="w-26 px-4 py-2 text-center font-medium text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center border-l-0"
                          style={{ minHeight: 54, height: h6 + 1 }}
                        >
                          Poids
                        </div>
                        <div
                          className="w-26 text-center text-gray-700 dark:text-gray-300 bg-white dark:bg-white border border-t-0 border-slate-200 dark:border-slate-700 border-l-0 border-b-2 flex items-center justify-center"
                          style={{ minHeight: 54, height: h7 + 1 }}
                        >
                          {editingPoids?.semaineId === semaine.id ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={poidsValue}
                              onChange={(e) => setPoidsValue(e.target.value)}
                              onKeyDown={handlePoidsKeyDown}
                              onBlur={handleSavePoids}
                              className="w-full h-full border-none focus:outline-none focus:ring-0 text-center bg-white dark:bg-white rounded-none px-4 py-2 m-0 min-h-0"
                              style={{ boxShadow: "none" }}
                              autoFocus
                            />
                          ) : (
                            <div
                              className="w-full h-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-100 px-4 py-2 transition-colors flex items-center justify-center"
                              onDoubleClick={() => handlePoidsDoubleClick(semaine)}
                              title="Double-cliquez pour modifier"
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
        </div>
      </main>
    </div>
  );
}
