/* qufox-docs search palette, backed by the Pagefind JS API. */
(() => {
  const backdrop = document.querySelector("[data-search-backdrop]");
  const input = document.querySelector("[data-search-input]");
  const list = document.querySelector("[data-search-list]");
  if (!backdrop || !input || !list) return;

  const base = (document.querySelector('meta[name="qufox-base"]')?.content || "/").replace(
    /\/*$/,
    "/",
  );

  let pagefind = null;
  let results = [];
  let active = -1;
  let token = 0;

  async function loadPagefind() {
    if (pagefind !== null) return pagefind;
    try {
      pagefind = await import(`${base}pagefind/pagefind.js`);
      await pagefind.init?.();
    } catch {
      pagefind = false;
    }
    return pagefind;
  }

  function open(prefill) {
    backdrop.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (typeof prefill === "string") input.value = prefill;
    input.focus();
    input.select();
    loadPagefind();
    if (input.value.trim()) run();
  }

  function close() {
    backdrop.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return !backdrop.hidden;
  }

  async function run() {
    const query = input.value.trim();
    const mine = ++token;
    if (!query) {
      results = [];
      render("");
      return;
    }
    const pf = await loadPagefind();
    if (pf === false) {
      list.innerHTML = `<li class="qf-cmd-palette__empty">Search is unavailable.</li>`;
      return;
    }
    const search = await pf.search(query);
    if (mine !== token) return; // a newer query superseded this one
    results = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
    active = results.length > 0 ? 0 : -1;
    render(query);
  }

  function render(query) {
    if (results.length === 0) {
      list.innerHTML = query
        ? `<li class="qf-cmd-palette__empty">No results for “${escapeHtml(query)}”.</li>`
        : "";
      return;
    }
    list.innerHTML = results
      .map((result, i) => {
        const title = escapeHtml(result.meta?.title || result.url);
        return (
          `<li class="qf-cmd-palette__row" role="option" data-url="${escapeHtml(result.url)}"` +
          ` aria-selected="${i === active}">` +
          `<span class="qf-cmd-palette__label">${title}</span>` +
          `<span class="qf-cmd-palette__path">${result.excerpt || ""}</span></li>`
        );
      })
      .join("");
  }

  function move(delta) {
    if (results.length === 0) return;
    active = (active + delta + results.length) % results.length;
    for (const [i, row] of [...list.children].entries()) {
      row.setAttribute("aria-selected", String(i === active));
    }
    list.children[active]?.scrollIntoView({ block: "nearest" });
  }

  function go() {
    const url = list.children[active]?.getAttribute("data-url");
    if (url) window.location.href = url;
  }

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go();
    } else if (event.key === "Escape") {
      close();
    }
  });

  list.addEventListener("click", (event) => {
    const row = event.target.closest("[data-url]");
    if (row) window.location.href = row.getAttribute("data-url");
  });

  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) close();
  });

  for (const button of document.querySelectorAll("[data-search-open]")) {
    button.addEventListener("click", () => open());
  }

  document.addEventListener("keydown", (event) => {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (
      (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
      (event.key === "/" && !editing)
    ) {
      event.preventDefault();
      isOpen() ? close() : open();
    }
  });

  if (document.querySelector("[data-search-autoopen]")) {
    const query = new URLSearchParams(window.location.search).get("q") || "";
    open(query);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
