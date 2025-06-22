
"use client";

import * as React from "react";
import { useSettings } from "@/contexts/SettingsContext"; // Assuming salonName might come from settings

interface DynamicCopyrightYearProps {
  defaultSalonName?: string;
}

export function DynamicCopyrightYear({ defaultSalonName = "NailStudio AI" }: DynamicCopyrightYearProps) {
  const [year, setYear] = React.useState<number | null>(null);
  const { salonName: settingsSalonName } = useSettings();

  React.useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const displaySalonName = settingsSalonName || defaultSalonName;

  if (year === null) {
    // Render a placeholder or nothing during SSR and initial client render before useEffect runs
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground font-body">
        © {displaySalonName}. Beleza e Inovação.
      </p>
    );
  }

  return (
    <p className="mt-8 text-center text-sm text-muted-foreground font-body">
      © {year} {displaySalonName}. Beleza e Inovação.
    </p>
  );
}
