import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Plus, Search, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Ferme {
  id: number;
  nom: string;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
}

interface HeaderProps {
  fermes: Ferme[];
  selectedFerme: Ferme | null;
  onFermeChange: (ferme: Ferme) => void;
  onNewFerme?: () => void;
  showFermeSelector?: boolean;
  navItems: NavItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAccountClick: () => void;
  onSignOut: () => void;
}

export default function Header({
  fermes,
  selectedFerme,
  onFermeChange,
  onNewFerme,
  showFermeSelector = false,
  navItems,
  searchValue,
  onSearchChange,
  onAccountClick,
  onSignOut,
}: HeaderProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const handleNewFerme = () => {
    if (onNewFerme) {
      onNewFerme();
    } else {
      console.log("New ferme clicked");
    }
  };

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  // Update indicator position when route changes
  useEffect(() => {
    const updateIndicator = () => {
      if (navRef.current) {
        const currentPath = location.pathname;
        const activeItem = navItems.find((item) => item.path === currentPath) || navItems[0];
        const navLinksContainer = navRef.current.querySelector(
          ".flex.space-x-8.relative"
        ) as HTMLElement;
        if (navLinksContainer) {
          const activeButton = navLinksContainer.querySelector(
            `[data-path="${activeItem.path}"]`
          ) as HTMLElement;
          if (activeButton) {
            setIndicatorStyle({
              left: activeButton.offsetLeft,
              width: activeButton.offsetWidth,
            });
          }
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, navItems]);

  return (
    <div className="fixed top-0 left-0 right-0 bg-background backdrop-blur-sm z-50">
      {/* Top Header Bar */}
      <div className="h-13" data-tauri-drag-region>
        <div className="flex items-center justify-between h-full" data-tauri-drag-region>
          <div className="flex items-center space-x-4 pl-6" data-tauri-drag-region={false}>
            {/* Logo */}
            <img src="src\assets\icon.png" alt="Logo" className="w-8 h-8 p-1 border rounded-md" />

            {/* Ferme Selector - Only show on ferme-related pages */}
            {showFermeSelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <span className="font-medium">
                      {selectedFerme ? selectedFerme.nom : "Sélectionner une ferme"}
                    </span>
                    <svg
                      className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1">
                  {fermes.map((ferme) => (
                    <DropdownMenuItem
                      key={ferme.id}
                      onClick={() => onFermeChange(ferme)}
                      className="cursor-pointer flex items-center justify-between p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-medium">
                            {ferme.nom.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{ferme.nom}</span>
                      </div>
                      {selectedFerme?.id === ferme.id && (
                        <Check className="w-4 h-4 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <DropdownMenuItem onClick={handleNewFerme} className="cursor-pointer p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-blue-600">Nouvelle ferme</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Window Controls */}
          <div className="flex h-full" data-tauri-drag-region={false}>
            <button
              onClick={handleMinimize}
              className="w-12 h-full flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <rect x="3" y="5.5" width="6" height="1" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-12 h-full flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="2.5" y="2.5" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6.707 6l2.647-2.646a.5.5 0 0 0-.708-.708L6 5.293 3.354 2.646a.5.5 0 1 0-.708.708L5.293 6 2.646 8.646a.5.5 0 1 0 .708.708L6 6.707l2.646 2.647a.5.5 0 0 0 .708-.708L6.707 6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="h-13 bg-background border-b border-border">
        <div className="px-6 h-full">
          <div className="flex justify-between items-center h-full" ref={navRef}>
            {/* Left side: Navigation Links */}
            <div className="flex space-x-8 relative h-full">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    data-path={item.path}
                    className={`py-4 text-sm font-medium transition-colors duration-200 relative z-10 h-full flex items-center ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-foreground transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            </div>

            {/* Right side: Search and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 w-64 bg-muted border-border focus:bg-background focus:border-ring transition-all duration-200"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border shadow-sm">
                  Ctrl+K
                </kbd>
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className="w-8 h-8 ring-2 ring-border hover:ring-ring transition-all cursor-pointer">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm font-medium">
                        T
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-medium">
                          T
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Technicien</p>
                        <p className="text-sm text-muted-foreground truncate">
                          technicien@ferme.com
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem onClick={onAccountClick} className="cursor-pointer">
                      <User className="w-4 h-4 mr-3" />
                      Compte
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-3" />
                      Se déconnecter
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
