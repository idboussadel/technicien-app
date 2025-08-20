import React from "react";
import { UpdateNotification } from "./UpdateNotification";

/**
 * Main component that manages the auto-update functionality
 * Shows update notifications and progress as needed
 */
export const AutoUpdateManager: React.FC = () => {
  // Just render UpdateNotification - it handles everything internally
  return <UpdateNotification />;
};
