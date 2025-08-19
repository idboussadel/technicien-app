import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, AlertTriangle } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Ferme } from "@/types";
import { invoke } from "@tauri-apps/api/core";

interface DashboardGlobalProps {
  fermes: Ferme[];
}

interface GlobalStatistics {
  total_fermes: number;
  total_bandes: number;
  bandes_par_ferme: BandeParFerme[];
  maladies_par_ferme: FermeMaladieStats[];
}

interface BandeParFerme {
  ferme_nom: string;
  total_bandes: number;
  latest_bande_info?: {
    bande_id: number;
    numero_bande: number;
    date_entree: string;
    alimentation_contour?: number | null;
  };
}

interface FermeMaladieStats {
  ferme_nom: string;
  maladie_nom: string;
  total_bandes_affectees: number;
  total_bandes_ferme: number;
  pourcentage_affectees: number;
}

/**
 * Dashboard global affichant les statistiques de toutes les fermes
 */
export default function DashboardGlobal({ fermes }: DashboardGlobalProps) {
  const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadGlobalStats();
  }, []);

  const loadGlobalStats = async () => {
    setIsLoading(true);
    try {
      const stats = await invoke<GlobalStatistics>("get_global_statistics");
      setGlobalStats(stats);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques globales:", error);
      // Fallback to basic stats if API fails
      setGlobalStats({
        total_fermes: fermes.length,
        total_bandes: 0,
        bandes_par_ferme: [],
        maladies_par_ferme: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Données réelles pour les graphiques - triées par nom de ferme
  const fermeChartData =
    globalStats?.bandes_par_ferme
      .map((item) => ({
        ferme: item.ferme_nom,
        bandes: item.total_bandes,
      }))
      .sort((a, b) => a.ferme.localeCompare(b.ferme)) || [];

  // Create a dynamic array based on farm count, minimum 18 slots
  const minSlots = 18;
  const requiredSlots = Math.max(fermeChartData.length, minSlots);
  const chartData = new Array(requiredSlots).fill({ ferme: "", bandes: 0 }).map((item, idx) => {
    if (fermeChartData[idx]) {
      return fermeChartData[idx];
    }
    return item;
  });

  const globalChartConfig = {
    bandes: {
      label: "Bandes",
      color: "var(--chart-1)",
    },
  };

  // Use actual CSS variable values
  const chartColors = {
    bandes: "#374151", // --chart-1 value
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Global</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de toutes les fermes - Année {new Date().getFullYear()}
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bandes ( {new Date().getFullYear()} )
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.total_bandes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Bandes créées en {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Graphique des bandes par ferme */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Bandes par Ferme
            </CardTitle>
            <CardDescription>
              Répartition des bandes créées en {new Date().getFullYear()} par ferme
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-muted-foreground">Chargement des données...</div>
              </div>
            ) : fermeChartData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="flex justify-start">
                  <div style={{ width: `${requiredSlots * 80}px` }}>
                    <ChartContainer config={globalChartConfig}>
                      <BarChart
                        data={chartData}
                        width={requiredSlots * 70}
                        height={50}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        barCategoryGap={20}
                        barSize={55}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="ferme"
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value || ""}
                        />
                        <YAxis tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="bandes" fill={chartColors.bandes} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alimentation and Disease Statistics Column */}
        <div className="md:col-span-1 space-y-4">
          {/* Alimentation Card */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Alimentation
              </CardTitle>
              <CardDescription>Statut de l'alimentation dernières bandes par ferme</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Chargement...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Filter farms that need attention (contour < 10000)
                    const farmsNeedingAttention = fermes.filter((ferme) => {
                      const fermeStats = globalStats?.bandes_par_ferme.find(
                        (b) => b.ferme_nom === ferme.nom
                      );

                      if (!fermeStats?.latest_bande_info) {
                        return false;
                      }

                      const contour = fermeStats.latest_bande_info.alimentation_contour || 0;
                      const needsAttention = contour < 10000;

                      return needsAttention;
                    });

                    if (farmsNeedingAttention.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            ✅ Toutes les fermes ont un bon niveau d'alimentation
                          </p>
                        </div>
                      );
                    }

                    return farmsNeedingAttention.map((ferme) => {
                      const fermeStats = globalStats?.bandes_par_ferme.find(
                        (b) => b.ferme_nom === ferme.nom
                      );

                      const latestBande = fermeStats!.latest_bande_info!;
                      const alimentationContour = latestBande.alimentation_contour || 0;

                      return (
                        <div
                          key={ferme.id}
                          className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                        >
                          <div>
                            <div className="text-sm font-medium">{ferme.nom}</div>
                            <div className="text-xs text-muted-foreground">
                              Bande #{latestBande.numero_bande} - {latestBande.date_entree}
                            </div>
                          </div>

                          <div className="text-xs self-center font-medium mt-1 text-red-600">
                            <span className="flex items-center gap-1">
                              Alimentation: {alimentationContour.toLocaleString()} &lt; 10000
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disease Statistics Card */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Problèmes de Maladies
              </CardTitle>
              <CardDescription>
                Fermes avec des maladies récurrentes cette année (&gt;60%)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Chargement...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Filter diseases with occurrence rate > 60%
                    const highRiskMaladies =
                      globalStats?.maladies_par_ferme?.filter(
                        (maladie) => maladie.pourcentage_affectees > 60
                      ) || [];

                    if (highRiskMaladies.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            ✅ Aucun problème de maladie à haut risque détecté
                          </p>
                        </div>
                      );
                    }

                    return highRiskMaladies.map((maladie, index) => (
                      <div
                        key={index}
                        className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                      >
                        <div>
                          <div className="text-sm font-medium">{maladie.ferme_nom}</div>
                          <div className="text-xs text-muted-foreground">
                            Maladie: {maladie.maladie_nom}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {maladie.total_bandes_affectees} bande(s) sur{" "}
                            {maladie.total_bandes_ferme}
                          </div>
                        </div>

                        <div className="text-xs self-center font-medium mt-1 text-red-600">
                          <span className="flex items-center gap-1">
                            {maladie.pourcentage_affectees.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
