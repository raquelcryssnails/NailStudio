
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: settingsTheme, setAppSettingsState, isLoadingSettings } = useSettings();
  const [currentTheme, setCurrentTheme] = useState("light"); // This is our primary source of truth
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  const applyThemeClasses = useCallback((themeToApply: string) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove("dark", "theme-pastel-lavender", "theme-pastel-mint", "theme-pastel-peach", "theme-pastel-rose", "theme-pastel-sky");
    if (themeToApply === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themeToApply && themeToApply !== "light") {
      document.documentElement.classList.add(`theme-${themeToApply}`);
    }
  }, []);

  // This effect runs once to determine the initial theme from the best available source.
  useEffect(() => {
    if (!isLoadingSettings && !isThemeLoaded) {
      // Prioritize localStorage to reflect immediate user changes from previous sessions.
      const storedTheme = localStorage.getItem("theme");
      const initialTheme = storedTheme || settingsTheme || "light";
      
      setCurrentTheme(initialTheme);
      applyThemeClasses(initialTheme);
      setIsThemeLoaded(true);
    }
  }, [isLoadingSettings, settingsTheme, applyThemeClasses, isThemeLoaded]);

  const setAppTheme = useCallback((themeName: string) => {
    if (!isThemeLoaded) return; // Don't allow changes until initial theme is loaded

    setCurrentTheme(themeName);
    applyThemeClasses(themeName);
    localStorage.setItem("theme", themeName);
    setAppSettingsState({ theme: themeName }); // Persist to Firestore in the background

    // Keep track of the last non-dark theme for easy toggling
    if (themeName !== "dark") {
      localStorage.setItem("lastActiveLightTheme", themeName);
    }
  }, [isThemeLoaded, applyThemeClasses, setAppSettingsState]);
  
  const toggleTheme = useCallback(() => {
    if (!isThemeLoaded) return;
    const lastLightTheme = localStorage.getItem("lastActiveLightTheme") || "light";
    const newTheme = currentTheme === "dark" ? lastLightTheme : "dark";
    setAppTheme(newTheme);
  }, [currentTheme, setAppTheme, isThemeLoaded]);
  
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
