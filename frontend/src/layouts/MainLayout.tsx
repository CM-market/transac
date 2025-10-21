import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import MainNavbar from "@/components/MainNavbar";

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainNavbar />
      <main className="container mx-auto px-4 py-8">
        {children ?? <Outlet />}
      </main>
      <Toaster position="top-right" />
    </div>
  );
};

export default MainLayout;
