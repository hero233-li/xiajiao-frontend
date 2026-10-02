/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  CreateNoteResponse,
  GetNoteResponse,
  ListNoteTagsParams,
  ListNoteTagsResponse,
  ListNotesParams,
  ListNotesResponse,
  NoteUpdate,
  NoteWrite,
  UpdateNoteResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 后端筛选本人正文/课程/标签，按noteDate、createdAt、ID倒序；搜索条件不持久化。
本人数据，身份来自JWT。
 * @summary 全部或本科备注搜索
 */
export const listNotes = (
    params?: ListNotesParams,
 options?: SecondParameter<typeof apiRequest<ListNotesResponse>>,) => {
      return apiRequest<ListNotesResponse>(
      {url: `/api/v1/notes`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 新增学习备注
 */
export const createNote = (
    noteWrite: BodyType<NoteWrite>,
 options?: SecondParameter<typeof apiRequest<CreateNoteResponse>>,) => {
      return apiRequest<CreateNoteResponse>(
      {url: `/api/v1/notes`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: noteWrite
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 备注详情
 */
export const getNote = (
    noteId: string,
 options?: SecondParameter<typeof apiRequest<GetNoteResponse>>,) => {
      return apiRequest<GetNoteResponse>(
      {url: `/api/v1/notes/${noteId}`, method: 'GET'
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 编辑学习备注
 */
export const updateNote = (
    noteId: string,
    noteUpdate: BodyType<NoteUpdate>,
 options?: SecondParameter<typeof apiRequest<UpdateNoteResponse>>,) => {
      return apiRequest<UpdateNoteResponse>(
      {url: `/api/v1/notes/${noteId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: noteUpdate
    },
      options);
    }
  /**
 * 从正文派生，不单独存标签；与列表使用同一用户/课程范围。
本人数据，身份来自JWT。
 * @summary 本人备注可用标签
 */
export const listNoteTags = (
    params?: ListNoteTagsParams,
 options?: SecondParameter<typeof apiRequest<ListNoteTagsResponse>>,) => {
      return apiRequest<ListNoteTagsResponse>(
      {url: `/api/v1/notes/tags`, method: 'GET',
        params
    },
      options);
    }
  export type ListNotesResult = NonNullable<Awaited<ReturnType<typeof listNotes>>>
export type CreateNoteResult = NonNullable<Awaited<ReturnType<typeof createNote>>>
export type GetNoteResult = NonNullable<Awaited<ReturnType<typeof getNote>>>
export type UpdateNoteResult = NonNullable<Awaited<ReturnType<typeof updateNote>>>
export type ListNoteTagsResult = NonNullable<Awaited<ReturnType<typeof listNoteTags>>>
