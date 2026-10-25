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

export async function runSql(sql: string, options: { seed: boolean }): Promise<SqlOutcome> {
  const statement = toSqlite(sql);
  if (!statement) {
    return { ok: false, results: [], tables: [], error: '没有可执行的语句' };
  }

  const SQL = await loadEngine();
  const db = new SQL.Database();

  try {
    if (options.seed) db.exec(SAMPLE_DATA);
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
