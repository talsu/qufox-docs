/**
 * Interface text. The engine speaks the language of `site.locale`; content is
 * never translated. Add a language by adding a table here.
 */
export interface Messages {
  skipToContent: string;
  navMain: string;
  browse: string;
  tags: string;
  archive: string;
  browseFiles: string;
  files: string;
  onThisPage: string;
  close: string;
  toggleTheme: string;
  brandColor: string;
  toTop: string;
  home: string;
  breadcrumb: string;
  feed: string;
  siteLinks: string;
  poweredBy: string;
  allTags: string;
  byYear: string;
  postCount: (count: number) => string;
  tagCount: (count: number) => string;
  moreTags: (count: number) => string;
  noPostsTitle: string;
  noPostsBody: string;
  noTagPostsTitle: string;
  noTagPostsBody: string;
  noTagsTitle: string;
  noTagsBody: string;
  archiveEmptyBody: string;
  pagination: string;
  previousPage: string;
  nextPage: string;
  adjacentPosts: string;
  older: string;
  newer: string;
  linkedFrom: string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
}

const en: Messages = {
  skipToContent: "Skip to content",
  navMain: "Main",
  browse: "Browse",
  tags: "Tags",
  archive: "Archive",
  browseFiles: "Browse files",
  files: "Files",
  onThisPage: "On this page",
  close: "Close",
  toggleTheme: "Toggle color theme",
  brandColor: "Brand color",
  toTop: "Back to top",
  home: "Home",
  breadcrumb: "Breadcrumb",
  feed: "RSS",
  siteLinks: "Site",
  poweredBy: "Built with qufox-docs",
  allTags: "All tags",
  byYear: "By year",
  postCount: (count) => `${count} ${count === 1 ? "post" : "posts"}`,
  tagCount: (count) => `${count} ${count === 1 ? "tag" : "tags"}`,
  moreTags: (count) => `+${count}`,
  noPostsTitle: "No posts yet",
  noPostsBody: "Add a markdown file to the content folder to get started.",
  noTagPostsTitle: "No posts",
  noTagPostsBody: "No published posts carry this tag.",
  noTagsTitle: "No tags yet",
  noTagsBody: "Add #tags or frontmatter tags to your notes.",
  archiveEmptyBody: "Published posts will appear here by year.",
  pagination: "Pagination",
  previousPage: "Previous",
  nextPage: "Next",
  adjacentPosts: "Adjacent posts",
  older: "← Older",
  newer: "Newer →",
  linkedFrom: "Linked from",
  notFoundTitle: "Page not found",
  notFoundBody: "The page you are looking for does not exist or was moved.",
  backHome: "Back home",
};

const ko: Messages = {
  skipToContent: "본문으로 건너뛰기",
  navMain: "주 메뉴",
  browse: "둘러보기",
  tags: "태그",
  archive: "보관함",
  browseFiles: "파일 둘러보기",
  files: "파일",
  onThisPage: "이 글의 목차",
  close: "닫기",
  toggleTheme: "밝기 바꾸기",
  brandColor: "강조 색",
  toTop: "맨 위로",
  home: "홈",
  breadcrumb: "현재 위치",
  feed: "RSS",
  siteLinks: "사이트 안내",
  poweredBy: "qufox-docs로 만듦",
  allTags: "모든 태그",
  byYear: "연도별",
  postCount: (count) => `글 ${count}개`,
  tagCount: (count) => `태그 ${count}개`,
  moreTags: (count) => `+${count}`,
  noPostsTitle: "아직 글이 없습니다",
  noPostsBody: "콘텐츠 폴더에 마크다운 파일을 넣으면 여기에 나타납니다.",
  noTagPostsTitle: "글이 없습니다",
  noTagPostsBody: "이 태그가 붙은 공개 글이 없습니다.",
  noTagsTitle: "아직 태그가 없습니다",
  noTagsBody: "글에 #태그나 frontmatter의 tags를 넣으면 여기에 나타납니다.",
  archiveEmptyBody: "공개한 글이 연도별로 여기에 나타납니다.",
  pagination: "쪽 이동",
  previousPage: "이전 쪽",
  nextPage: "다음 쪽",
  adjacentPosts: "앞뒤 글",
  older: "← 이전 글",
  newer: "다음 글 →",
  linkedFrom: "이 글을 가리키는 글",
  notFoundTitle: "찾는 페이지가 없습니다",
  notFoundBody: "주소가 바뀌었거나 없는 페이지입니다.",
  backHome: "처음으로",
};

const TABLES: Record<string, Messages> = { en, ko };

/** Messages for a BCP 47 locale ("ko", "ko-KR"), falling back to English. */
export function messagesFor(locale: string): Messages {
  const language = locale.toLowerCase().split("-")[0] ?? "en";
  return TABLES[language] ?? en;
}
