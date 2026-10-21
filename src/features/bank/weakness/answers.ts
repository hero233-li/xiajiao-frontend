import type { WeaknessQuestion } from '../../../api/bank';

export function isWeaknessCorrect(question: WeaknessQuestion) {
  const saved = question.saved;
  return saved?.grading_state === 'GRADED' && saved.earned != null &&
    Number(saved.earned) >= Number(saved.maximum);
}

export function referenceText(solution: Record<string, unknown>) {
  const answer = solution?.referenceAnswer;
  if (typeof answer === 'string' && answer.trim()) return answer;
  if (typeof solution?.correctOption === 'number')
    return `${String.fromCharCode(65 + solution.correctOption)}（选项 ${solution.correctOption + 1}）`;
  return '参考答案暂未提供';
}

export function answerText(
  answer: { selectedOption?: number; text?: string } | null | undefined,
  solution: Record<string, unknown>,
  recognizedAnswer?: string | null,
) {
  if (recognizedAnswer?.trim()) return recognizedAnswer;
  if (!answer) return '未作答';
  if (typeof answer.selectedOption === 'number') {
    const option = (solution as { options?: string[] }).options?.[answer.selectedOption];
    return `${String.fromCharCode(65 + answer.selectedOption)}${option ? `（${option}）` : ''}`;
  }
  return answer.text?.trim() || '未作答';
}
