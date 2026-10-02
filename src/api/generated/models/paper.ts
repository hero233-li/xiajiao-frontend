/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileMetadata } from './fileMetadata';
import type { PaperAnswerFile } from './paperAnswerFile';

export interface Paper {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /** 课程代码+年月 */
  paperKey: string;
  /** @pattern ^\d{4}-(0[1-9]|1[0-2])$ */
  paperMonth: string;
  /** @nullable */
  sourceCourseCode: string | null;
  questionFile: FileMetadata;
  /** @nullable */
  answerFile: PaperAnswerFile;
  /**
   * @minimum 1
   * @nullable
   */
  questionPages: number | null;
  /**
   * @minimum 1
   * @nullable
   */
  answerPages: number | null;
  note: string;
}
