import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { AuthProvider } from "./contexts/AuthContext";
import AuthWrapper from "./components/AuthWrapper";
import Header from "./components/header";
import Dashboard from "./pages/dashboard/Dashboard";
import Fermes from "./pages/fermes/Fermes";
import ResponsableFerme from "./pages/personnel/ResponsableFerme";
import Medicaments from "./pages/medicaments/Medicaments";
import ProfilePage from "./pages/profile/ProfilePage";
import "./App.css";

interface Ferme {
  id: number;
  nom: string;
}

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", path: "/" },
    { id: "fermes", label: "Fermes", path: "/fermes" },
    { id: "responsable", label: "Responsable ferme", path: "/responsable" },
    { id: "medicaments", label: "Médicaments", path: "/medicaments" },
  ];

  /**
   * Charge toutes les fermes depuis le backend
   */
  const loadFermes = async () => {
    try {
      const result = await invoke<Ferme[]>("get_all_fermes");
      setFermes(result);

      // Si aucune ferme n'est sélectionnée et qu'il y a des fermes, sélectionner la première
      if (!selectedFerme && result.length > 0) {
        setSelectedFerme(result[0]);
      }
    } catch (error) {
      console.error("Impossible de charger les fermes:", error);
    }
  };

  const handleFermeChange = (ferme: Ferme) => {
    setSelectedFerme(ferme);
  };

  const handleNewFerme = () => {
    setIsCreateDialogOpen(true);
  };

  const handleBackToFermes = () => {
    setSelectedFerme(null);
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
        onNewFerme={handleNewFerme}
        showFermeSelector={location.pathname.startsWith("/fermes")}
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
                onFermesUpdate={loadFermes}
                onFermeSelect={handleFermeChange}
                onBackToFermes={handleBackToFermes}
              />
            }
          />
          <Route path="/responsable" element={<ResponsableFerme />} />
          <Route path="/medicaments" element={<Medicaments />} />
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
