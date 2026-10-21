import type { WeaknessExample } from '../../../api/bank';
import { SmartMathText } from '../../../components/SmartMathText';

type MethodStep = { title: string; body?: string; formula?: string };

export function isVectorCrossExample(example: WeaknessExample) {
  return (
    example.pointTitle?.includes('向量积') ||
    example.stem.includes('\\mathbf a\\times\\mathbf b') ||
    example.stem.includes('a\\times b')
  );
}

export function WorkedAnswer({ text }: { text: string }) {
  return (
    <div className="weakness-worked-answer">
      <SmartMathText text={text} />
    </div>
  );
}

export function methodSteps(example: WeaknessExample): MethodStep[] {
  if (isVectorCrossExample(example)) {
    return [
      {
        title: '第一步：直接写成 i、j、k 行列式',
        body: '第一行写 $\\mathbf i,\\mathbf j,\\mathbf k$，下面两行分别写 $\\mathbf a$、$\\mathbf b$ 的三个分量。叉积就是这个三阶行列式：',
        formula:
          '$$\\mathbf a\\times\\mathbf b=\\begin{vmatrix}\\mathbf i&\\mathbf j&\\mathbf k\\\\2&1&0\\\\1&-1&2\\end{vmatrix}$$',
      },
      {
        title: '第二步：按第一行展开，j 项取负',
        body: '每个分量都是划掉它所在的行和列后剩下的二阶行列式。注意 $\\mathbf j$ 前面是负号，这是最容易漏的一步：',
        formula:
          '$$=\\mathbf i\\begin{vmatrix}1&0\\\\-1&2\\end{vmatrix}-\\mathbf j\\begin{vmatrix}2&0\\\\1&2\\end{vmatrix}+\\mathbf k\\begin{vmatrix}2&1\\\\1&-1\\end{vmatrix}$$',
      },
      {
        title: '第三步：算三个二阶行列式',
        body: '二阶行列式就是“主对角线相乘 − 副对角线相乘”，代进去直接得到叉积：',
        formula:
          '$$=\\mathbf i(1\\cdot2-0\\cdot(-1))-\\mathbf j(2\\cdot2-0\\cdot1)+\\mathbf k(2\\cdot(-1)-1\\cdot1)=2\\mathbf i-4\\mathbf j-3\\mathbf k=(2,-4,-3)$$',
      },
      {
        title: '第四步：面积等于叉积的模',
        body: '平行四边形面积不是 $|\\mathbf a||\\mathbf b|$，而是叉积向量的长度：',
        formula:
          '$$S=|\\mathbf a\\times\\mathbf b|=\\sqrt{2^2+(-4)^2+(-3)^2}=\\sqrt{4+16+9}=\\sqrt{29}$$',
      },
    ];
  }
  const sentences = example.explanation
    .split('。')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!sentences.length) return [{ title: '方法提醒', body: example.explanation }];
  return sentences.map((body, index) => ({
    title: `第 ${index + 1} 步`,
    body: `${body}${index < sentences.length - 1 ? '。' : ''}`,
  }));
}

export function StrongLevel({ label }: { label: string }) {
  return <strong>{label}</strong>;
}

