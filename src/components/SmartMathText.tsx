import { MathText } from './MathText';

const EXPLICIT_MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
const LATEX_ENV = /\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g;
const LATEX_RUN = /\\[a-zA-Z]+(?:\s*\{[^{}]*\})*[0-9A-Za-z+\-*/=<>^_().,\s\\{}[\]]*/g;
const CJK = /[\u3400-\u9fff，。；：、！？（）【】《》“”‘’]/;

/**
 * The analysis is authored by the model. It usually uses explicit $...$ for
 * formulas, but older rows can contain bare LaTeX (\frac, \begin{cases}) or a
 * whole mixed-text answer wrapped in $$...$$. Passing that to KaTeX as one
 * expression fails on the Chinese labels and falls back to raw source.
 * Split text from formulas first, then render only the formula runs.
 */
function wrapCommandRuns(text: string) {
  return text.replace(LATEX_RUN, (match) => {
    const run = match.replace(/\s+$/, '');
    const trailing = match.slice(run.length);
    return `$${run}$${trailing}`;
  });
}

function wrapPlainFormula(text: string) {
  return text
    .split(/([；。\n])/)
    .map((part) => {
      if (!part || /[；。\n]/.test(part)) return part;
      const colon = part.match(/^([^：:]{1,12})([：:])([\s\S]*)$/);
      if (colon) {
        const content = colon[3].trim();
        if (content && content.includes('=') && !content.includes('$') && !CJK.test(content)) {
          return `${colon[1]}${colon[2]}$${content}$`;
        }
        return part;
      }
      const trimmed = part.trim();
      if (trimmed && trimmed.includes('=') && !trimmed.includes('$') && !CJK.test(trimmed)) {
        return `$${trimmed}$`;
      }
      return part;
    })
    .join('');
}

function normalizeLooseMath(text: string) {
  let value = (text || '').trim();
  if (!value) return '';
  if (value.startsWith('$$') && value.endsWith('$$')) value = value.slice(2, -2).trim();
  else if (value.startsWith('$') && value.endsWith('$') && !value.slice(1, -1).includes('$'))
    value = value.slice(1, -1).trim();

  return value
    .split(EXPLICIT_MATH)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      let next = part.replace(LATEX_ENV, (environment) => `$${environment}$`);
      next = next
        .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
        .map((piece, pieceIndex) => {
          if (pieceIndex % 2 === 1) return piece;
          return wrapPlainFormula(wrapCommandRuns(piece));
        })
        .join('');
      return next;
    })
    .join('');
}

export function SmartMathText({ text }: { text: string }) {
  return <MathText text={normalizeLooseMath(text)} />;
}
