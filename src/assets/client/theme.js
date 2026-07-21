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

  // Table of contents drawer (hidden by default).
  const panel = document.querySelector("[data-toc-panel]");
  const backdrop = document.querySelector("[data-toc-backdrop]");
  if (panel) {
    const setOpen = (open) => {
      panel.hidden = !open;
      if (backdrop) backdrop.hidden = !open;
      for (const t of document.querySelectorAll("[data-toc-toggle]")) {
        t.setAttribute("aria-expanded", String(open));
      }
    };
    for (const t of document.querySelectorAll("[data-toc-toggle]")) {
      t.addEventListener("click", () => setOpen(panel.hidden));
    }
    for (const c of document.querySelectorAll("[data-toc-close]")) {
      c.addEventListener("click", () => setOpen(false));
    }
    for (const link of panel.querySelectorAll("[data-toc-link]")) {
      link.addEventListener("click", () => setOpen(false));
    }
    backdrop?.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
  }
})();
