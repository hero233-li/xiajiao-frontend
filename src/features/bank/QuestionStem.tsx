import { Fragment } from 'react';
import { MathText } from '../../components/MathText';

// Preserve authored content: punctuation creates paragraphs only outside math/code.
const protectedSyntax =
  /(```[\s\S]*?```|`[^`\n]+`|(?<!\\)\$\$[\s\S]+?\$\$|(?<!\\)\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
function PlainText({ text }: { text: string }) {
  const expressions = text.split(/([A-Za-z0-9α-ω][A-Za-z0-9α-ω=+\-*/^().<>≤≥≠∈∞∫Σ√²³₀-₉]*)/g);
  return (
    <>
      {expressions.map((part, index) =>
        /[=+*/^<>≤≥≠∈∫Σ√²³]/.test(part) ? (
          <span className="question-expression" key={index}>
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
function Content({ text, protectedParts }: { text: string; protectedParts: string[] }) {
  return (
    <>
      {text.split(/(\uE000\d+\uE001)/g).map((part, index) => {
        const match = /^\uE000(\d+)\uE001$/.exec(part);
        if (!match) return <PlainText key={index} text={part} />;
        const original = protectedParts[Number(match[1])];
        if (original.startsWith('```'))
          return (
            <pre key={index}>
              <code>{original.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code>
            </pre>
          );
        if (original.startsWith('`')) return <code key={index}>{original.slice(1, -1)}</code>;
        return <MathText key={index} text={original} />;
      })}
    </>
  );
}
export function QuestionStem({ text }: { text: string }) {
  const protectedParts: string[] = [];
  const prepared = text.replace(protectedSyntax, (part) => {
    protectedParts.push(part);
    return `\uE000${protectedParts.length - 1}\uE001`;
  });
  const paragraphs = prepared.split(/(?<=[。！？])\s*|\n+/).filter((part) => part.trim());
  const last = paragraphs.at(-1) ?? '';
  const requirement =
    paragraphs.length > 1 && /^(请|作答要求[：:]|注意[：:]|提示[：:])/.test(last.trim())
      ? paragraphs.pop()
      : undefined;
  return (
    <div className="question-stem">
      <div className="question-stem-body">
        {paragraphs.map((paragraph, index) => (
          <div className="question-stem-paragraph" key={index}>
            <Content text={paragraph} protectedParts={protectedParts} />
          </div>
        ))}
      </div>
      {requirement && (
        <aside className="question-requirement">
          <strong>作答要求</strong>
          <div>
            <Content text={requirement} protectedParts={protectedParts} />
          </div>
        </aside>
      )}
    </div>
  );
}
