import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
/** Backend tags are authoritative; plain text is never interpreted as HTML. */
export function NoteContent({
  content,
  tags,
  onTag,
}: {
  content: string;
  tags: string[];
  onTag: (tag: string) => void;
}) {
  const names = [...new Set(tags.map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag)))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const parts: ReactNode[] = [];
  let start = 0;
  let cursor = 0;
  while (cursor < content.length) {
    const tag =
      content[cursor] === '#'
        ? names.find(
            (name) =>
              content.startsWith(name, cursor + 1) &&
              !/[\p{L}\p{N}_]/u.test(content[cursor + name.length + 1] ?? ''),
          )
        : undefined;
    if (!tag) {
      cursor++;
      continue;
    }
    parts.push(content.slice(start, cursor));
    const value = tags.find((item) => item === tag || item === `#${tag}`)!;
    parts.push(
      <Button
        key={cursor}
        variant="ghost"
        className="notes-tag"
        onClick={() => onTag(value)}
        aria-label={`筛选标签 ${tag}`}
      >
        #{tag}
      </Button>,
    );
    cursor += tag.length + 1;
    start = cursor;
  }
  parts.push(content.slice(start));
  return <div className="notes-content">{parts}</div>;
}
