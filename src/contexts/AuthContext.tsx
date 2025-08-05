import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authResponse: AuthResponse) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clés pour le stockage local
  const USER_STORAGE_KEY = "ferme_app_user";
  const TOKEN_STORAGE_KEY = "ferme_app_token";

  // Charger les données d'authentification au démarrage
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

        if (storedUser && storedToken) {
          // Vérifier si le token est toujours valide
          const verifiedUser = await invoke<User | null>("verify_token", {
            token: storedToken,
          });

          if (verifiedUser) {
            setUser(verifiedUser);
            setToken(storedToken);
          } else {
            // Token invalide, nettoyer le stockage
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du token:", error);
        // En cas d'erreur, nettoyer le stockage
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = (authResponse: AuthResponse) => {
    setUser(authResponse.user);
    setToken(authResponse.token);

    // Sauvegarder dans le stockage local
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authResponse.user));
    localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.token);
  };

  const logout = async () => {
    try {
      if (token) {
        await invoke("logout_user", { token });
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      // Nettoyer l'état et le stockage local
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
