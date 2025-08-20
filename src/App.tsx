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

import { UpdateNotification } from "./components/UpdateNotification";
import { Ferme, BandeWithDetails, BatimentWithDetails } from "@/types";
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
  const [selectedFerme, setSelectedFerme] = useState<Ferme | null>({
    id: 0,
    nom: "Toutes les fermes",
    nbr_meuble: 0,
  });
  const [latestBandes, setLatestBandes] = useState<BandeWithDetails[]>([]);
  const [selectedBande, setSelectedBande] = useState<BandeWithDetails | null>(null);
  const [batiments, setBatiments] = useState<BatimentWithDetails[]>([]);
  const [selectedBatiment, setSelectedBatiment] = useState<BatimentWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currentView, setCurrentView] = useState<"ferme" | "bande" | "batiment" | "semaine">(
    "ferme"
  );
  const location = useLocation();
  const navigate = useNavigate();

  // Reset farm selection when navigating away from dashboard
  useEffect(() => {
    if (location.pathname !== "/" && selectedFerme && selectedFerme.id === 0) {
      // If we're not on dashboard and "Toutes les fermes" is selected, reset to no selection
      setSelectedFerme(null);
      setCurrentView("ferme");
      setLatestBandes([]);
      setSelectedBande(null);
      setSelectedBatiment(null);
      setBatiments([]);
    } else if (location.pathname === "/" && !selectedFerme) {
      // If we're on dashboard and no farm is selected, default to "Toutes les fermes"
      setSelectedFerme({ id: 0, nom: "Toutes les fermes", nbr_meuble: 0 });
      setCurrentView("ferme");
    }
  }, [location.pathname, selectedFerme]);

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

  /**
   * Charge les bâtiments d'une bande pour le sélecteur
   */
  const loadBatiments = async (bandeId: number) => {
    try {
      const result = await invoke<BatimentWithDetails[]>("get_batiments_by_bande", {
        bandeId,
      });
      setBatiments(result);
    } catch (error) {
      console.error("Impossible de charger les bâtiments:", error);
      setBatiments([]);
    }
  };

  const handleFermeChange = (ferme: Ferme) => {
    setSelectedFerme(ferme);

    // Si c'est "Toutes les fermes", ne pas charger les bandes
    if (ferme.id > 0) {
      // Charger les dernières bandes pour le sélecteur
      loadLatestBandes(ferme.id);
      // Passer au niveau bandes
      setCurrentView("bande");
    } else {
      // Pour "Toutes les fermes", rester au niveau ferme
      setCurrentView("ferme");
      // Vider les bandes
      setLatestBandes([]);
    }

    // Réinitialiser la bande et le bâtiment sélectionnés
    setSelectedBande(null);
    setSelectedBatiment(null);
    setBatiments([]);
  };

  const handleNewFerme = () => {
    setIsCreateDialogOpen(true);
  };

  const handleBackToFermes = () => {
    setSelectedFerme(null);
    setSelectedBande(null);
    setSelectedBatiment(null);
    setLatestBandes([]);
    setBatiments([]);
    setCurrentView("ferme"); // Back to ferme view
  };

  const handleBandeChange = (bande: BandeWithDetails) => {
    setSelectedBande(bande);
    setSelectedBatiment(null); // Reset batiment when bande changes

    // Load batiments for the selected bande
    if (bande.id) {
      loadBatiments(bande.id);
    }

    setCurrentView("batiment"); // When a bande is selected, we go to batiment view
  };

  const handleBackToBandes = () => {
    setSelectedBande(null);
    setSelectedBatiment(null);
    setBatiments([]);
    setCurrentView("bande"); // Back to bande view
  };

  const handleBatimentChange = (batiment: BatimentWithDetails) => {
    setSelectedBatiment(batiment);
    setCurrentView("semaine"); // When a batiment is selected, we go to semaine view
  };

  const handleBackToBatiments = () => {
    setSelectedBatiment(null);
    setCurrentView("batiment"); // Back to batiment view
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
        batiments={batiments}
        selectedBatiment={selectedBatiment}
        onBatimentChange={handleBatimentChange}
        onNewFerme={handleNewFerme}
        onRefreshFermes={loadFermes}
        onRefreshBandes={() => {
          if (selectedFerme) {
            loadLatestBandes(selectedFerme.id);
          }
        }}
        showBreadcrumb={location.pathname.startsWith("/fermes") || location.pathname === "/"}
        breadcrumbLevel={location.pathname === "/" ? "ferme" : currentView}
        navItems={navItems}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onAccountClick={handleAccountClick}
      />

      <main className="mt-[100px] h-[calc(100vh-102px)] overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard selectedFerme={selectedFerme} fermes={fermes} />} />
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
                selectedBatiment={selectedBatiment}
                onBatimentSelect={handleBatimentChange}
                onBackToBatiments={handleBackToBatiments}
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

      {/* Update notification - shows automatically when updates are available */}
      <UpdateNotification />
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
