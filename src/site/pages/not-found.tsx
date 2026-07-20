import { Document, type PageContext } from "../layout.js";

export function NotFoundPage(props: PageContext) {
  return (
    <Document config={props.config} href={props.href} title="Page not found">
      <div class="qf-empty">
        <div class="qf-empty__title">Page not found</div>
        <div class="qf-empty__body">The page you are looking for does not exist or was moved.</div>
        <a class="qf-btn qf-btn--primary qf-btn--sm" href={props.href("")}>
          Back home
        </a>
      </div>
    </Document>
  );
}
