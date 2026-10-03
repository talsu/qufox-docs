import { messagesFor } from "../i18n.js";
import { Document, type PageContext } from "../layout.js";

export function NotFoundPage(props: PageContext) {
  const t = messagesFor(props.config.site.locale);
  return (
    <Document config={props.config} href={props.href} title={t.notFoundTitle}>
      <div class="qf-empty">
        <div class="qf-empty__title">{t.notFoundTitle}</div>
        <div class="qf-empty__body">{t.notFoundBody}</div>
        <a class="qf-btn qf-btn--primary qf-btn--sm" href={props.href("")}>
          {t.backHome}
        </a>
      </div>
    </Document>
  );
}
