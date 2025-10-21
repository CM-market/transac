import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { ThemeContext } from "./theme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme, isDark } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
