import React, { useEffect, useState } from "react";
import { UpdateNotification } from "./UpdateNotification";
import { UpdateProgress } from "./UpdateProgress";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";

/**
 * Main component that manages the auto-update functionality
 * Shows update notifications and progress as needed
 */
export const AutoUpdateManager: React.FC = () => {
  const { updateInfo, isUpdating, updateProgress, error, installUpdate, clearUpdateInfo } =
    useAutoUpdate();

  const [showNotification, setShowNotification] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Show notification when update is available
  useEffect(() => {
    if (updateInfo?.available && !isUpdating) {
      setShowNotification(true);
    }
  }, [updateInfo, isUpdating]);

  // Show progress when updating
  useEffect(() => {
    if (isUpdating && updateProgress) {
      setShowProgress(true);
      setShowNotification(false);
    }
  }, [isUpdating, updateProgress]);

  // Hide progress when update is complete
  useEffect(() => {
    if (updateProgress?.progress === 100) {
      const timer = setTimeout(() => {
        setShowProgress(false);
        clearUpdateInfo();
      }, 3000); // Show completion message for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [updateProgress, clearUpdateInfo]);

  const handleInstall = async () => {
    setShowNotification(false);
    await installUpdate();
  };

  const handleDismiss = () => {
    setShowNotification(false);
    clearUpdateInfo();
  };

  // Don't render anything if no updates or not updating
  if (!showNotification && !showProgress) {
    return null;
  }

  return (
    <>
      {/* Update Notification */}
      {showNotification && updateInfo && (
        <div className="fixed top-4 right-4 z-50">
          <UpdateNotification
            updateInfo={updateInfo}
            onInstall={handleInstall}
            onDismiss={handleDismiss}
            isInstalling={isUpdating}
          />
        </div>
      )}

      {/* Update Progress */}
      {showProgress && updateProgress && (
        <UpdateProgress progress={updateProgress} isComplete={updateProgress.progress === 100} />
      )}

      {/* Error Display (optional) */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Erreur de mise à jour:</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
