import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Afficher un loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas authentifié, afficher les pages d'auth
  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterPage onRegister={login} onSwitchToLogin={() => setShowRegister(false)} />;
    } else {
      return <LoginPage onLogin={login} onSwitchToRegister={() => setShowRegister(true)} />;
    }
  }

  // Si l'utilisateur est authentifié, afficher l'application principale
  return <>{children}</>;
}
