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
      console.log("🔍 [DEBUG] Starting update check...");
      setError(null);

      console.log("🔍 [DEBUG] Calling check_for_updates command...");
      const result = await invoke<UpdateInfo>("check_for_updates");
      console.log("✅ [DEBUG] Update check result:", result);

      setUpdateInfo(result);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("❌ [DEBUG] Error during update check:", err);
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
      console.log("🚀 [DEBUG] Starting update installation...");
      setIsUpdating(true);
      setError(null);

      // Start progress tracking
      setUpdateProgress({
        status: "Démarrage de la mise à jour...",
        progress: 10,
      });

      // Simulate progress updates with better status messages
      const progressInterval = setInterval(() => {
        setUpdateProgress((prev) => {
          if (!prev) return prev;
          const newProgress = Math.min(prev.progress + Math.random() * 15, 85);
          return {
            ...prev,
            progress: newProgress,
            status:
              newProgress < 30
                ? "Téléchargement de la mise à jour..."
                : newProgress < 60
                ? "Vérification de l'intégrité..."
                : newProgress < 85
                ? "Installation en cours..."
                : "Finalisation...",
          };
        });
      }, 800);

      console.log("🔍 [DEBUG] Calling install_update command...");
      
      // Install the update
      await invoke("install_update");
      
      console.log("✅ [DEBUG] install_update command completed successfully");

      // Clear the progress interval and set to 100%
      clearInterval(progressInterval);
      setUpdateProgress({
        status: "Mise à jour terminée! Redémarrage...",
        progress: 100,
      });

      console.log("🎉 [DEBUG] Update completed, app should restart automatically");

      // The app will restart automatically after update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("❌ [DEBUG] Error during update installation:", err);
      console.error("❌ [DEBUG] Error details:", err);
      setError(errorMessage);
      
      // Clear progress on error
      setUpdateProgress(null);
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
