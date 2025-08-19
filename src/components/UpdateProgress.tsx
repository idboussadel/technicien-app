import React from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle } from "lucide-react";
import { UpdateProgress as UpdateProgressType } from "@/hooks/useAutoUpdate";

interface UpdateProgressProps {
  progress: UpdateProgressType;
  isComplete?: boolean;
}

/**
 * Component that displays update progress in the bottom right corner
 */
export const UpdateProgress: React.FC<UpdateProgressProps> = ({ progress, isComplete = false }) => {
  const getStatusColor = () => {
    if (isComplete) return "bg-green-100 text-green-800 border-green-200";
    if (progress.progress > 50) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getIcon = () => {
    if (isComplete) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Download className="h-4 w-4 text-blue-600" />;
  };

  return (
    <Card className={`fixed bottom-4 right-4 w-80 shadow-lg border-2 ${getStatusColor()} z-50`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {getIcon()}
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {isComplete ? "Mise à jour terminée" : "Mise à jour en cours"}
            </h4>
            <p className="text-xs opacity-80">{progress.status}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {Math.round(progress.progress)}%
          </Badge>
        </div>

        <Progress value={progress.progress} className="h-2" />

        {!isComplete && (
          <div className="mt-2 text-xs opacity-70">
            Ne fermez pas l'application pendant la mise à jour
          </div>
        )}
      </CardContent>
    </Card>
  );
};
