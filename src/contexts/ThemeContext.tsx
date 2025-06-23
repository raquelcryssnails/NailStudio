
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSettings } from './SettingsContext';

interface ThemeContextType {
  currentTheme: string;
  setAppTheme: (themeName: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: settingsTheme, setAppSettingsState, isLoadingSettings } = useSettings();
  const [currentTheme, setCurrentTheme] = useState("light");

  // Effect to initialize theme from localStorage or settings once settings are loaded
  useEffect(() => {
    if (!isLoadingSettings) {
      const storedTheme = localStorage.getItem('theme');
      setCurrentTheme(storedTheme || settingsTheme || 'light');
    }
  }, [isLoadingSettings, settingsTheme]);

  // Effect to apply the theme class to the HTML element whenever currentTheme changes
  useEffect(() => {
    const themeToApply = currentTheme;
    const allThemes = ["dark", "theme-pastel-lavender", "theme-pastel-mint", "theme-pastel-peach", "theme-pastel-rose", "theme-pastel-sky"];
    
    document.documentElement.classList.remove(...allThemes);

    if (themeToApply === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themeToApply && themeToApply !== "light") {
      document.documentElement.classList.add(`theme-${themeToApply}`);
    }
  }, [currentTheme]);

  const setAppTheme = useCallback((themeName: string) => {
    setCurrentTheme(themeName);
    localStorage.setItem("theme", themeName);
    setAppSettingsState({ theme: themeName });

    if (themeName !== "dark") {
      localStorage.setItem("lastActiveLightTheme", themeName);
    }
  }, [setAppSettingsState]);
  
  const toggleTheme = useCallback(() => {
    const lastLightTheme = localStorage.getItem("lastActiveLightTheme") || "light";
    const newTheme = currentTheme === "dark" ? lastLightTheme : "dark";
    setAppTheme(newTheme);
  }, [currentTheme, setAppTheme]);
  
  const contextValue = { 
      currentTheme, 
      setAppTheme, 
      toggleTheme 
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
