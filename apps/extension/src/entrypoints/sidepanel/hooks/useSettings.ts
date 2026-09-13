import { useCallback, useEffect, useState } from 'react';
import { getSettings, onSettingsChanged, saveSettings, type Settings } from '@/lib/storage';

export interface SettingsController {
  /** Null until the first read from storage completes. */
  settings: Settings | null;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export function useSettings(): SettingsController {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((loaded) => {
        if (active) setSettings(loaded);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    const stop = onSettingsChanged((next) => {
      setSettings(next);
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  }, []);

  return { settings, update };
}
