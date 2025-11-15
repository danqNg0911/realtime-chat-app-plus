const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const attributeTheme = document.documentElement.getAttribute("data-theme");
  return attributeTheme || "dark";
};

export const createThemeSlice = (set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("app-theme", theme);
    } catch (error) {
      // ignore storage errors
    }
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        localStorage.setItem("app-theme", nextTheme);
      } catch (error) {
        // ignore storage errors
      }
      return { theme: nextTheme };
    });
  },
});
