import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Search, AlertTriangle, Calendar, Plus } from "lucide-react";

export default function Medicaments() {
  const medicaments = [
    {
      id: 1,
      nom: "Antibiotique XYZ",
      type: "Antibiotique",
      stock: 3,
      stockMin: 10,
      dateExpiration: "2025-12-15",
      status: "critique"
    },
    {
      id: 2,
      nom: "Vaccin ABC",
      type: "Vaccin",
      stock: 25,
      stockMin: 15,
      dateExpiration: "2026-03-20",
      status: "normal"
    },
    {
      id: 3,
      nom: "Anti-inflammatoire DEF",
      type: "Anti-inflammatoire",
      stock: 8,
      stockMin: 5,
      dateExpiration: "2025-09-10",
      status: "attention"
    },
    {
      id: 4,
      nom: "Supplément GHI",
      type: "Supplément",
      stock: 50,
      stockMin: 20,
      dateExpiration: "2026-01-30",
      status: "normal"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critique': return 'destructive';
      case 'attention': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critique': return 'Stock critique';
      case 'attention': return 'Attention';
      default: return 'Normal';
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Médicaments</h1>
          <p className="text-muted-foreground">
            Gérez votre pharmacie vétérinaire
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un médicament
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Médicaments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              Types disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Critique</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">3</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent réapprovisionnement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirations Proches</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">5</div>
            <p className="text-xs text-muted-foreground">
              Dans les 6 prochains mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€15,420</div>
            <p className="text-xs text-muted-foreground">
              Valeur totale estimée
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un médicament..." className="pl-8" />
        </div>
      </div>

      {/* Medicaments List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Inventaire</h2>
        <div className="grid gap-4">
          {medicaments.map((medicament) => (
            <Card key={medicament.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">{medicament.nom}</h3>
                      <Badge variant={getStatusColor(medicament.status) as any}>
                        {getStatusLabel(medicament.status)}
                      </Badge>
                      <Badge variant="outline">{medicament.type}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stock actuel: </span>
                        <span className={`font-medium ${medicament.stock <= medicament.stockMin ? 'text-red-500' : 'text-foreground'}`}>
                          {medicament.stock} unités
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock minimum: </span>
                        <span className="font-medium text-foreground">{medicament.stockMin} unités</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expiration: </span>
                        <span className="font-medium text-foreground">{medicament.dateExpiration}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm">
                      Historique
                    </Button>
                  </div>
                </div>
                
                {medicament.stock <= medicament.stockMin && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700 dark:text-red-400">
                        Stock critique - Réapprovisionnement nécessaire
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
