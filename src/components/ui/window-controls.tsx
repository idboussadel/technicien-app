import { useState, useEffect, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowControlsProps {
  showLogo?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function WindowControls({
  showLogo = false,
  className = "",
  children,
}: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    const isCurrentlyMaximized = await window.isMaximized();
    await window.toggleMaximize();
    setIsMaximized(!isCurrentlyMaximized);
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  // Check if window is maximized on component mount
  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();
  }, []);

  return (
    <div className={`h-10 mt-2 ${className}`} data-tauri-drag-region>
      <div className="flex items-center justify-between h-full" data-tauri-drag-region>
        {showLogo && (
          <div className="flex items-center space-x-4 pl-6" data-tauri-drag-region={false}>
            <img
              src="/icon.png"
              alt="Logo"
              className="w-8 h-8 object-contain p-1 border rounded-md"
            />
            {children}
          </div>
        )}

        {/* Window Controls - Absolute positioned at top right */}
        <div className="absolute top-0 right-0 flex h-11" data-tauri-drag-region={false}>
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            className="w-12 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
            aria-label="Minimize"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="5.5" width="12" height="1" rx="0.5" />
            </svg>
          </button>

          {/* Maximize/Restore Button */}
          <button
            onClick={handleMaximize}
            className="w-12 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              >
                {/* Back shape (only top and right sides, trimmed) */}
                <path
                  d="M32 18 
                         h46 
                         a4 4 0 0 1 4 4 
                         v46"
                />

                {/* Front square (shifted right) */}
                <rect x="22" y="28" width="50" height="50" rx="4" ry="4" />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="1" y="1" width="10" height="10" rx="1" />
              </svg>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
            aria-label="Close"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M2 2L10 10" />
              <path d="M10 2L2 10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
