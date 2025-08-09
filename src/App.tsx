import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { AuthProvider } from "./contexts/AuthContext";
import AuthWrapper from "./components/AuthWrapper";
import Header from "./components/header";
import Dashboard from "./pages/dashboard/Dashboard";
import Fermes from "./pages/fermes/Fermes";
import ResponsableFerme from "./pages/personnel/ResponsableFerme";
import Poussins from "./pages/poussins/Poussins";
import Medicaments from "./pages/medicaments/Medicaments";
import Maladies from "./pages/maladies/Maladies";
import ProfilePage from "./pages/profile/ProfilePage";
import { Ferme, BandeWithDetails } from "@/types";
import "./App.css";

interface NavItem {
  id: string;
  label: string;
  path: string;
}

/**
 * Composant principal de l'application authentifiée
 */
function AuthenticatedApp() {
  const [fermes, setFermes] = useState<Ferme[]>([]);
  const [selectedFerme, setSelectedFerme] = useState<Ferme | null>(null);
  const [latestBandes, setLatestBandes] = useState<BandeWithDetails[]>([]);
  const [selectedBande, setSelectedBande] = useState<BandeWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currentView, setCurrentView] = useState<"ferme" | "bande" | "batiment">("ferme");
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", path: "/" },
    { id: "fermes", label: "Fermes", path: "/fermes" },
    { id: "responsable", label: "Responsable ferme", path: "/responsable" },
    { id: "poussins", label: "Poussins", path: "/poussins" },
    { id: "medicaments", label: "Médicaments", path: "/medicaments" },
    { id: "maladies", label: "Maladies", path: "/maladies" },
  ];

  /**
   * Charge toutes les fermes depuis le backend
   */
  const loadFermes = async () => {
    try {
      const result = await invoke<Ferme[]>("get_all_fermes");
      setFermes(result);
    } catch (error) {
      console.error("Impossible de charger les fermes:", error);
    }
  };

  /**
   * Charge les dernières bandes d'une ferme pour le sélecteur
   */
  const loadLatestBandes = async (fermeId: number) => {
    try {
      const result = await invoke<BandeWithDetails[]>("get_latest_bandes_by_ferme", {
        fermeId,
        limit: 10,
      });
      setLatestBandes(result);
    } catch (error) {
      console.error("Impossible de charger les dernières bandes:", error);
      setLatestBandes([]);
    }
  };

  const handleFermeChange = (ferme: Ferme) => {
    setSelectedFerme(ferme);

    // Charger les dernières bandes pour le sélecteur
    loadLatestBandes(ferme.id);

    // Réinitialiser la bande sélectionnée
    setSelectedBande(null);

    // Passer au niveau bandes
    setCurrentView("bande");
  };

  const handleNewFerme = () => {
    setIsCreateDialogOpen(true);
  };

  const handleBackToFermes = () => {
    setSelectedFerme(null);
    setSelectedBande(null);
    setLatestBandes([]);
    setCurrentView("ferme"); // Back to ferme view
  };

  const handleBandeChange = (bande: BandeWithDetails) => {
    setSelectedBande(bande);
    setCurrentView("batiment"); // When a bande is selected, we go to batiment view
  };

  const handleBackToBandes = () => {
    setSelectedBande(null);
    setCurrentView("bande"); // Back to bande view
  };

  const handleAccountClick = () => {
    navigate("/profile");
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  // Charger les fermes au montage du composant
  useEffect(() => {
    loadFermes();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Header
        fermes={fermes}
        selectedFerme={selectedFerme}
        onFermeChange={handleFermeChange}
        latestBandes={latestBandes}
        selectedBande={selectedBande}
        onBandeChange={handleBandeChange}
        onNewFerme={handleNewFerme}
        onRefreshFermes={loadFermes}
        onRefreshBandes={() => {
          if (selectedFerme) {
            loadLatestBandes(selectedFerme.id);
          }
        }}
        showBreadcrumb={location.pathname.startsWith("/fermes")}
        breadcrumbLevel={currentView}
        navItems={navItems}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onAccountClick={handleAccountClick}
      />

      <main className="mt-[100px] h-[calc(100vh-102px)] overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/fermes"
            element={
              <Fermes
                selectedFerme={selectedFerme}
                isCreateDialogOpen={isCreateDialogOpen}
                setIsCreateDialogOpen={setIsCreateDialogOpen}
                onFermeSelect={handleFermeChange}
                onBackToFermes={handleBackToFermes}
                selectedBande={selectedBande}
                onBandeSelect={handleBandeChange}
                onBackToBandes={handleBackToBandes}
                currentView={currentView}
                onRefreshFermes={loadFermes}
                onRefreshBandes={() => selectedFerme && loadLatestBandes(selectedFerme.id)}
              />
            }
          />
          <Route path="/responsable" element={<ResponsableFerme />} />
          <Route path="/poussins" element={<Poussins />} />
          <Route path="/medicaments" element={<Medicaments />} />
          <Route path="/maladies" element={<Maladies />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * Application principale de gestion de ferme
 *
 * Cette application permet de gérer les fermes, les bandes d'animaux,
 * et leur suivi quotidien et hebdomadaire avec authentification.
 */
function App() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <AuthenticatedApp />
      </AuthWrapper>
    </AuthProvider>
  );
}

export default App;
