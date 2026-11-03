import { Fragment, type ReactNode } from 'react';

/**
 * 极简 Markdown 渲染：只覆盖这份学习计划用到的语法
 * （二级/三级/四级标题、表格、有序/无序列表、复选框、引用、分隔线、粗体、行内代码、链接、裸链接）。
 * 不走通用解析器：规则少、样式可控、不会被用户内容里的奇怪字符搞崩。
 */

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'h4'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'hr' }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

function stripFrontMatter(src: string) {
  return src.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function isTableRow(line: string) {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parse(src: string): Block[] {
  const lines = stripFrontMatter(src).split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const raw = line.trim();
    if (!raw) {
      i += 1;
      continue;
    }
    if (raw.startsWith('# ')) {
      // 页面自己有标题，正文的一级标题不再重复渲染
      i += 1;
      continue;
    }
    if (raw.startsWith('#### ')) {
      blocks.push({ kind: 'h4', text: raw.slice(5) });
      i += 1;
      continue;
    }
    if (raw.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: raw.slice(4) });
      i += 1;
      continue;
    }
    if (raw.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: raw.slice(3) });
      i += 1;
      continue;
    }
    if (raw === '---') {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    if (raw.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }
    if (isTableRow(raw)) {
      const head = splitRow(raw);
      i += 1;
      // 跳过 |---|---| 分隔行
      if (i < lines.length && /^\|[\s:|-]+\|$/.test(lines[i].trim())) i += 1;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }
    if (/^[-*]\s+/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
        // 列表项的续行（缩进两格）
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    if (/^\d+[.．]\s+/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.．]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+[.．]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }
    // 段落：连续非空、非特殊行合并
    const buf: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('#') ||
        cur.startsWith('|') ||
        cur.startsWith('>') ||
        cur === '---' ||
        /^[-*]\s+/.test(cur) ||
        /^\d+[.．]\s+/.test(cur)
      ) {
        break;
      }
      buf.push(cur);
      i += 1;
    }
    if (buf.length) blocks.push({ kind: 'p', text: buf.join(' ') });
  }
  return blocks;
}

/** 行内：**粗体**、`代码`、[文字](链接)、裸链接 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)）]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${n}`;
    n += 1;
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} className="text-ink font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="bg-line/60 text-ink rounded px-1 py-0.5 font-mono text-[0.92em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      nodes.push(
        <a
          key={key}
          href={m?.[2] ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
        >
          {m?.[1] ?? token}
        </a>,
      );
    } else {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-brand-ink break-all underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
        >
          {token.replace(/^https?:\/\//, '')}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownDoc({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const key = `b${index}`;
        if (block.kind === 'hr') return <hr key={key} className="border-line/70 my-2 border-t" />;
        if (block.kind === 'h2') {
          return (
            <h2 key={key} className="text-ink mt-4 text-[17px] leading-snug font-semibold">
              {inline(block.text, key)}
            </h2>
          );
        }
        if (block.kind === 'h3') {
          return (
            <h3 key={key} className="text-ink mt-2 text-[15px] leading-snug font-semibold">
              {inline(block.text, key)}
            </h3>
          );
        }
        if (block.kind === 'h4') {
          return (
            <h4 key={key} className="text-ink text-[14px] font-semibold">
              {inline(block.text, key)}
            </h4>
          );
        }
        if (block.kind === 'p') {
          return (
            <p key={key} className="text-ink/90 text-[13.5px] leading-7">
              {inline(block.text, key)}
            </p>
          );
        }
        if (block.kind === 'quote') {
          return (
            <blockquote
              key={key}
              className="border-brand/40 bg-brand-soft/40 text-ink/90 rounded-r-lg border-l-2 px-3 py-2 text-[13px] leading-6"
            >
              {inline(block.text, key)}
            </blockquote>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={key} className="flex flex-col gap-1.5">
              {block.items.map((item, i) => {
                const key2 = `${key}-${i}`;
                const check = /^\[( |x|X)\]\s*/.exec(item);
                return (
                  <li key={key2} className="text-ink/90 flex gap-2 text-[13.5px] leading-7">
                    <span className={check ? 'text-muted' : 'text-brand/70'} aria-hidden>
                      {check ? (check[1].trim() ? '☑' : '☐') : '·'}
                    </span>
                    <span className="min-w-0">
                      {inline(check ? item.slice(check[0].length) : item, key2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={key} className="flex flex-col gap-1.5">
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`} className="text-ink/90 flex gap-2 text-[13.5px] leading-7">
                  <span className="text-muted w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
                  <span className="min-w-0">{inline(item, `${key}-${i}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        // table
        return (
          <div key={key} className="border-line/70 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-line/40">
                  {block.head.map((cell, i) => (
                    <th key={`h${i}`} className="text-muted px-3 py-2 font-medium whitespace-nowrap">
                      {inline(cell, `${key}-h${i}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={`r${ri}`} className="border-line/60 border-t">
                    {row.map((cell, ci) => (
                      <td key={`c${ci}`} className="text-ink/90 px-3 py-2 align-top leading-6">
                        {inline(cell, `${key}-r${ri}c${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default MarkdownDoc;
export { Fragment };
