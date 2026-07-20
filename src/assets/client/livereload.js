/* qufox-docs live reload (serve mode only). */
(() => {
  const source = new EventSource("/__qufox/events");

  const currentPath = () => {
    try {
      const decoded = decodeURIComponent(location.pathname);
      const trimmed = decoded.replace(/\/+$/, "");
      return trimmed === "" ? "/" : trimmed;
    } catch {
      return location.pathname;
    }
  };

  source.addEventListener("change", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.global || (Array.isArray(data.pages) && data.pages.includes(currentPath()))) {
        location.reload();
      }
    } catch {
      location.reload();
    }
  });

  source.addEventListener("reload", () => location.reload());
})();
