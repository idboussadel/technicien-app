import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Ferme } from "@/types";

interface FermeDetailedStatistics {
  ferme_id: number;
  ferme_nom: string;
  total_bandes: number;
  bandes_with_deaths: number;
  total_deaths: number;
  bande_deaths_data: BandeDeathData[];
}

interface BandeDeathData {
  bande_nom: string;
  entry_date: string;
  total_deaths: number;
}

interface DashboardFermeProps {
  selectedFerme: Ferme;
}

interface CustomTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: string;
    index: number;
  };
  data?: any[];
}

const CustomXAxisTick: React.FC<CustomTickProps> = ({ x, y, payload, data }) => {
  if (!payload || !data) return null;

  const item = data[payload.index];
  if (!item) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#374151" fontSize="12" fontWeight="500">
        {item.bande}
      </text>
      <text x={0} y={0} dy={30} textAnchor="middle" fill="#6b7280" fontSize="10">
        {item.entryDate}
      </text>
    </g>
  );
};

/**
 * Dashboard individuel affichant les statistiques d'une ferme spécifique
 */
export default function DashboardFerme({ selectedFerme }: DashboardFermeProps) {
  const [fermeStats, setFermeStats] = useState<FermeDetailedStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedFerme && selectedFerme.id > 0) {
      loadFermeStats(selectedFerme.id);
    }
  }, [selectedFerme]);

  const loadFermeStats = async (fermeId: number) => {
    setIsLoading(true);
    try {
      const stats = await invoke<FermeDetailedStatistics>("get_ferme_detailed_statistics", {
        fermeId,
      });
      setFermeStats(stats);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Données pour le graphique des décès
  const deathChartData = fermeStats?.bande_deaths_data.length
    ? fermeStats.bande_deaths_data.map((item) => {
        // Extract bande number from the bande name
        const bandeNumber = item.bande_nom.replace("Bande #", "");

        return {
          bande: item.bande_nom,
          bandeNumber,
          entryDate: item.entry_date,
          deces: item.total_deaths,
        };
      })
    : [];

  const chartConfig = {
    deces: {
      label: "Décès",
      color: "hsl(var(--chart-1))",
    },
  };

  // Use actual CSS variable values for better compatibility
  const chartColors = {
    deces: "oklch(0.646 0.222 41.116)", // --chart-1 value
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de {selectedFerme.nom}</p>
      </div>

      {/* Charts and Activity Grid */}
      {fermeStats ? (
        <div className="grid gap-6 md:grid-cols-5">
          {/* Graphique des décès par bande */}
          <Card className="md:col-span-3 max-h-[700px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Décès par Bandes
              </CardTitle>
              <CardDescription>
                Graphique des décès totaux par bande pour {selectedFerme.nom}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-muted-foreground">Chargement des données...</div>
                </div>
              ) : deathChartData.length > 0 ? (
                <ChartContainer config={chartConfig}>
                  <LineChart
                    data={deathChartData}
                    width={800}
                    height={280}
                    margin={{
                      top: 20,
                      left: 12,
                      right: 12,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="bande"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={40}
                      tick={<CustomXAxisTick data={deathChartData} />}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Line
                      dataKey="deces"
                      type="monotone"
                      stroke={chartColors.deces}
                      strokeWidth={3}
                      dot={{
                        fill: chartColors.deces,
                        r: 5,
                        strokeWidth: 2,
                        stroke: "white",
                      }}
                      activeDot={{
                        r: 7,
                        fill: chartColors.deces,
                        stroke: "white",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {fermeStats?.total_bandes > 0
                        ? "Aucun décès enregistré pour le moment"
                        : "Aucune bande disponible pour le suivi"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activité récente */}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Aucune donnée disponible</h2>
            <p className="text-muted-foreground">
              Les statistiques pour cette ferme ne sont pas encore disponibles
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
