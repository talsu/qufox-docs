/** Numbered pagination control. `pageHref(n)` builds the URL for page n. */
export function Pagination(props: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  const { page, totalPages, pageHref } = props;
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination">
      <ul class="qf-pagination">
        {page > 1 ? (
          <li>
            <a class="qf-pagination__item" href={pageHref(page - 1)} aria-label="Previous">
              ‹
            </a>
          </li>
        ) : null}
        {pages.map((n) =>
          n === page ? (
            <li>
              <span class="qf-pagination__item" aria-current="page">
                {n}
              </span>
            </li>
          ) : (
            <li>
              <a class="qf-pagination__item" href={pageHref(n)}>
                {n}
              </a>
            </li>
          ),
        )}
        {page < totalPages ? (
          <li>
            <a class="qf-pagination__item" href={pageHref(page + 1)} aria-label="Next">
              ›
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
