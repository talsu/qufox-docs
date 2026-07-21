/* qufox-docs appearance controls: persist the viewer's theme and brand. */
(() => {
  const root = document.documentElement;
  const store = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore storage failures (private mode) */
    }
  };

  // Theme (light / dark).
  const currentTheme = () => (root.dataset.theme === "light" ? "light" : "dark");
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.addEventListener("click", () => {
      const next = currentTheme() === "light" ? "dark" : "light";
      root.dataset.theme = next;
      store("qufox-theme", next);
    });
  }

  // Brand accent.
  for (const select of document.querySelectorAll("[data-brand-select]")) {
    select.value = root.dataset.brand || "qufox";
    select.addEventListener("change", () => {
      const brand = select.value;
      if (brand && brand !== "qufox") root.dataset.brand = brand;
      else delete root.dataset.brand;
      store("qufox-brand", brand);
    });
  }
})();
