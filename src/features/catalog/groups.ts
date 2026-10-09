import type { CatalogChapter } from '../../api/generated/models';
export function catalogGroups(code: string | undefined, chapters: CatalogChapter[]) {
  const groups = ['精讲', '大题'].map((title) => ({
    title,
    chapters: chapters.filter((chapter) => chapter.title.startsWith(`${title} ·`)),
  }));
  // Older releases and other courses retain their original directory.
  return code === '13015' && groups.every((group) => group.chapters.length)
    ? groups
    : [{ title: '', chapters }];
}
