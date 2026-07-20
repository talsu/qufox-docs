import { Document, type PageContext } from "../layout.js";

/** Dedicated, shareable search page. The palette itself lives in the layout. */
export function SearchPage(props: PageContext) {
  return (
    <Document config={props.config} href={props.href} title="Search">
      <div class="qf-page-header">
        <div>
          <h1 class="qf-page-header__title">Search</h1>
          <p class="qf-page-header__subtitle">Find anything across the site.</p>
        </div>
      </div>
      <p>
        Press <kbd class="qf-cmd-palette__kbd">/</kbd> or{" "}
        <kbd class="qf-cmd-palette__kbd">Ctrl</kbd> <kbd class="qf-cmd-palette__kbd">K</kbd> anytime
        to search.
      </p>
      <div data-search-autoopen hidden />
    </Document>
  );
}
