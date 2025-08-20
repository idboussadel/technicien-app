import { useEffect } from "react";
import { Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import { toast } from "sonner";

/**
 * Composant de notification de mise à jour automatique
 * Utilise des toasts shadcn pour afficher les notifications
 */
export function UpdateNotification() {
  const { updateInfo, isUpdating, updateProgress, error, installUpdate, clearUpdateInfo } =
    useAutoUpdate();

  // Show update notification toast when update is available
  useEffect(() => {
    if (updateInfo?.available && !isUpdating) {
      toast(
        <div className="space-y-4">
          {/* Header with icon and title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <Download className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Mise à jour disponible</h4>
              <p className="text-sm text-slate-600">Une nouvelle version est disponible</p>
            </div>
          </div>

          {/* X button positioned at far top right */}
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-600" />
          </Button>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              Mettre à jour
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-medium"
            >
              Plus tard
            </Button>
          </div>
        </div>,
        {
          duration: Infinity,
          position: "bottom-right",
          className: "w-80",
        }
      );
    }
  }, [updateInfo?.available, updateInfo?.version]);

  // Show progress toast when updating
  useEffect(() => {
    if (isUpdating && updateProgress) {
      toast(
        <div className="space-y-4 !w-full !max-w-none !block">
          {/* Header with icon, title, and X button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <Download className="w-4 h-4 text-slate-600 animate-pulse" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Mise à jour en cours</h4>
                <p className="text-sm text-slate-600">{updateProgress.status}</p>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-600" />
            </Button>
          </div>

          {/* Progress section with custom progress bar */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progression</span>
                <span className="font-medium text-slate-900">
                  {Math.round(updateProgress.progress)}%
                </span>
              </div>
              {/* Custom progress bar that truly spans full width */}
              <div className="!w-full !min-w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${updateProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>,
        {
          id: "update-progress",
          duration: Infinity,
          position: "bottom-right",
          className: "w-80 !block",
        }
      );
    }
  }, [isUpdating, updateProgress]);

  // Show success toast when update is complete
  useEffect(() => {
    if (updateProgress?.progress === 100) {
      toast.success(
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Mise à jour terminée</h4>
            <p className="text-sm text-slate-600">L'application va redémarrer...</p>
          </div>
        </div>,
        {
          id: "update-success",
          duration: 5000,
          position: "bottom-right",
          className: "w-80",
        }
      );
    }
  }, [updateProgress?.progress]);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      console.error("🚨 [FRONTEND] Displaying error toast:", error);
      toast.error(
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Erreur de mise à jour</h4>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          </div>
          
          {/* Debug info for developers */}
          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border">
            <p><strong>Debug:</strong> Vérifiez la console pour plus de détails</p>
            <p><strong>Version actuelle:</strong> {updateInfo?.version || "Inconnue"}</p>
          </div>
        </div>,
        {
          id: "update-error",
          duration: 15000,
          position: "bottom-right",
          className: "w-80",
        }
      );
    }
  }, [error, updateInfo?.version]);

  const handleInstall = async () => {
    await installUpdate();
  };

  const handleDismiss = () => {
    clearUpdateInfo();
    toast.dismiss();
  };

  // This component doesn't render anything visible
  // It only manages toast notifications
  return null;
}
