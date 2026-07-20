/* qufox-docs theme toggle: persist the viewer's light/dark choice. */
(() => {
  const root = document.documentElement;

  const apply = (theme) => {
    if (theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
  };

  const current = () => (root.dataset.theme === "light" ? "light" : "dark");

  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.addEventListener("click", () => {
      const next = current() === "light" ? "dark" : "light";
      apply(next);
      try {
        localStorage.setItem("qufox-theme", next);
      } catch {
        /* ignore storage failures (private mode) */
      }
    });
  }
})();
