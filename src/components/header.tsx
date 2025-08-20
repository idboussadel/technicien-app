import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Search, User, LogOut, Slash, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WindowControls from "@/components/ui/window-controls";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import { Ferme, BandeWithDetails, BatimentWithDetails } from "@/types";

interface NavItem {
  id: string;
  label: string;
  path: string;
}

interface HeaderProps {
  fermes: Ferme[];
  selectedFerme: Ferme | null;
  onFermeChange: (ferme: Ferme) => void;
  selectedBande?: BandeWithDetails | null;
  onBandeChange?: (bande: BandeWithDetails) => void;
  latestBandes?: BandeWithDetails[]; // Latest 10 bandes for suggestions
  selectedBatiment?: BatimentWithDetails | null;
  onBatimentChange?: (batiment: BatimentWithDetails) => void;
  batiments?: BatimentWithDetails[]; // Batiments for the selected bande
  onNewFerme?: () => void;
  onRefreshFermes?: () => void;
  onRefreshBandes?: () => void;
  showBreadcrumb?: boolean;
  breadcrumbLevel?: "ferme" | "bande" | "batiment" | "semaine";
  navItems: NavItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAccountClick: () => void;
}

export default function Header({
  fermes,
  selectedFerme,
  onFermeChange,
  selectedBande,
  onBandeChange,
  latestBandes = [],
  selectedBatiment,
  onBatimentChange,
  batiments = [],
  showBreadcrumb = false,
  breadcrumbLevel = "ferme",
  navItems,
  searchValue,
  onSearchChange,
  onAccountClick,
}: HeaderProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const {} = useAutoUpdate();

  const handleSignOut = async () => {
    await logout();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
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
    <div className="fixed top-0 left-0 right-0 bg-white z-50">
      {/* Window Controls */}
      <WindowControls showLogo={true}>
        {/* Breadcrumb Navigation */}
        {showBreadcrumb && (
          <div className="flex items-center space-x-2 text-sm">
            {/* Ferme Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer capitalize items-center space-x-2 px-3 py-2 hover:bg-muted text-foreground rounded-md transition-colors group min-w-0 max-w-64">
                  <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedFerme ? selectedFerme.nom : "Sélectionner une ferme"}
                  </span>
                  <ChevronsUpDown className="w-3 h-3 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                {/* Option pour toutes les fermes - seulement sur le dashboard */}
                {location.pathname === "/" && (
                  <DropdownMenuItem
                    onClick={() =>
                      onFermeChange({ id: 0, nom: "Toutes les fermes", nbr_meuble: 0 })
                    }
                    className="cursor-pointer flex items-center justify-between p-2"
                  >
                    <p className="font-medium text-foreground">Toutes les fermes</p>
                    {(!selectedFerme || selectedFerme.id === 0) && (
                      <Check className="w-3 h-3 text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                )}
                {/* Fermes individuelles */}
                {fermes.map((ferme) => (
                  <DropdownMenuItem
                    key={ferme.id}
                    onClick={() => onFermeChange(ferme)}
                    className="cursor-pointer flex items-center justify-between p-2"
                  >
                    <p className="font-medium capitalize text-foreground">{ferme.nom}</p>
                    {selectedFerme?.id === ferme.id && (
                      <Check className="w-3 h-3 text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Show separator and bande selector if we're at bande level or deeper */}
            {breadcrumbLevel !== "ferme" && (
              <>
                <Slash className="w-3 h-3 text-muted-foreground -rotate-24" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex cursor-pointer items-center space-x-2 px-3 py-2 hover:bg-muted text-foreground rounded-md transition-colors group min-w-0 max-w-64">
                      <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {selectedBande ? `Bande ${selectedBande.id}` : "Sélectionner une bande"}
                      </span>
                      <ChevronsUpDown className="w-3 h-3 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-56">
                    {/* Show current selected bande if it's not in latest suggestions */}
                    {selectedBande && !latestBandes.some((b) => b.id === selectedBande.id) && (
                      <>
                        <DropdownMenuItem
                          key={selectedBande.id}
                          onClick={() => onBandeChange?.(selectedBande)}
                          className="cursor-pointer flex items-center justify-between p-2"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {selectedBande.id}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">
                              Bande {selectedBande.id} -{" "}
                              {new Date(selectedBande.date_entree).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Show latest bandes suggestions */}
                    {latestBandes.map((bande) => (
                      <DropdownMenuItem
                        key={bande.id}
                        onClick={() => onBandeChange?.(bande)}
                        className="cursor-pointer flex items-center justify-between p-2"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">{bande.id}</span>
                          </div>
                          <span className="font-medium text-foreground">
                            Bande {bande.id} -{" "}
                            {new Date(bande.date_entree).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        {selectedBande?.id === bande.id && (
                          <Check className="w-3 h-3 text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}

                    {latestBandes.length === 0 && !selectedBande && (
                      <DropdownMenuItem disabled className="p-2 text-muted-foreground">
                        Aucune bande disponible
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* Show separator and batiment selector if we're at batiment level or deeper */}
            {(breadcrumbLevel === "batiment" || breadcrumbLevel === "semaine") && (
              <>
                <Slash className="w-3 h-3 text-muted-foreground -rotate-24" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex cursor-pointer items-center space-x-2 px-3 py-2 hover:bg-muted text-foreground rounded-md transition-colors group min-w-0 max-w-64">
                      <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {selectedBatiment
                          ? `Bâtiment ${selectedBatiment.numero_batiment}`
                          : "Sélectionner un bâtiment"}
                      </span>
                      <ChevronsUpDown className="w-3 h-3 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-56">
                    {batiments.map((batiment) => (
                      <DropdownMenuItem
                        key={batiment.id}
                        onClick={() => onBatimentChange?.(batiment)}
                        className="cursor-pointer flex items-center justify-between p-2"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-green-600">
                              {batiment.numero_batiment}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">
                            Bâtiment {batiment.numero_batiment} - {batiment.poussin_nom} (
                            {batiment.quantite})
                          </span>
                        </div>
                        {selectedBatiment?.id === batiment.id && (
                          <Check className="w-3 h-3 text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}

                    {batiments.length === 0 && (
                      <DropdownMenuItem disabled className="p-2 text-muted-foreground">
                        Aucun bâtiment disponible
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </WindowControls>

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
                    <Avatar className="w-8 h-8 hover:ring-2 ring-border hover:ring-ring transition-all cursor-pointer">
                      <AvatarFallback className="bg-orange-100 border border-orange-600 text-orange-600 text-sm font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10  ">
                        <AvatarFallback className="bg-orange-100 border border-orange-600 text-orange-600 text-sm font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user?.username || "Utilisateur"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user?.email || "email@exemple.com"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem onClick={onAccountClick} className="cursor-pointer">
                      <User className="w-4 h-4 mr-3" />
                      Compte
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
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
