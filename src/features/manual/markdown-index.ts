import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import type { Root as HtmlRoot, Element, Text, ElementContent } from 'hast';
import type { Manual } from '../../api/generated/models';

export interface ManualBlock {
  id: string;
  text: string;
  chapterId: string;
  depth?: number;
}
export const blockId = (chapterId: string, line: number) => `manual-${chapterId}-line-${line}`;
export function indexManual(manual: Manual) {
  const headings: ManualBlock[] = [];
  const blocks: ManualBlock[] = [];
  const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  for (const section of manual.sections) {
    const tree = parser.parse(section.markdown) as Root;
    const initialCount = headings.length;
    visit(tree, (node) => {
      if (!['heading', 'paragraph', 'code', 'table'].includes(node.type) || !node.position) return;
      const text = toString(node);
      if (!text.trim()) return;
      const block: ManualBlock = {
        id: blockId(section.chapterId, node.position.start.line),
        text,
        chapterId: section.chapterId,
      };
      blocks.push(block);
      if (node.type === 'heading') headings.push({ ...block, depth: node.depth });
    });
    if (headings.length === initialCount)
      headings.push({
        id: `manual-${section.chapterId}`,
        text: section.title,
        chapterId: section.chapterId,
        depth: 1,
      });
    for (const exercise of section.exercises)
      blocks.push({
        id: `manual-exercise-${section.chapterId}-${exercise.item.id}`,
        text: exercise.item.title,
        chapterId: section.chapterId,
      });
  }
  return { headings, blocks };
}
export function rehypeManual({ chapterId, search }: { chapterId: string; search: string }) {
  return (tree: HtmlRoot) => {
    visit(tree, 'element', (node) => {
      if (/^(h[1-6]|p|pre|table)$/.test(node.tagName) && node.position) {
        node.properties.id = blockId(chapterId, node.position.start.line);
        node.properties.tabIndex = -1;
      }
    });
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return;
    function highlight(parent: HtmlRoot | Element) {
      if (
        parent.type === 'element' &&
        (['code', 'pre', 'math', 'annotation'].includes(parent.tagName) ||
          String(parent.properties.className).includes('katex'))
      )
        return;
      const nextChildren: ElementContent[] = [];
      for (const child of parent.children) {
        if (child.type === 'doctype') continue;
        if (child.type === 'element') {
          highlight(child);
          nextChildren.push(child);
          continue;
        }
        if (child.type !== 'text') {
          nextChildren.push(child);
          continue;
        }
        const result: (Text | Element)[] = [];
        const lower = child.value.toLocaleLowerCase();
        let cursor = 0;
        let start = lower.indexOf(needle);
        while (start !== -1) {
          if (start > cursor)
            result.push({ type: 'text', value: child.value.slice(cursor, start) });
          result.push({
            type: 'element',
            tagName: 'mark',
            properties: {},
            children: [{ type: 'text', value: child.value.slice(start, start + needle.length) }],
          });
          cursor = start + needle.length;
          start = lower.indexOf(needle, cursor);
        }
        if (cursor < child.value.length)
          result.push({ type: 'text', value: child.value.slice(cursor) });
        nextChildren.push(...result);
      }
      parent.children = nextChildren;
    }
    highlight(tree);
  };
}

export function containsMath(markdown: string) {
  const tree = unified().use(remarkParse).use(remarkMath).parse(markdown);
  let found = false;
  visit(tree, (node) => {
    if (node.type === 'math' || node.type === 'inlineMath') found = true;
  });
  return found;
}
