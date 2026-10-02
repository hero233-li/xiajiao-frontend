import type { Course, LearningPosition } from '../../api/generated/models';
export function useCapability(
  name: 'course.next',
  data: { course: Course; position?: LearningPosition | null },
): boolean;
export function useCapability(name: 'exams.steps', data?: unknown): boolean;
export function useCapability(
  name: string,
  data?: { course: Course; position?: LearningPosition | null } | unknown,
) {
  if (
    name === 'course.next' &&
    data &&
    typeof data === 'object' &&
    'course' in data &&
    'position' in data
  ) {
    const value = data as { course: Course; position?: LearningPosition | null };
    return value.position?.courseId === value.course.id && !!value.position.target;
  }
  // Step progress has no contracted endpoint yet.
  return false;
}
