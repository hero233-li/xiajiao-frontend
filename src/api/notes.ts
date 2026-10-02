import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotes, listNoteTags, createNote, updateNote } from './generated/notes/notes';
import { listCourses } from './generated/courses/courses';
import { listCycles } from './generated/exams/exams';
import type { Course, ListNotesParams, NoteWrite, NoteUpdate } from './generated/models';
import { sessionStore } from './session';
const owner = () => sessionStore.getSnapshot()?.user.id;
export function useNoteCourses(cycleId?: string) {
  return useQuery({
    queryKey: ['notes', owner(), 'courses', cycleId],
    retry: false,
    queryFn: async ({ signal }) => {
      const context =
        cycleId ||
        (await listCycles({ page: 1, size: 1 }, { signal, silent: true })).data.items[0]?.id;
      if (!context)
        throw new Error('暂无可用考试周期，无法加载课程，请从带考试周期的课程入口进入。');
      const courses: Course[] = [];
      for (let page = 1; ; page++) {
        const data = (
          await listCourses({ cycleId: context, page, size: 100 }, { signal, silent: true })
        ).data;
        courses.push(...data.items);
        if (courses.length >= data.total || !data.items.length) break;
      }
      return courses;
    },
  });
}
export function useNotes(params: ListNotesParams, enabled = true) {
  return useQuery({
    queryKey: ['notes', owner(), 'list', params],
    enabled,
    retry: false,
    queryFn: async ({ signal }) => (await listNotes(params, { signal, silent: true })).data,
  });
}
export function useNoteTags(courseId?: string, enabled = true) {
  return useQuery({
    queryKey: ['notes', owner(), 'tags', courseId],
    enabled,
    retry: false,
    queryFn: async ({ signal }) =>
      (await listNoteTags({ courseId }, { signal, silent: true })).data,
  });
}
export function useWriteNote() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (
      input: { kind: 'create'; body: NoteWrite } | { kind: 'update'; id: string; body: NoteUpdate },
    ) =>
      input.kind === 'create'
        ? (await createNote(input.body, { silent: true })).data
        : (await updateNote(input.id, input.body, { silent: true })).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
