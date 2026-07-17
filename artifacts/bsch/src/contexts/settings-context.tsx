import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiGet } from "@/lib/api";

interface AppSettings {
  hospital_name: string;
  logo_base64: string | null;
  supervisors: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  hospital_name: "مستشفى الأطفال التخصصي بالبحيرة",
  logo_base64: null,
  supervisors: "",
};

const SettingsContext = createContext<{
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
}>({
  settings: DEFAULT_SETTINGS,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem("bsch_settings");
      if (cached) return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const refreshSettings = useCallback(async () => {
    try {
      const data = await apiGet<Record<string, string>>(`/api/settings?_=${Date.now()}`);
      const next: AppSettings = {
        hospital_name: data.hospital_name || DEFAULT_SETTINGS.hospital_name,
        logo_base64: data.logo_base64 || null,
        supervisors: data.supervisors || "",
      };
      setSettings(next);
      localStorage.setItem("bsch_settings", JSON.stringify(next));
    } catch {}
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const { settings } = useContext(SettingsContext);
  return settings;
}

export function useSettingsActions() {
  const { refreshSettings } = useContext(SettingsContext);
  return { refreshSettings };
}
