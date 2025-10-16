/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Search,
  ShoppingCart,
  User,
  Download,
  ChevronDown,
  Settings,
  UserCircle,
  LogOut,
  Heart,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const MainNavbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { cartItems } = useCart();
  const { favorites } = useFavorites();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const favoritesCount = favorites.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleInstallPWA = () => {
    // This will only work if the app is installable
    if ("BeforeInstallPromptEvent" in window) {
      window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent the default browser install prompt
        e.preventDefault();

        // Cast the event to our custom type
        const promptEvent = e as BeforeInstallPromptEvent;

        // Show the install prompt
        promptEvent.prompt();

        // Wait for the user to respond to the prompt
        promptEvent.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
          } else {
            console.log("User dismissed the install prompt");
          }
        });
      });
    }
  };

  // Check if user is logged in as Buyer
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName");
  const token = localStorage.getItem("token");
  const isBuyerLoggedIn = userRole === "Buyer" && !!token;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    setShowLogoutConfirm(false);
    setUserDropdownOpen(false);
    navigate("/");
    window.location.reload(); // To force navbar update
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".buyer-dropdown")) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      window.addEventListener("mousedown", handleClick);
    }
    return () => window.removeEventListener("mousedown", handleClick);
  }, [userDropdownOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 w-full shadow-sm">
      <div className="container mx-auto flex items-center h-20 px-4">
        {/* Logo */}
        <Link
          to="/"
          className="font-bold text-2xl flex items-center shrink-0 text-cm-forest"
        >
          <img
            src="/logo.png"
            alt="Transac"
            className="h-12 sm:h-14 w-auto mr-2"
          />
          <span className="hidden sm:inline">Transac</span>
        </Link>

        {/* Mobile Action Buttons - Always visible on mobile */}
        <div className="flex-1 flex items-center justify-end md:hidden">
          <div className="flex items-center gap-1">
            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 relative text-gray-700"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-cm-red text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <Button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 shrink-0 ml-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-gray-800"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </Button>

        {/* Main Navigation - Desktop */}
        <div className="hidden md:flex flex-1 justify-center">
          <NavigationMenu>
            <NavigationMenuList className="gap-4">
              {["Home", "Products", "About"].map((item) => (
                <NavigationMenuItem key={item}>
                  <NavigationMenuLink
                    href={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                    className={cn(
                      "text-md font-medium text-gray-600 hover:text-cm-green transition-colors duration-300 pb-2",
                      isActive(
                        item === "Home" ? "/" : `/${item.toLowerCase()}`,
                      ) && "text-cm-green border-b-2 border-cm-green",
                    )}
                  >
                    {t(`navigation.${item.toLowerCase()}`)}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right-side actions - Desktop */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="search"
              placeholder={t("mainNavbar.searchPlaceholder")}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "h-11 pl-10 pr-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cm-green transition-all duration-300",
                isSearchFocused ? "w-64" : "w-48",
              )}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </form>
          <Link to="/cart">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 text-gray-700 hover:bg-gray-100"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-cm-red text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/favorites">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 text-gray-700 hover:bg-gray-100"
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 bg-cm-red text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleInstallPWA}
            className="md:flex hidden h-11 w-11 text-gray-700 hover:bg-gray-100"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-2" />
          {isBuyerLoggedIn ? (
            <div className="relative buyer-dropdown shrink-0">
              <Button
                className="font-semibold flex items-center gap-2 focus:outline-none bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
                onClick={() => setUserDropdownOpen((open) => !open)}
              >
                <User className="h-5 w-5 text-gray-800" />
                <span className="text-gray-800">{userName}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${userDropdownOpen ? "rotate-180" : ""} text-gray-800`}
                />
              </Button>
              {userDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white border rounded-lg shadow-xl z-[100] overflow-hidden animate-fade-in">
                  <div className="p-2">
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-500">
                        {t("mainNavbar.signedInAs")}
                      </p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userName}
                      </p>
                    </div>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left px-3 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate("/buyer/account-info");
                      }}
                    >
                      <User className="h-4 w-4" />
                      {t("mainNavbar.accountInfo")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left px-3 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate("/buyer/settings");
                      }}
                    >
                      <Settings className="h-4 w-4" />
                      {t("mainNavbar.settings")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left px-3 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate("/buyer/account");
                      }}
                    >
                      <UserCircle className="h-4 w-4" />
                      {t("mainNavbar.account")}
                    </Button>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left px-3 py-2 text-cm-red hover:bg-red-50 flex items-center gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("mainNavbar.logout")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white w-full absolute shadow-lg animate-fade-in">
          <nav className="container mx-auto px-4 py-4">
            <ul className="space-y-2">
              {["Home", "Products", "About"].map((item) => (
                <li key={item}>
                  <Link
                    to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                    className="block px-4 py-3 rounded-lg text-lg font-medium hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t(`navigation.${item.toLowerCase()}`)}
                  </Link>
                </li>
              ))}

              {/* Login and Signup buttons in toggle menu */}
              {!isBuyerLoggedIn ? (
                <>
                  <Separator className="my-4" />
                  <li className="mt-4">
                    <Link
                      to="/login"
                      className="block px-4 py-3 rounded-full text-lg font-medium border-2 border-cm-green text-cm-green text-center hover:bg-green-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("mainNavbar.login")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/buyer/register"
                      className="block px-4 py-3 rounded-full text-lg font-medium bg-cm-green text-white text-center mt-2 hover:bg-cm-forest"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("mainNavbar.signUp")}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <Separator className="my-4" />
                  <div className="pt-2 space-y-2">
                    <div className="px-4 font-semibold text-cm-green mb-2">
                      {userName}
                    </div>
                    <Link
                      to="/buyer/account-info"
                      className="px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      {t("mainNavbar.accountInfo")}
                    </Link>
                    <Link
                      to="/buyer/settings"
                      className="px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      {t("mainNavbar.settings")}
                    </Link>
                    <Link
                      to="/buyer/account"
                      className="px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <UserCircle className="h-5 w-5" />
                      {t("mainNavbar.account")}
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left px-4 py-3 text-cm-red hover:bg-red-50 flex items-center gap-3"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      {t("mainNavbar.logout")}
                    </Button>
                  </div>
                </>
              )}
            </ul>
          </nav>
        </div>
      )}

      {/* Logout Confirmation Modal - Shared between mobile and desktop */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 animate-fade-in">
            <h3 className="text-lg font-semibold mb-2">
              {t("mainNavbar.confirmLogoutTitle")}
            </h3>
            <p className="mb-6 text-gray-600">
              {t("mainNavbar.confirmLogoutMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelLogout}>
                {t("mainNavbar.cancel")}
              </Button>
              <Button
                variant="destructive"
                className="bg-cm-red hover:bg-red-700"
                onClick={confirmLogout}
              >
                {t("mainNavbar.yesLogout")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MainNavbar;
