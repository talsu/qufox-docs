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

  /**
   * Wire a drawer that is hidden by default: toggled from the navbar, closed by
   * its close button, its backdrop, Escape, or following a link inside it.
   * `name` selects the data-attribute family (data-<name>-panel, -backdrop,
   * -toggle, -close, -link).
   */
  const setupDrawer = (name) => {
    const panel = document.querySelector(`[data-${name}-panel]`);
    if (!panel) return;
    const backdrop = document.querySelector(`[data-${name}-backdrop]`);
    const toggles = document.querySelectorAll(`[data-${name}-toggle]`);

    const setOpen = (open) => {
      panel.hidden = !open;
      if (backdrop) backdrop.hidden = !open;
      for (const t of toggles) t.setAttribute("aria-expanded", String(open));
    };

    for (const t of toggles) t.addEventListener("click", () => setOpen(panel.hidden));
    for (const c of document.querySelectorAll(`[data-${name}-close]`)) {
      c.addEventListener("click", () => setOpen(false));
    }
    for (const link of panel.querySelectorAll(`[data-${name}-link]`)) {
      link.addEventListener("click", () => setOpen(false));
    }
    backdrop?.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
  };

  setupDrawer("toc"); // table of contents (right)
  setupDrawer("tree"); // folder tree (left)
})();
