/** 自考专业与课程数据：取自上海自考考生服务平台的考试计划（080901 计算机科学与技术 专升本）。 */

export interface ZikaoCourse {
  no: number;
  code: string;
  name: string;
  credit: string;
  passed?: { score: string; at: string };
}

export const major = {
  code: '080901',
  name: '计算机科学与技术',
  level: '专升本',
  usedCourses: 3,
  totalCourses: 14,
  earnedCredit: 8,
  requiredCredit: 77,
  exemptCourses: 0,
  transferredCourses: 0,
};

export const courses: ZikaoCourse[] = [
  { no: 1, code: '15040', name: '习近平新时代中国特色社会主义思想概论', credit: '3' },
  { no: 2, code: '15043', name: '中国近现代史纲要', credit: '3' },
  { no: 3, code: '15044', name: '马克思主义基本原理', credit: '3', passed: { score: '73', at: '2026年06月' } },
  { no: 4, code: '13000', name: '英语（专升本）', credit: '7' },
  { no: 5, code: '00023', name: '高等数学（工本）', credit: '10' },
  { no: 6, code: '02324', name: '离散数学', credit: '4' },
  { no: 7, code: '04737', name: 'C++程序设计', credit: '3' },
  { no: 8, code: '04738', name: 'C++程序设计（实践）', credit: '2' },
  { no: 9, code: '13003', name: '数据结构与算法', credit: '4' },
  { no: 10, code: '13004', name: '数据结构与算法（实践）', credit: '2' },
  { no: 11, code: '13015', name: '计算机系统原理', credit: '4' },
  { no: 12, code: '13180', name: '操作系统', credit: '4', passed: { score: '86', at: '2025年12月' } },
  { no: 13, code: '02327', name: '操作系统（实践）', credit: '1', passed: { score: '合格', at: '2025年12月' } },
  { no: 14, code: '13170', name: '数据库及其应用', credit: '4' },
  { no: 15, code: '13171', name: '数据库及其应用（实践）', credit: '1' },
  { no: 16, code: '13005', name: '软件工程', credit: '3' },
  { no: 17, code: '13006', name: '软件工程（实践）', credit: '2' },
  { no: 18, code: '13017', name: '计算机网络与信息安全', credit: '6' },
  { no: 19, code: '13215', name: 'Java语言程序设计', credit: '3' },
  { no: 20, code: '13216', name: 'Java语言程序设计（实践）', credit: '1' },
  { no: 21, code: '13175', name: '线性代数（工）', credit: '3' },
  { no: 22, code: '13011', name: '人工智能与大数据', credit: '6' },
  { no: 23, code: '14260', name: '数字电路与逻辑设计', credit: '4' },
  { no: 24, code: '11689', name: '毕业设计', credit: '不计学分' },
];
