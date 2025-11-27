export const THEME_SYSTEM = "system";
export const THEME_LIGHT = "light";
export const THEME_DARK = "dark";

const THEME_STORAGE_KEY = "app-theme";

function resolveEffectiveTheme(themePreference) {
  if (themePreference === THEME_SYSTEM) {
    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isDark ? THEME_DARK : THEME_LIGHT;
  }
  return themePreference;
}

function applyThemeClass(effectiveTheme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(effectiveTheme === THEME_DARK ? "theme-dark" : "theme-light");
}

export const createSettingsSlice = (set, get) => ({
  theme: THEME_SYSTEM,
  setTheme: (themePreference) => {
    const effective = resolveEffectiveTheme(themePreference);
    applyThemeClass(effective);
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    set({ theme: themePreference });
  },
  initializeTheme: () => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const pref = stored === THEME_LIGHT || stored === THEME_DARK ? stored : THEME_SYSTEM;
      const effective = resolveEffectiveTheme(pref);
      applyThemeClass(effective);
      set({ theme: pref });
      // React to system changes when on system mode
      if (pref === THEME_SYSTEM && window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => applyThemeClass(mq.matches ? THEME_DARK : THEME_LIGHT);
        mq.addEventListener?.("change", handler);
      }
    } catch (_) {
      // noop
    }
  },
});

