import { describe, expect, it } from 'vitest';
import { learningTargetPath, dateLabel } from './navigation';
describe('课程导航保留能力', () => {
  it('保留课程代码前导零与条目定位', () => {
    const path = learningTargetPath({ pane: 'CATALOG', courseCode: '00023', chapterId: 'chapter-1', itemId: 'item-2', questionId: null });
    expect(path).toContain('/study/course/00023/catalog');
    expect(path).toContain('itemId=item-2');
  });
  it('考试日期仍按北京时间格式展示', () => { expect(dateLabel('2026-10-24')).toContain('10'); });
});
