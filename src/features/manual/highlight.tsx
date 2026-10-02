import { createElement, type ReactNode } from 'react';
import { createLowlight } from 'lowlight';
import type { RootContent } from 'hast';
const lowlight = createLowlight();
const loaders = {
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  sql: () => import('highlight.js/lib/languages/sql'),
  python: () => import('highlight.js/lib/languages/python'),
  bash: () => import('highlight.js/lib/languages/bash'),
  json: () => import('highlight.js/lib/languages/json'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  css: () => import('highlight.js/lib/languages/css'),
  xml: () => import('highlight.js/lib/languages/xml'),
};
const aliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  html: 'xml',
  'c++': 'cpp',
};
const pending = new Map<string, Promise<unknown>>();
function renderToken(node: RootContent, key: number): ReactNode {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element') return null;
  return createElement(
    'span',
    { key, className: (node.properties.className as string[] | undefined)?.join(' ') },
    node.children.map(renderToken),
  );
}
export async function highlightCode(language: string, source: string): Promise<ReactNode> {
  const name = aliases[language.toLowerCase()] ?? language.toLowerCase();
  if (!(name in loaders)) return source;
  if (!lowlight.registered(name)) {
    let load = pending.get(name);
    if (!load) {
      load = loaders[name as keyof typeof loaders]().then((module) =>
        lowlight.register(name, module.default),
      );
      pending.set(name, load);
      load.catch(() => pending.delete(name));
    }
    await load;
  }
  return lowlight.highlight(name, source).children.map(renderToken);
}
