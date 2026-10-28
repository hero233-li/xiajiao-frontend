import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * 浏览器内 SQL 执行器。
 *
 * 引擎是 SQLite（编译成 wasm），不是 MySQL：
 * - 建表、条件查询、连接、子查询、聚合、update 都能跑，足够验证 1–8 题；
 * - 触发器 / 存储过程 / 存储函数是 MySQL 专属写法（delimiter、signal、procedure），
 *   在 SQLite 里语法不同，跑不了，页面上会直接说明。
 *
 * 每次运行都在一份全新的内存库上执行：先灌入示例数据，再跑用户写的语句，
 * 所以结果稳定、互不污染。
 */

/** 模拟卷数据：图书 / 读者 / 借阅，结构取自 04736 考纲的「数据表 + 完整性约束」范围。 */
const LIBRARY_DATA = `
create table book (
  bookid   integer primary key,
  title    varchar(40) not null,
  author   varchar(20),
  category varchar(10),
  price    decimal(6,2) check (price > 0),
  total    integer default 1
);

create table reader (
  readerid   integer primary key,
  readername varchar(20) not null,
  sex        char(1),
  dept       varchar(20),
  regdate    date
);

create table borrow (
  borrowid   integer primary key,
  bookid     integer not null references book(bookid),
  readerid   integer not null references reader(readerid),
  borrowdate date not null,
  duedate    date,
  returndate date
);

insert into book (bookid, title, author, category, price, total) values
  (1, '数据库系统概论', '王珊', '计算机', 45.00, 3),
  (2, '算法导论', 'Cormen', '计算机', 128.00, 2),
  (3, '人间词话', '王国维', '文学', 38.00, 1),
  (4, '围城', '钱钟书', '文学', 42.50, 2),
  (5, '中国通史', '吕思勉', '历史', 88.00, 1),
  (6, '数据结构', '严蔚敏', '计算机', 55.00, 2),
  (7, '沉默的大多数', '王小波', '文学', 35.00, 1);

insert into reader (readerid, readername, sex, dept, regdate) values
  (1, '张伟', '男', '计算机学院', '2025-09-01'),
  (2, '李静', '女', '文学院', '2025-09-03'),
  (3, '王强', '男', '历史系', '2025-09-05'),
  (4, '赵敏', '女', '计算机学院', '2025-09-08'),
  (5, '陈晨', '男', '文学院', '2026-02-20');

insert into borrow (borrowid, bookid, readerid, borrowdate, duedate, returndate) values
  (1, 1, 1, '2026-03-02', '2026-04-02', '2026-03-20'),
  (2, 2, 1, '2026-05-11', '2026-06-10', '2026-06-01'),
  (3, 3, 2, '2026-04-15', '2026-05-15', null),
  (4, 1, 4, '2026-07-01', '2026-08-01', null),
  (5, 4, 5, '2026-09-10', '2026-10-10', '2026-09-28'),
  (6, 6, 4, '2026-09-20', '2026-10-20', null),
  (7, 5, 3, '2026-02-01', '2026-03-01', '2026-02-20'),
  (8, 1, 2, '2026-10-01', '2026-10-31', null);
`;

export type SqlCell = string | number | null;

export interface SqlResultSet {
  columns: string[];
  rows: SqlCell[][];
}

export interface SqlOutcome {
  ok: boolean;
  results: SqlResultSet[];
  tables: string[];
  error?: string;
}

/** 示例数据：专业 / 班级 / 学生，字段与 2017-04 卷完全一致。 */
const SAMPLE_DATA = `
create table majorinfo (
  majorid integer primary key,
  major   varchar(20)
);

create table classinfo (
  classid     char(5) primary key,
  classnumber integer,
  majorid     integer references majorinfo(majorid)
);

create table studentinfo (
  studentid    integer primary key,
  studentname  varchar(20) unique,
  studentsex   char(1),
  studentage   smallint,
  studentmark  smallint,
  entrancedate datetime,
  classid      char(5) references classinfo(classid)
);

insert into majorinfo (majorid, major) values
  (1, '信息管理与信息系统'),
  (2, '计算机科学与技术');

insert into classinfo (classid, classnumber, majorid) values
  ('G0208', 12, 1),
  ('G0209', 3, 1),
  ('G0210', 2, 2);

insert into studentinfo values
  (1,  '张伟', '男', 31, 96, '2001-09-01', 'G0208'),
  (2,  '张敏', '女', 25, 92, '2002-09-01', 'G0208'),
  (3,  '张三', '男', 23, 95, '2001-09-01', 'G0208'),
  (4,  '张丽', '女', 22, 98, '2003-09-01', 'G0208'),
  (5,  '李强', '男', 30, 93, '2002-03-01', 'G0208'),
  (6,  '王芳', '女', 21, 97, '2003-09-01', 'G0208'),
  (7,  '赵磊', '男', 24, 91, '2001-09-01', 'G0208'),
  (8,  '钱静', '女', 26, 94, '2002-09-01', 'G0208'),
  (9,  '孙浩', '男', 28, 95, '2003-03-01', 'G0208'),
  (10, '周婷', '女', 20, 99, '2004-09-01', 'G0208'),
  (11, '吴迪', '男', 33, 92, '2001-09-01', 'G0208'),
  (12, '郑爽', '女', 22, 96, '2002-09-01', 'G0208'),
  (13, '王五', '男', 35, 55, '2002-09-01', 'G0209'),
  (14, '李雷', '男', 32, 62, '2003-09-01', 'G0209'),
  (15, '韩梅', '女', 21, 58, '2004-09-01', 'G0209'),
  (16, '刘洋', '男', 23, 80, '2004-09-01', 'G0210'),
  (17, '陈晨', '女', 22, 76, '2003-09-01', 'G0210');
`;

let engine: Promise<SqlJsStatic> | null = null;

function loadEngine() {
  engine ??= initSqlJs({ locateFile: () => wasmUrl });
  return engine;
}

/**
 * 把 MySQL 写法削成 SQLite 能吃的：
 * - 去掉 `delimiter $$` 这类客户端指令；
 * - 去掉列/表级 `comment '…'`；
 * - 去掉 `drop database` / `create database` / `use`（跑在内存库里，不需要库名）。
 */
function toSqlite(sql: string) {
  return sql
    .replace(/^\s*delimiter\s+\S+\s*;?\s*$/gim, '')
    .replace(/comment\s+'(?:[^']|'')*'/gi, '')
    .replace(/^\s*(?:drop\s+database|create\s+database|use)\b[^;]*;\s*$/gim, '')
    .trim();
}

function readTables(db: Database) {
  try {
    const [result] = db.exec(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
    );
    return result ? result.values.map((row) => String(row[0])) : [];
  } catch {
    return [];
  }
}

export async function runSql(
  sql: string,
  options: { seed: boolean; dataset?: SqlDataset },
): Promise<SqlOutcome> {
  const statement = toSqlite(sql);
  if (!statement) {
    return { ok: false, results: [], tables: [], error: '没有可执行的语句' };
  }

  const SQL = await loadEngine();
  const db = new SQL.Database();

  try {
    if (options.seed) db.exec(DATASETS[options.dataset ?? 'school']);
    const sets = db.exec(statement);
    return {
      ok: true,
      results: sets.map((set) => ({ columns: set.columns, rows: set.values as SqlCell[][] })),
      tables: readTables(db),
    };
  } catch (error) {
    return {
      ok: false,
      results: [],
      tables: readTables(db),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    db.close();
  }
}

export type SqlDataset = 'school' | 'library';

const DATASETS: Record<SqlDataset, string> = {
  school: SAMPLE_DATA,
  library: LIBRARY_DATA,
};
