import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { type Theme, getThemeById, applyThemeToDOM, loadThemeId, saveThemeId } from './themes';

let currentThemeId = loadThemeId();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentThemeId;
}

export function useTheme(): { theme: Theme; themeId: string; setTheme: (id: string) => void } {
  const themeId = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((id: string) => {
    currentThemeId = id;
    saveThemeId(id);
    applyThemeToDOM(getThemeById(id));
    notify();
  }, []);

  useEffect(() => {
    applyThemeToDOM(getThemeById(themeId));
  }, [themeId]);

  return { theme: getThemeById(themeId), themeId, setTheme };
}
