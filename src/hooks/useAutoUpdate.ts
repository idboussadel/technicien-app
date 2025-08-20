import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  available: boolean;
  version: string;
  body: string;
  date: string;
}

export interface UpdateProgress {
  status: string;
  progress: number;
}

export const useAutoUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check for available updates
   */
  const checkForUpdates = useCallback(async () => {
    try {
      setError(null);

      const result = await invoke<UpdateInfo>("check_for_updates");

      setUpdateInfo(result);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Install the available update
   */
  const installUpdate = useCallback(async () => {
    if (!updateInfo?.available) {
      setError("Aucune mise à jour disponible");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      // Start progress tracking
      setUpdateProgress({
        status: "Démarrage de la mise à jour...",
        progress: 0,
      });

      // Simulate progress updates (in a real app, you'd listen to actual progress events)
      const progressInterval = setInterval(() => {
        setUpdateProgress((prev) => {
          if (!prev) return prev;
          const newProgress = Math.min(prev.progress + Math.random() * 20, 90);
          return {
            ...prev,
            progress: newProgress,
            status:
              newProgress < 30
                ? "Téléchargement..."
                : newProgress < 60
                ? "Vérification..."
                : newProgress < 90
                ? "Installation..."
                : "Finalisation...",
          };
        });
      }, 500);

      // Install the update
      await invoke("install_update");

      clearInterval(progressInterval);
      setUpdateProgress({
        status: "Mise à jour terminée! Redémarrage...",
        progress: 100,
      });

      // The app will restart automatically after update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [updateInfo]);

  /**
   * Clear update info
   */
  const clearUpdateInfo = useCallback(() => {
    setUpdateInfo(null);
    setError(null);
    setUpdateProgress(null);
  }, []);

  // Auto-check for updates on mount (only in production)
  useEffect(() => {
    // Wait a bit before checking to avoid blocking the app startup
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    updateInfo,
    isUpdating,
    updateProgress,
    error,
    installUpdate,
    clearUpdateInfo,
  };
};
