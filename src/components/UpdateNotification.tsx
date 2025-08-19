import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, X } from "lucide-react";
import { UpdateInfo } from "@/hooks/useAutoUpdate";

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onInstall: () => void;
  onDismiss: () => void;
  isInstalling?: boolean;
}

/**
 * Component that displays an update notification when a new version is available
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onInstall,
  onDismiss,
  isInstalling = false,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-96 shadow-lg border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Nouvelle mise à jour disponible</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isInstalling}
            className="h-8 w-8 p-0 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-blue-700">
          Une nouvelle version de l'application est disponible
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Version {updateInfo.version}
          </Badge>
          {updateInfo.date && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Calendar className="h-3 w-3" />
              {formatDate(updateInfo.date)}
            </div>
          )}
        </div>

        {updateInfo.body && (
          <div className="text-sm text-blue-800 bg-blue-100 p-3 rounded-md">
            <p className="font-medium mb-1">Nouvelles fonctionnalités :</p>
            <p className="text-blue-700 leading-relaxed">{updateInfo.body}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          onClick={onInstall}
          disabled={isInstalling}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isInstalling ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Installation...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Installer maintenant
            </>
          )}
        </Button>

        {!isInstalling && (
          <Button
            variant="outline"
            onClick={onDismiss}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Plus tard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
