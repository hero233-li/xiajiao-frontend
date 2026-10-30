/**
 * 模拟卷：按考纲范围出的成套练习题。
 * 数据库（04736）：每套 12 题、满分 100，照 2017.4 真题的题型顺序。
 * Java（13216）：每套 4 题、每题 25 分，照机考真题的结构。
 * 卷面只给题干（hideChecks），评分点只喂给 AI 批改当参考。
 */
import type { LabSet } from './lab';

/* ============================ 数据库 04736 ============================ */

const schoolPreface = [
  'School 库三张表（页内示例数据已就绪）：',
  'studentinfo：studentid int 主键、studentname varchar(20) 唯一、studentsex char(1) 取「男」或「女」、studentage smallint、studentmark smallint 成绩、entrancedate date 入学时间、classid char(5) 外键指向 classinfo.classid。',
  'classinfo：classid char(5) 主键、classnumber int 允许空 班级人数、majorid int 专业编号。',
  'majorinfo：majorid int 主键、major varchar(20) 专业名称。',
];

const libraryPreface = [
  'library 库三张表（页内示例数据已就绪）：',
  'book：bookid int 主键、title varchar(50) 非空、price decimal(10,2) 必须大于 0、total int 默认 1 馆藏册数。',
  'reader：readerid int 主键、readername varchar(20) 非空。',
  'borrow：borrowid int 主键、bookid int 外键指向 book、readerid int 外键指向 reader、borrowdate date 借出日期、duedate date 应还日期、returndate date 归还日期（未还为 null）。',
];

export const sqlPaper1: LabSet = {
  id: 'db-mock-1',
  name: '模拟卷 1',
  note: 'SQL 交互操作：建表约束、条件查询、连接、分组、子查询、视图、索引。',
  hideChecks: true,
  preface: schoolPreface,
  questions: [
    {
      id: 'db-mock-1-1',
      no: 1,
      title: '建学生表：主键与约束',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '在 school 库中建立学生表 studentinfo：studentid int 主键，studentname varchar(20) 非空且唯一，studentsex char(1) 只能取「男」或「女」，studentage smallint 必须大于 18，studentmark smallint，entrancedate date，classid char(5)。要求写出约束相关语句。',
      checks: ['主键 primary key', '非空与唯一 not null / unique', 'check 约束限制性别与年龄', 'classid 类型 char(5)'],
      answer: `create table studentinfo (
  studentid int primary key,
  studentname varchar(20) not null unique,
  studentsex char(1) check (studentsex in ('男', '女')),
  studentage smallint check (studentage > 18),
  studentmark smallint,
  entrancedate date,
  classid char(5)
);`,
    },
    {
      id: 'db-mock-1-2',
      no: 2,
      title: '条件查询：区间与排序',
      score: '8 分',
      fileName: '02-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '查询年龄在 20 到 30 之间（含两端）的学生姓名、年龄和成绩，按年龄从大到小排列，年龄相同的按成绩从高到低排列。',
      checks: ['between 或 >= and <=', 'order by 两个字段，方向相反'],
      answer: `select studentname, studentage, studentmark
from studentinfo
where studentage between 20 and 30
order by studentage desc, studentmark desc;`,
    },
    {
      id: 'db-mock-1-3',
      no: 3,
      title: '模糊查询 + 日期条件',
      score: '8 分',
      fileName: '03-like.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '查询 2002 年 1 月 1 日以后入学的、姓名第二个字是「三」的学生信息，列出学号、姓名和入学时间。',
      checks: ['like 用通配符占位', '日期与字符串字面量比较'],
      answer: `select studentid, studentname, entrancedate
from studentinfo
where entrancedate > '2002-01-01'
  and studentname like '_三%';`,
    },
    {
      id: 'db-mock-1-4',
      no: 4,
      title: '三表连接：学生与专业',
      score: '8 分',
      fileName: '04-join.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '列出每个学生的姓名、成绩、班级编号和所在专业名称，按成绩从高到低排列。',
      checks: ['studentinfo join classinfo join majorinfo', '连接条件用 classid 与 majorid'],
      answer: `select s.studentname, s.studentmark, s.classid, m.major
from studentinfo s
join classinfo c on c.classid = s.classid
join majorinfo m on m.majorid = c.majorid
order by s.studentmark desc;`,
    },
    {
      id: 'db-mock-1-5',
      no: 5,
      title: '分组统计 + having',
      score: '8 分',
      fileName: '05-group.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '统计每个班的平均成绩和人数，只列出平均成绩高于 80 分的班级，输出班级编号、人数、平均成绩（保留一位小数）。',
      checks: ['group by classid', 'count(*) 与 avg 聚合', 'having 过滤分组'],
      answer: `select classid, count(*) as 人数, round(avg(studentmark), 1) as 平均分
from studentinfo
group by classid
having avg(studentmark) > 80;`,
    },
    {
      id: 'db-mock-1-6',
      no: 6,
      title: '子查询：高于全体平均',
      score: '8 分',
      fileName: '06-subquery.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查询成绩高于全体学生平均成绩的学生姓名和成绩。',
      checks: ['子查询求平均', '外层用 > 比较'],
      answer: `select studentname, studentmark
from studentinfo
where studentmark > (select avg(studentmark) from studentinfo);`,
    },
    {
      id: 'db-mock-1-7',
      no: 7,
      title: 'exists：没及格过的学生',
      score: '8 分',
      fileName: '07-exists.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '用 exists 或 not exists 查询没有任何一门成绩低于 60 分的学生姓名。',
      checks: ['not exists 相关子查询', '子查询与外表用 studentid 关联'],
      answer: `select s.studentname
from studentinfo s
where not exists (
  select 1 from studentinfo t
  where t.studentid = s.studentid and t.studentmark < 60
);`,
    },
    {
      id: 'db-mock-1-8',
      no: 8,
      title: '行转列：班级男女平均分',
      score: '8 分',
      fileName: '08-pivot.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '按班级统计男、女学生的平均成绩，一行显示班级编号、男生平均分、女生平均分。',
      checks: ['条件聚合 case when', '按班级分组'],
      answer: `select classid,
       round(avg(case when studentsex = '男' then studentmark end), 1) as 男生平均分,
       round(avg(case when studentsex = '女' then studentmark end), 1) as 女生平均分
from studentinfo
group by classid;`,
    },
    {
      id: 'db-mock-1-9',
      no: 9,
      title: '视图：不及格名单',
      score: '8 分',
      fileName: '09-view.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '建立一个视图 v_fail，包含成绩低于 60 分的学生的学号、姓名、成绩和班级编号，再查询该视图并按成绩升序。',
      checks: ['create view 语句', '视图里带过滤条件', '再 select 视图'],
      answer: `create view v_fail as
select studentid, studentname, studentmark, classid
from studentinfo
where studentmark < 60;

select * from v_fail order by studentmark;`,
    },
    {
      id: 'db-mock-1-10',
      no: 10,
      title: '索引：按姓名与班级建复合索引',
      score: '8 分',
      fileName: '10-index.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '为 studentinfo 表按「班级编号 + 学生姓名」建立复合索引 idx_class_name，建完查询该表确认可用。',
      checks: ['create index 语法', '列顺序为 classid 在前'],
      answer: `create index idx_class_name on studentinfo (classid, studentname);

select * from studentinfo where classid = 'G0208' order by studentname;`,
    },
    {
      id: 'db-mock-1-11',
      no: 11,
      title: '触发器：成绩超 90 不许改',
      score: '10 分',
      fileName: '11-trigger.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '编写触发器，当修改学生成绩时，如果该学生原成绩已经高于 90 分，则拒绝修改并给出提示。',
      checks: ['before update on studentinfo', '用 old.studentmark 判断', 'signal sqlstate 抛错'],
      answer: `delimiter //
create trigger trg_mark_guard before update on studentinfo
for each row
begin
  if old.studentmark > 90 and new.studentmark <> old.studentmark then
    signal sqlstate '45000' set message_text = '成绩已超 90，不允许修改';
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-1-12',
      no: 12,
      title: '存储过程：按班级查平均分',
      score: '10 分',
      fileName: '12-proc.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '编写存储过程 p_class_avg，传入班级编号，通过输出参数返回该班平均成绩。',
      checks: ['in 与 out 参数', 'select avg ... into 变量'],
      answer: `delimiter //
create procedure p_class_avg(in p_classid char(5), out p_avg decimal(5,1))
begin
  select round(avg(studentmark), 1) into p_avg
  from studentinfo
  where classid = p_classid;
end //
delimiter ;

call p_class_avg('G0208', @avg);
select @avg;`,
    },
  ],
};

export const sqlPaper2: LabSet = {
  id: 'db-mock-2',
  name: '模拟卷 2',
  note: 'SQL 交互进阶：联合查询、相关子查询、左连接、日期函数、更新与索引。',
  hideChecks: true,
  preface: libraryPreface,
  questions: [
    {
      id: 'db-mock-2-1',
      no: 1,
      title: '建三张表：图书借阅',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '建立图书表 book、读者表 reader、借阅表 borrow 三张表。book 有 bookid 主键、title 非空、price 大于 0、total 默认 1；reader 有 readerid 主键、readername 非空；borrow 有 borrowid 主键、bookid 与 readerid 外键分别指向 book 和 reader、borrowdate 非空、duedate、returndate。',
      checks: ['三表主键齐全', 'check 约束限制价格', '外键 references 指向正确'],
      answer: `create table book (
  bookid int primary key,
  title varchar(50) not null,
  price decimal(10,2) check (price > 0),
  total int default 1
);

create table reader (
  readerid int primary key,
  readername varchar(20) not null
);

create table borrow (
  borrowid int primary key,
  bookid int,
  readerid int,
  borrowdate date not null,
  duedate date,
  returndate date,
  foreign key (bookid) references book(bookid),
  foreign key (readerid) references reader(readerid)
);`,
    },
    {
      id: 'db-mock-2-2',
      no: 2,
      title: '联合查询：两类名单合并',
      score: '8 分',
      fileName: '02-union.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '用联合查询把「价格高于 60 元的书名」和「馆藏册数大于 2 的书名」合并成一个结果，重复的书名只出现一次。',
      checks: ['union 去重', '两个查询列数一致'],
      answer: `select title from book where price > 60
union
select title from book where total > 2;`,
    },
    {
      id: 'db-mock-2-3',
      no: 3,
      title: '相关子查询：被借过几次',
      score: '8 分',
      fileName: '03-correlated.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '列出每本书的书名和它被借阅的次数，没被借过的显示 0 次。',
      checks: ['相关子查询 count(*)', '没借过要显示 0'],
      answer: `select b.title,
       (select count(*) from borrow br where br.bookid = b.bookid) as 借阅次数
from book b
order by 借阅次数 desc;`,
    },
    {
      id: 'db-mock-2-4',
      no: 4,
      title: '聚合计算：库存总码洋',
      score: '8 分',
      fileName: '04-agg.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '统计全部图书的种数、库存总册数和库存总码洋（价格 × 册数之和），金额保留两位小数。',
      checks: ['count 与 sum 组合', 'round 保留两位'],
      answer: `select count(*) as 种数,
       sum(total) as 总册数,
       round(sum(price * total), 2) as 总码洋
from book;`,
    },
    {
      id: 'db-mock-2-5',
      no: 5,
      title: '日期计算：逾期天数',
      score: '8 分',
      fileName: '05-date.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '查询尚未归还、且已超过应还日期的借阅记录，列出借阅编号、应还日期和逾期天数（按今天计算）。',
      checks: ['returndate is null 判断未还', 'datediff 计算天数'],
      answer: `select borrowid, duedate, datediff(curdate(), duedate) as 逾期天数
from borrow
where returndate is null
  and duedate < curdate();`,
    },
    {
      id: 'db-mock-2-6',
      no: 6,
      title: '左连接：没借过的书',
      score: '8 分',
      fileName: '06-leftjoin.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '用左连接查询从未被借阅过的图书书名和价格（左表的书都要出现，右表没有匹配的即为没借过）。',
      checks: ['left join borrow', '右表主键 is null 筛出无匹配'],
      answer: `select b.title, b.price
from book b
left join borrow br on br.bookid = b.bookid
where br.borrowid is null;`,
    },
    {
      id: 'db-mock-2-7',
      no: 7,
      title: 'case when：借阅热度分级',
      score: '8 分',
      fileName: '07-case.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '按借阅次数给图书分级：达到 3 次为「热门」，1 到 2 次为「一般」，0 次为「冷门」，输出书名、借阅次数和等级。',
      checks: ['count 后 case when 分级', '0 次也要出现'],
      answer: `select b.title,
       count(br.borrowid) as 借阅次数,
       case
         when count(br.borrowid) >= 3 then '热门'
         when count(br.borrowid) >= 1 then '一般'
         else '冷门'
       end as 等级
from book b
left join borrow br on br.bookid = b.bookid
group by b.bookid, b.title
order by 借阅次数 desc;`,
    },
    {
      id: 'db-mock-2-8',
      no: 8,
      title: '更新：按关联子查询改价格',
      score: '8 分',
      fileName: '08-update.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '把「借阅次数达到 3 次以上」的图书价格上调 5%，改完后查询图书表确认结果。',
      checks: ['update 带子查询条件', '改完再 select 确认'],
      answer: `update book
set price = round(price * 1.05, 2)
where bookid in (
  select bookid from borrow group by bookid having count(*) >= 3
);

select bookid, title, price from book order by bookid;`,
    },
    {
      id: 'db-mock-2-9',
      no: 9,
      title: '视图：读者借阅汇总',
      score: '8 分',
      fileName: '09-view.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '建立视图 v_reader_borrow，包含读者编号、姓名、借阅次数，再查询该视图按借阅次数降序。',
      checks: ['create view 带聚合', '查询视图'],
      answer: `create view v_reader_borrow as
select r.readerid, r.readername, count(br.borrowid) as 借阅次数
from reader r
left join borrow br on br.readerid = r.readerid
group by r.readerid, r.readername;

select * from v_reader_borrow order by 借阅次数 desc;`,
    },
    {
      id: 'db-mock-2-10',
      no: 10,
      title: '索引：加速按读者查借阅',
      score: '8 分',
      fileName: '10-index.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '为 borrow 表按 readerid 建立索引 idx_reader，然后用该列做一次查询验证。',
      checks: ['create index 语法正确'],
      answer: `create index idx_reader on borrow (readerid);

select * from borrow where readerid = 1;`,
    },
    {
      id: 'db-mock-2-11',
      no: 11,
      title: '存储函数：可借册数',
      score: '10 分',
      fileName: '11-func.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '编写存储函数 fn_available，传入图书编号，返回该书「馆藏册数减去未归还的借出册数」的可借数量。',
      checks: ['create function 带 returns int', '用 select ... into 计算'],
      answer: `delimiter //
create function fn_available(p_bookid int)
returns int
deterministic
begin
  declare out_now int;
  select count(*) into out_now
  from borrow
  where bookid = p_bookid and returndate is null;
  return (select total from book where bookid = p_bookid) - out_now;
end //
delimiter ;

select fn_available(1) as 可借册数;`,
    },
    {
      id: 'db-mock-2-12',
      no: 12,
      title: '事件：每周清理已归还记录',
      score: '10 分',
      fileName: '12-event.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '创建一个事件，每周一凌晨 2 点把 2026 年 1 月 1 日之前借出且已归还的借阅记录删除。',
      checks: ['create event ... on schedule every 1 week', 'do 里写 delete 带两个条件'],
      answer: `delimiter //
create event ev_clean_borrow
on schedule every 1 week
starts '2026-01-05 02:00:00'
do
begin
  delete from borrow
  where borrowdate < '2026-01-01'
    and returndate is not null;
end //
delimiter ;`,
    },
  ],
};

export const sqlPaper3: LabSet = {
  id: 'db-mock-3',
  name: '模拟卷 3',
  note: '数据库编程：触发器、事件、存储过程与存储函数。',
  hideChecks: true,
  preface: libraryPreface,
  questions: [
    {
      id: 'db-mock-3-1',
      no: 1,
      title: '建借阅日志表',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '建立借阅日志表 borrow_log：logid int 主键自增，borrowid int 非空，action varchar(10) 非空，logtime datetime 默认当前时间。',
      checks: ['auto_increment 主键', 'default current_timestamp'],
      answer: `create table borrow_log (
  logid int primary key auto_increment,
  borrowid int not null,
  action varchar(10) not null,
  logtime datetime default current_timestamp
);`,
    },
    {
      id: 'db-mock-3-2',
      no: 2,
      title: 'insert ... select：批量补数据',
      score: '8 分',
      fileName: '02-insert.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '给 borrow 表插入一条新记录：borrowid 为 9，借 bookid 2、readerid 3，借出日期 2026-10-20，应还日期 2026-11-20；插完查出这条记录确认。',
      checks: ['insert 写全列名', 'date 用字符串字面量', '插完 select 确认'],
      answer: `insert into borrow (borrowid, bookid, readerid, borrowdate, duedate)
values (9, 2, 3, '2026-10-20', '2026-11-20');

select * from borrow where borrowid = 9;`,
    },
    {
      id: 'db-mock-3-3',
      no: 3,
      title: '查询：当前在借清单',
      score: '8 分',
      fileName: '03-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '查询当前尚未归还的借阅清单，列出借阅编号、书名、读者姓名和借出日期，按借出日期升序。',
      checks: ['borrow join book join reader', 'returndate is null 过滤'],
      answer: `select br.borrowid, b.title, r.readername, br.borrowdate
from borrow br
join book b on b.bookid = br.bookid
join reader r on r.readerid = br.readerid
where br.returndate is null
order by br.borrowdate;`,
    },
    {
      id: 'db-mock-3-4',
      no: 4,
      title: '触发器：借书前检查库存',
      score: '8 分',
      fileName: '04-trigger.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '编写触发器：插入借阅记录时，如果这本书未归还的借出数量已达到馆藏册数，就报错「库存不足，不能借阅」并阻止插入。',
      checks: ['before insert on borrow', '统计未归还数量', 'signal 阻断'],
      answer: `delimiter //
create trigger trg_borrow_limit before insert on borrow
for each row
begin
  declare out_now int;
  declare stock int;
  select count(*) into out_now
  from borrow where bookid = new.bookid and returndate is null;
  select total into stock from book where bookid = new.bookid;
  if out_now >= stock then
    signal sqlstate '45000' set message_text = '库存不足，不能借阅';
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-3-5',
      no: 5,
      title: '触发器：借书后写日志',
      score: '8 分',
      fileName: '05-trigger-log.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement: '编写触发器：借阅记录插入成功后，自动向 borrow_log 写一条 action 为 borrow 的日志。',
      checks: ['after insert on borrow', 'insert into borrow_log'],
      answer: `delimiter //
create trigger trg_borrow_log after insert on borrow
for each row
begin
  insert into borrow_log (borrowid, action) values (new.borrowid, 'borrow');
end //
delimiter ;`,
    },
    {
      id: 'db-mock-3-6',
      no: 6,
      title: '触发器：删书前先看借阅',
      score: '8 分',
      fileName: '06-trigger-del.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement: '编写触发器：删除图书前，如果该书还有未归还的借阅记录，就拒绝删除并提示。',
      checks: ['before delete on book', '用 old.bookid 统计未归还', 'signal 阻断'],
      answer: `delimiter //
create trigger trg_book_del before delete on book
for each row
begin
  declare out_now int;
  select count(*) into out_now
  from borrow where bookid = old.bookid and returndate is null;
  if out_now > 0 then
    signal sqlstate '45000' set message_text = '还有未归还的借阅，不能删除';
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-3-7',
      no: 7,
      title: '存储过程：借书并返回结果',
      score: '8 分',
      fileName: '07-proc.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '编写存储过程 p_borrow，传入借阅编号、图书编号、读者编号和借出日期，插入一条借阅记录，并通过输出参数返回成功与否（1 成功，0 失败）。',
      checks: ['in 与 out 参数齐全', '用 declare handler 或判断处理异常'],
      answer: `delimiter //
create procedure p_borrow(
  in p_id int, in p_book int, in p_reader int, in p_date date, out p_ok int
)
begin
  declare exit handler for sqlexception
  begin
    set p_ok = 0;
  end;
  insert into borrow (borrowid, bookid, readerid, borrowdate)
  values (p_id, p_book, p_reader, p_date);
  set p_ok = 1;
end //
delimiter ;

call p_borrow(10, 1, 1, '2026-10-25', @ok);
select @ok;`,
    },
    {
      id: 'db-mock-3-8',
      no: 8,
      title: '存储函数：读者借阅次数',
      score: '8 分',
      fileName: '08-func.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement: '编写存储函数 fn_borrow_count，传入读者编号，返回该读者一共借过多少次书。',
      checks: ['returns int', 'select count(*) into 变量'],
      answer: `delimiter //
create function fn_borrow_count(p_reader int)
returns int
deterministic
begin
  declare total int;
  select count(*) into total from borrow where readerid = p_reader;
  return total;
end //
delimiter ;

select fn_borrow_count(1) as 借阅次数;`,
    },
    {
      id: 'db-mock-3-9',
      no: 9,
      title: '事件：每天标记逾期',
      score: '8 分',
      fileName: '09-event.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement: '创建事件，每天凌晨 1 点执行一次：把已超过应还日期且未归还的记录的应还日期顺延 1 天。',
      checks: ['create event every 1 day', 'do 里写 update'],
      answer: `delimiter //
create event ev_overdue
on schedule every 1 day
starts current_timestamp
do
begin
  update borrow
  set duedate = date_add(duedate, interval 1 day)
  where returndate is null
    and duedate < curdate();
end //
delimiter ;`,
    },
    {
      id: 'db-mock-3-10',
      no: 10,
      title: '游标：批量生成借阅提醒',
      score: '8 分',
      fileName: '10-cursor.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '写一段存储过程代码，用游标遍历所有未归还的借阅编号，逐个插入 borrow_log（action 为 remind）。',
      checks: ['declare cursor for select', 'loop 与 fetch', 'continue handler 收尾'],
      answer: `delimiter //
create procedure p_remind()
begin
  declare done int default 0;
  declare v_id int;
  declare cur cursor for select borrowid from borrow where returndate is null;
  declare continue handler for not found set done = 1;

  open cur;
  read_loop: loop
    fetch cur into v_id;
    if done = 1 then
      leave read_loop;
    end if;
    insert into borrow_log (borrowid, action) values (v_id, 'remind');
  end loop;
  close cur;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-3-11',
      no: 11,
      title: '管理：建账号并授权',
      score: '10 分',
      fileName: '11-grant.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement:
        '创建本地账号 lib_user（密码 Lib@2026），只授予它对 library 库所有表的查询权限，然后查看该账号的权限。',
      checks: ['create user 带 host', 'grant select on library.*', 'show grants'],
      answer: `create user 'lib_user'@'localhost' identified by 'Lib@2026';
grant select on library.* to 'lib_user'@'localhost';
show grants for 'lib_user'@'localhost';`,
    },
    {
      id: 'db-mock-3-12',
      no: 12,
      title: '管理：备份与恢复',
      score: '10 分',
      fileName: '12-backup.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement:
        '写出把 library 库完整备份到 /backup/library.sql 的命令行，以及从该文件恢复的命令。',
      checks: ['mysqldump 带库名与输出重定向', '恢复用 mysql 重定向输入'],
      answer: `# 备份
mysqldump -u root -p library > /backup/library.sql

# 恢复
mysql -u root -p library < /backup/library.sql`,
    },
  ],
};

export const sqlPaper4: LabSet = {
  id: 'db-mock-4',
  name: '模拟卷 4',
  note: '管理与维护：账号、权限、备份恢复、二进制日志，配少量查询。',
  hideChecks: true,
  preface: libraryPreface,
  questions: [
    {
      id: 'db-mock-4-1',
      no: 1,
      title: '建表：读者积分表',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '建立读者积分表 reader_point：readerid int 主键，points int 默认 0 且不能小于 0，leve varchar(10) 默认「普通」，updatetime datetime 默认当前时间。',
      checks: ['default 与 check 同时写', 'datetime 默认值'],
      answer: `create table reader_point (
  readerid int primary key,
  points int default 0 check (points >= 0),
  leve varchar(10) default '普通',
  updatetime datetime default current_timestamp
);`,
    },
    {
      id: 'db-mock-4-2',
      no: 2,
      title: '查询：价格区间与库存',
      score: '8 分',
      fileName: '02-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查询价格在 40 到 80 元之间、且馆藏册数不少于 2 的图书，列出书名、价格和册数，按价格升序。',
      checks: ['between 区间', 'and 组合条件', 'order by 方向'],
      answer: `select title, price, total
from book
where price between 40 and 80
  and total >= 2
order by price;`,
    },
    {
      id: 'db-mock-4-3',
      no: 3,
      title: '管理：建账号并只读授权',
      score: '8 分',
      fileName: '03-grant.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement:
        '创建账号 query_user（主机 localhost，密码 Qy@2026），授予它对 library 库所有表只读权限，并限定每小时最多 60 次查询。',
      checks: ['create user', 'grant select', 'with max_queries_per_hour'],
      answer: `create user 'query_user'@'localhost' identified by 'Qy@2026';
grant select on library.* to 'query_user'@'localhost' with max_queries_per_hour 60;`,
    },
    {
      id: 'db-mock-4-4',
      no: 4,
      title: '管理：按列授权',
      score: '8 分',
      fileName: '04-column-grant.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '给账号 query_user 追加权限：只允许它查询 book 表的 title 和 price 两列。',
      checks: ['grant select (列名) on 表'],
      answer: `grant select (title, price) on library.book to 'query_user'@'localhost';`,
    },
    {
      id: 'db-mock-4-5',
      no: 5,
      title: '管理：撤销权限',
      score: '8 分',
      fileName: '05-revoke.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '撤销 query_user 对 library 表的查询权限，然后查看它当前的权限确认。',
      checks: ['revoke 语法', 'show grants 验证'],
      answer: `revoke select on library.* from 'query_user'@'localhost';
show grants for 'query_user'@'localhost';`,
    },
    {
      id: 'db-mock-4-6',
      no: 6,
      title: '管理：改密码与锁定',
      score: '8 分',
      fileName: '06-account.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '把 query_user 的密码改成 Qy@2027，并设置 90 天过期；再把它锁定。',
      checks: ['alter user identified by', 'password expire interval', 'account lock'],
      answer: `alter user 'query_user'@'localhost' identified by 'Qy@2027' password expire interval 90 day;
alter user 'query_user'@'localhost' account lock;`,
    },
    {
      id: 'db-mock-4-7',
      no: 7,
      title: '管理：查看当前连接',
      score: '8 分',
      fileName: '07-processlist.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '查看当前所有连接，列出线程号、用户、来源主机、数据库和执行的命令；再终止线程 25。',
      checks: ['show processlist 或 information_schema', 'kill 语句'],
      answer: `show full processlist;

kill 25;`,
    },
    {
      id: 'db-mock-4-8',
      no: 8,
      title: '管理：只备份两张表',
      score: '8 分',
      fileName: '08-dump.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '用 mysqldump 只备份 library 库的 book 和 borrow 两张表，输出到 /backup/two.sql。',
      checks: ['mysqldump 库名后跟表名'],
      answer: `mysqldump -u root -p library book borrow > /backup/two.sql`,
    },
    {
      id: 'db-mock-4-9',
      no: 9,
      title: '管理：查看二进制日志',
      score: '8 分',
      fileName: '09-binlog.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '列出当前的二进制日志文件，并查看最新一个日志里的所有事件。',
      checks: ['show binary logs / show master status', 'show binlog events'],
      answer: `show binary logs;

show master status;

show binlog events in 'mysql-bin.000001';`,
    },
    {
      id: 'db-mock-4-10',
      no: 10,
      title: '管理：用日志恢复',
      score: '8 分',
      fileName: '10-pointintime.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement: '写出用 mysqlbinlog 从二进制日志恢复到 2026-10-30 12:00:00 这个时间点的命令。',
      checks: ['mysqlbinlog --stop-datetime', '管道给 mysql'],
      answer: `mysqlbinlog --stop-datetime="2026-10-30 12:00:00" /var/lib/mysql/mysql-bin.000001 | mysql -u root -p`,
    },
    {
      id: 'db-mock-4-11',
      no: 11,
      title: '触发器：积分不能为负',
      score: '10 分',
      fileName: '11-trigger.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement:
        '给 reader_point 写触发器：更新积分时如果新值小于 0，就把它改成 0 并记录日志（log 内容随意，写进 borrow_log 即可）。',
      checks: ['before update', 'set new.points = 0', 'insert 日志'],
      answer: `delimiter //
create trigger trg_point_floor before update on reader_point
for each row
begin
  if new.points < 0 then
    set new.points = 0;
    insert into borrow_log (borrowid, action) values (new.readerid, 'point_reset');
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-4-12',
      no: 12,
      title: '存储过程：月度借阅统计',
      score: '10 分',
      fileName: '12-proc.sql',
      engine: 'MySQL',
      mode: 'mysql',
      requirement:
        '编写存储过程 p_month_stat，传入年月（如 2026-10），返回该月借出记录总数和涉及的不同读者数（两个输出参数）。',
      checks: ['两个 out 参数', 'date_format 或 between 过滤月份', '两个 select into'],
      answer: `delimiter //
create procedure p_month_stat(
  in p_month char(7), out p_count int, out p_readers int
)
begin
  select count(*) into p_count
  from borrow
  where date_format(borrowdate, '%Y-%m') = p_month;

  select count(distinct readerid) into p_readers
  from borrow
  where date_format(borrowdate, '%Y-%m') = p_month;
end //
delimiter ;

call p_month_stat('2026-10', @c, @r);
select @c, @r;`,
    },
  ],
};

export const sqlPaper5: LabSet = {
  id: 'db-mock-5',
  name: '模拟卷 5',
  note: '综合卷：照 2017.4 真题的题型顺序，覆盖建表、查询、更新、视图、触发器、过程与函数。',
  hideChecks: true,
  preface: schoolPreface,
  questions: [
    {
      id: 'db-mock-5-1',
      no: 1,
      title: '建三张表：专业、班级、学生',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '建立 majorinfo（majorid int 主键、major varchar(20)）、classinfo（classid char(5) 主键、classnumber int 允许空、majorid int 外键指向 majorinfo）、studentinfo（studentid int 主键、studentname varchar(20) 唯一、studentsex char(1) 限男/女、studentage smallint 大于 18、studentmark smallint、entrancedate date、classid char(5) 外键指向 classinfo）。',
      checks: ['三表主键', '唯一与非空约束', '两个外键 references'],
      answer: `create table majorinfo (
  majorid int primary key,
  major varchar(20)
);

create table classinfo (
  classid char(5) primary key,
  classnumber int,
  majorid int,
  foreign key (majorid) references majorinfo(majorid)
);

create table studentinfo (
  studentid int primary key,
  studentname varchar(20) not null unique,
  studentsex char(1) check (studentsex in ('男', '女')),
  studentage smallint check (studentage > 18),
  studentmark smallint,
  entrancedate date,
  classid char(5),
  foreign key (classid) references classinfo(classid)
);`,
    },
    {
      id: 'db-mock-5-2',
      no: 2,
      title: '条件查询：成绩与性别',
      score: '8 分',
      fileName: '02-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查询成绩在 80 到 95 之间、性别为女的学生姓名、年龄和成绩，按成绩降序。',
      checks: ['between', 'and 组合', 'order by desc'],
      answer: `select studentname, studentage, studentmark
from studentinfo
where studentmark between 80 and 95
  and studentsex = '女'
order by studentmark desc;`,
    },
    {
      id: 'db-mock-5-3',
      no: 3,
      title: '多表连接：专业下的学生',
      score: '8 分',
      fileName: '03-join.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '查询专业名称为「计算机科学与技术」的所有学生姓名、年龄、成绩和班级编号，按年龄从小到大排列。',
      checks: ['三表连接', 'where 过滤专业'],
      answer: `select s.studentname, s.studentage, s.studentmark, s.classid
from studentinfo s
join classinfo c on c.classid = s.classid
join majorinfo m on m.majorid = c.majorid
where m.major = '计算机科学与技术'
order by s.studentage;`,
    },
    {
      id: 'db-mock-5-4',
      no: 4,
      title: '子查询：低于本班平均分',
      score: '8 分',
      fileName: '04-subquery.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '查询班级编号为 G0208 的班级中，成绩低于该班平均成绩的学生姓名、年龄和成绩。',
      checks: ['相关子查询算本班平均', '外层过滤该班'],
      answer: `select studentname, studentage, studentmark
from studentinfo s
where classid = 'G0208'
  and studentmark < (
    select avg(studentmark) from studentinfo t where t.classid = 'G0208'
  );`,
    },
    {
      id: 'db-mock-5-5',
      no: 5,
      title: '分组：成绩优秀的班级',
      score: '8 分',
      fileName: '05-group.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查询成绩大于 90 分的学生人数多于 2 人的班级编号和人数。',
      checks: ['where 先过滤 90 分以上', 'group by + having count'],
      answer: `select classid, count(*) as 人数
from studentinfo
where studentmark > 90
group by classid
having count(*) > 2;`,
    },
    {
      id: 'db-mock-5-6',
      no: 6,
      title: '更新：把班级人数写回班级表',
      score: '8 分',
      fileName: '06-update.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '对每个班级统计学生人数，并把结果写回 classinfo 的 classnumber 字段，改完查询班级表确认。',
      checks: ['update 用关联子查询', '改完 select 确认'],
      answer: `update classinfo
set classnumber = (
  select count(*) from studentinfo s where s.classid = classinfo.classid
);

select classid, classnumber from classinfo order by classid;`,
    },
    {
      id: 'db-mock-5-7',
      no: 7,
      title: '更新：按条件调分',
      score: '8 分',
      fileName: '07-update2.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '把 2021 年之前入学、且成绩低于 60 分的学生的成绩提高 10%，改完查询确认。',
      checks: ['两个条件组合', 'update 后 select 确认'],
      answer: `update studentinfo
set studentmark = round(studentmark * 1.1, 0)
where entrancedate < '2021-01-01'
  and studentmark < 60;

select studentid, studentmark from studentinfo where entrancedate < '2021-01-01';`,
    },
    {
      id: 'db-mock-5-8',
      no: 8,
      title: '行转列：及格与不及格人数',
      score: '8 分',
      fileName: '08-pivot.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'school',
      requirement: '按性别统计及格（60 分及以上）与不及格人数，一行显示性别、及格人数、不及格人数。',
      checks: ['sum(case when ...)', 'group by studentsex'],
      answer: `select studentsex,
       sum(case when studentmark >= 60 then 1 else 0 end) as 及格人数,
       sum(case when studentmark < 60 then 1 else 0 end) as 不及格人数
from studentinfo
group by studentsex;`,
    },
    {
      id: 'db-mock-5-9',
      no: 9,
      title: '触发器：年龄小于 30 不许删',
      score: '8 分',
      fileName: '09-trigger.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement: '编写触发器：删除学生记录时，如果该学生年龄小于 30 岁，则拒绝删除。',
      checks: ['before delete', 'old.studentage 判断', 'signal'],
      answer: `delimiter //
create trigger trg_student_del before delete on studentinfo
for each row
begin
  if old.studentage < 30 then
    signal sqlstate '45000' set message_text = '年龄小于 30 岁，不允许删除';
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-5-10',
      no: 10,
      title: '触发器：插入时补性别默认值',
      score: '8 分',
      fileName: '10-trigger2.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '编写触发器：插入学生记录时，如果性别为空字符串，就自动改成「男」；如果年龄小于 18，就改成 18。',
      checks: ['before insert', '判空后 set new.列'],
      answer: `delimiter //
create trigger trg_student_fill before insert on studentinfo
for each row
begin
  if new.studentsex is null or new.studentsex = '' then
    set new.studentsex = '男';
  end if;
  if new.studentage < 18 then
    set new.studentage = 18;
  end if;
end //
delimiter ;`,
    },
    {
      id: 'db-mock-5-11',
      no: 11,
      title: '存储过程：按入学时间区间查',
      score: '10 分',
      fileName: '11-proc.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '编写存储过程 p_period，传入入学时间的下限和上限，返回该区间内所有学生信息。',
      checks: ['两个 in 参数', 'between 或 >= and <='],
      answer: `delimiter //
create procedure p_period(in p_from date, in p_to date)
begin
  select *
  from studentinfo
  where entrancedate between p_from and p_to
  order by entrancedate;
end //
delimiter ;

call p_period('2001-01-01', '2002-12-31');`,
    },
    {
      id: 'db-mock-5-12',
      no: 12,
      title: '自定义函数：拼接姓名与年龄',
      score: '10 分',
      fileName: '12-func.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '编写自定义函数 fn_class_students，传入班级编号，返回该班所有学生「姓名(年龄)」形式的拼接字符串，中间用逗号分隔。',
      checks: ['create function', 'group_concat 拼接', 'format 为 姓名(年龄)'],
      answer: `delimiter //
create function fn_class_students(p_classid char(5))
returns varchar(500)
deterministic
begin
  declare result varchar(500);
  select group_concat(concat(studentname, '(', studentage, ')') order by studentid separator ',')
  into result
  from studentinfo
  where classid = p_classid;
  return result;
end //
delimiter ;

select fn_class_students('G0208') as 名单;`,
    },
  ],
};

export const sqlPaper6: LabSet = {
  id: 'db-mock-6',
  name: '模拟卷 6',
  note: 'PHP 应用编程与综合：连接 MySQL、查询输出、防注入，前面配 SQL 基础题。',
  hideChecks: true,
  preface: libraryPreface,
  questions: [
    {
      id: 'db-mock-6-1',
      no: 1,
      title: '建表：图书分类',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      mode: 'ddl',
      requirement:
        '建立图书分类表 category：catid int 主键自增，catname varchar(20) 非空唯一，remark varchar(100) 允许空。',
      checks: ['auto_increment 主键', 'not null unique'],
      answer: `create table category (
  catid int primary key auto_increment,
  catname varchar(20) not null unique,
  remark varchar(100)
);`,
    },
    {
      id: 'db-mock-6-2',
      no: 2,
      title: '查询：借阅最多的三本书',
      score: '8 分',
      fileName: '02-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查询被借阅次数最多的三本书，列出书名和借阅次数，次数相同按书名升序。',
      checks: ['group by + count', 'order by 两次', 'limit 3'],
      answer: `select b.title, count(*) as 次数
from borrow br
join book b on b.bookid = br.bookid
group by b.bookid, b.title
order by 次数 desc, b.title
limit 3;`,
    },
    {
      id: 'db-mock-6-3',
      no: 3,
      title: '查询：从未借书的读者',
      score: '8 分',
      fileName: '03-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查询从未产生过借阅记录的读者编号和姓名。',
      checks: ['not exists 或 left join is null'],
      answer: `select r.readerid, r.readername
from reader r
where not exists (
  select 1 from borrow br where br.readerid = r.readerid
);`,
    },
    {
      id: 'db-mock-6-4',
      no: 4,
      title: '查询：每人借阅次数排行',
      score: '8 分',
      fileName: '04-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '统计每位读者的借阅次数（含 0 次），按次数降序、姓名升序输出。',
      checks: ['left join 保留 0 次', 'count 右表主键'],
      answer: `select r.readername, count(br.borrowid) as 次数
from reader r
left join borrow br on br.readerid = r.readerid
group by r.readerid, r.readername
order by 次数 desc, r.readername;`,
    },
    {
      id: 'db-mock-6-5',
      no: 5,
      title: '查询：逾期未还清单',
      score: '8 分',
      fileName: '05-select.sql',
      engine: 'MySQL',
      mode: 'query',
      dataset: 'library',
      requirement: '列出所有逾期未还的记录：借阅编号、书名、读者姓名、应还日期。',
      checks: ['returndate is null', 'duedate < curdate()', '两表连接'],
      answer: `select br.borrowid, b.title, r.readername, br.duedate
from borrow br
join book b on b.bookid = br.bookid
join reader r on r.readerid = br.readerid
where br.returndate is null
  and br.duedate < curdate();`,
    },
    {
      id: 'db-mock-6-6',
      no: 6,
      title: 'PHP：连接数据库',
      score: '8 分',
      fileName: '06-connect.php',
      engine: 'PHP',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '用 PHP 的 mysqli 连接本机 MySQL 的 library 库（用户 root，密码 123456），连接失败要输出错误信息并退出。',
      checks: ['new mysqli', 'connect_errno 判断', '设置字符集 utf8mb4'],
      answer: `<?php
$mysqli = new mysqli('localhost', 'root', '123456', 'library');

if ($mysqli->connect_errno) {
    die('连接失败: ' . $mysqli->connect_error);
}

$mysqli->set_charset('utf8mb4');
echo '连接成功';
$mysqli->close();`,
    },
    {
      id: 'db-mock-6-7',
      no: 7,
      title: 'PHP：查询并输出表格',
      score: '8 分',
      fileName: '07-list.php',
      engine: 'PHP',
      mode: 'mysql',
      dataset: 'library',
      requirement: '用 PHP 查询 book 表的书名、价格、册数，输出成一个 HTML 表格（表头一行 + 数据行）。',
      checks: ['query 执行 sql', 'fetch_assoc 循环', 'html 表格输出'],
      answer: `<?php
$mysqli = new mysqli('localhost', 'root', '123456', 'library');
$mysqli->set_charset('utf8mb4');

$result = $mysqli->query('select title, price, total from book order by bookid');

echo '<table border="1">';
echo '<tr><th>书名</th><th>价格</th><th>册数</th></tr>';
while ($row = $result->fetch_assoc()) {
    echo '<tr><td>' . htmlspecialchars($row['title']) . '</td>'
       . '<td>' . $row['price'] . '</td>'
       . '<td>' . $row['total'] . '</td></tr>';
}
echo '</table>';

$mysqli->close();`,
    },
    {
      id: 'db-mock-6-8',
      no: 8,
      title: 'PHP：预处理防注入',
      score: '8 分',
      fileName: '08-prepare.php',
      engine: 'PHP',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '用预处理语句实现「按书名模糊查询」：接收表单传入的 keyword，绑定参数后查询 book 表，输出匹配的书名与价格。',
      checks: ['prepare 与 execute', 'bind_param 传参', '不拼接 SQL 字符串'],
      answer: `<?php
$mysqli = new mysqli('localhost', 'root', '123456', 'library');
$mysqli->set_charset('utf8mb4');

$keyword = '%' . ($_POST['keyword'] ?? '') . '%';

$stmt = $mysqli->prepare('select title, price from book where title like ?');
$stmt->bind_param('s', $keyword);
$stmt->execute();

$stmt->bind_result($title, $price);
while ($stmt->fetch()) {
    echo htmlspecialchars($title) . ' - ' . $price . '<br>';
}

$stmt->close();
$mysqli->close();`,
    },
    {
      id: 'db-mock-6-9',
      no: 9,
      title: 'PHP：插入借阅记录',
      score: '8 分',
      fileName: '09-insert.php',
      engine: 'PHP',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '用预处理语句向 borrow 表插入一条借阅记录（借阅编号、图书编号、读者编号、借出日期），插入成功后输出新记录的主键或影响行数。',
      checks: ['prepare insert', 'bind_param 绑四个参数', '判断执行结果'],
      answer: `<?php
$mysqli = new mysqli('localhost', 'root', '123456', 'library');
$mysqli->set_charset('utf8mb4');

$stmt = $mysqli->prepare(
    'insert into borrow (borrowid, bookid, readerid, borrowdate) values (?, ?, ?, ?)'
);
$id = 20;
$book = 3;
$reader = 2;
$date = '2026-10-30';
$stmt->bind_param('iiis', $id, $book, $reader, $date);

if ($stmt->execute()) {
    echo '插入成功，影响行数 ' . $stmt->affected_rows;
} else {
    echo '插入失败: ' . $stmt->error;
}

$stmt->close();
$mysqli->close();`,
    },
    {
      id: 'db-mock-6-10',
      no: 10,
      title: 'PHP：分页查询',
      score: '8 分',
      fileName: '10-page.php',
      engine: 'PHP',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '用 PHP 实现 book 表的分页：每页 5 条，接收 page 参数，输出当前页的数据和总条数。',
      checks: ['limit 与 offset 计算', 'count 查总数', 'page 参数校验'],
      answer: `<?php
$mysqli = new mysqli('localhost', 'root', '123456', 'library');
$mysqli->set_charset('utf8mb4');

$page = max(1, (int)($_GET['page'] ?? 1));
$size = 5;
$offset = ($page - 1) * $size;

$total = $mysqli->query('select count(*) as c from book')->fetch_assoc()['c'];
echo '总条数：' . $total . '<br>';

$stmt = $mysqli->prepare('select title, price from book order by bookid limit ? offset ?');
$stmt->bind_param('ii', $size, $offset);
$stmt->execute();
$stmt->bind_result($title, $price);
while ($stmt->fetch()) {
    echo htmlspecialchars($title) . ' - ' . $price . '<br>';
}
$stmt->close();
$mysqli->close();`,
    },
    {
      id: 'db-mock-6-11',
      no: 11,
      title: '触发器：删除图书写日志',
      score: '10 分',
      fileName: '11-trigger.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement: '编写触发器：删除图书后，自动向 borrow_log 写一条 action 为 delbook 的日志。',
      checks: ['after delete on book', 'old.bookid 写入日志'],
      answer: `delimiter //
create trigger trg_book_log after delete on book
for each row
begin
  insert into borrow_log (borrowid, action) values (old.bookid, 'delbook');
end //
delimiter ;`,
    },
    {
      id: 'db-mock-6-12',
      no: 12,
      title: '存储过程：按分类统计册数',
      score: '10 分',
      fileName: '12-proc.sql',
      engine: 'MySQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '编写存储过程 p_stock，统计每本书的书名与剩余可借册数（馆藏册数减去未归还数），按剩余册数升序输出。',
      checks: ['存储过程体里的多表查询', 'left join 统计未归还', '计算差值'],
      answer: `delimiter //
create procedure p_stock()
begin
  select b.title,
         b.total - count(br.borrowid) as 可借册数
  from book b
  left join borrow br
    on br.bookid = b.bookid and br.returndate is null
  group by b.bookid, b.title, b.total
  order by 可借册数;
end //
delimiter ;

call p_stock();`,
    },
  ],
};

export const sqlMockPapers: LabSet[] = [
  sqlPaper1,
  sqlPaper2,
  sqlPaper3,
  sqlPaper4,
  sqlPaper5,
  sqlPaper6,
];

/* ============================ Java 13216 ============================ */

const javaPaper1: LabSet = {
  id: 'java-mock-p1',
  name: 'Java 模拟卷 1',
  note: '基础语法与文件 IO：键盘输入、算法、字符流、多线程。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p1-1',
      no: 1,
      title: '键盘输入：字符分类统计',
      score: '25 分',
      fileName: 'CharCount.java',
      engine: 'Java',
      requirement:
        '编写程序，用 Scanner 读入一行字符，统计其中的数字字符、英文字母和其它字符各有多少个，并输出三个计数。',
      checks: ['使用 Scanner 读入一行', '按字符区间判断三类', '输出三个计数'],
      answer: `import java.util.Scanner;

public class CharCount {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.hasNextLine() ? sc.nextLine() : "";
        int digit = 0, letter = 0, other = 0;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c >= '0' && c <= '9') {
                digit++;
            } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
                letter++;
            } else {
                other++;
            }
        }
        System.out.println("数字 " + digit + " 字母 " + letter + " 其它 " + other);
    }
}`,
    },
    {
      id: 'java-p1-2',
      no: 2,
      title: '算法：输出水仙花数',
      score: '25 分',
      fileName: 'Narcissus.java',
      engine: 'Java',
      requirement:
        '输出 100 到 999 之间所有的水仙花数（各位数字的立方和等于该数本身），用空格分隔输出在一行。',
      checks: ['三位数拆位', '立方和比较', '输出在一行'],
      answer: `public class Narcissus {
    public static void main(String[] args) {
        for (int n = 100; n <= 999; n++) {
            int a = n / 100;
            int b = n / 10 % 10;
            int c = n % 10;
            if (a * a * a + b * b * b + c * c * c == n) {
                System.out.print(n + " ");
            }
        }
        System.out.println();
    }
}`,
    },
    {
      id: 'java-p1-3',
      no: 3,
      title: '文件读写：写入再读回',
      score: '25 分',
      fileName: 'ScoreFile.java',
      engine: 'Java',
      requirement:
        '把 5 个学生的姓名和成绩写入文件 scores.txt（每行「姓名,分数」），再从文件读回，打印每行内容。',
      checks: ['使用字符流 BufferedWriter', '每行格式 姓名,分数', '读回并逐行打印'],
      answer: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.FileReader;
import java.io.IOException;

public class ScoreFile {
    public static void main(String[] args) throws IOException {
        String[] names = { "张三", "李四", "王五", "赵六", "钱七" };
        int[] marks = { 88, 92, 76, 65, 80 };

        try (BufferedWriter out = new BufferedWriter(new FileWriter("scores.txt"))) {
            for (int i = 0; i < names.length; i++) {
                out.write(names[i] + "," + marks[i]);
                out.newLine();
            }
        }

        try (BufferedReader in = new BufferedReader(new FileReader("scores.txt"))) {
            String line;
            while ((line = in.readLine()) != null) {
                System.out.println(line);
            }
        }
    }
}`,
    },
    {
      id: 'java-p1-4',
      no: 4,
      title: '多线程：两个线程交替打印',
      score: '25 分',
      fileName: 'TurnPrint.java',
      engine: 'Java',
      requirement:
        '编写程序，用两个线程交替打印 1 到 20：一个线程打印奇数，另一个打印偶数，输出顺序为 1 2 3 … 20。',
      checks: ['两个 Thread 或 Runnable', '用锁与 wait/notify 协调'],
      answer: `public class TurnPrint {
    private static final Object lock = new Object();
    private static int current = 1;

    public static void main(String[] args) {
        Runnable odd = () -> {
            while (true) {
                synchronized (lock) {
                    while (current > 20 || current % 2 == 0) {
                        if (current > 20) {
                            lock.notifyAll();
                            return;
                        }
                        try {
                            lock.wait();
                        } catch (InterruptedException e) {
                            return;
                        }
                    }
                    System.out.print(current + " ");
                    current++;
                    lock.notifyAll();
                }
            }
        };

        Runnable even = () -> {
            while (true) {
                synchronized (lock) {
                    while (current > 20 || current % 2 == 1) {
                        if (current > 20) {
                            lock.notifyAll();
                            return;
                        }
                        try {
                            lock.wait();
                        } catch (InterruptedException e) {
                            return;
                        }
                    }
                    System.out.print(current + " ");
                    current++;
                    lock.notifyAll();
                }
            }
        };

        new Thread(odd).start();
        new Thread(even).start();
    }
}`,
    },
  ],
};

const javaPaper2: LabSet = {
  id: 'java-mock-p2',
  name: 'Java 模拟卷 2',
  note: '算法与 Swing：完数、素数、界面按钮、绘图。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p2-1',
      no: 1,
      title: '算法：输出完数',
      score: '25 分',
      fileName: 'PerfectNum.java',
      engine: 'Java',
      requirement:
        '输出 1 到 1000 之间所有的完数（等于其所有真因子之和），每个数后面跟它的因子列表。',
      checks: ['求因子累加', '判断相等', '输出因子列表'],
      answer: `public class PerfectNum {
    public static void main(String[] args) {
        for (int n = 2; n <= 1000; n++) {
            int sum = 0;
            StringBuilder factors = new StringBuilder();
            for (int i = 1; i < n; i++) {
                if (n % i == 0) {
                    sum += i;
                    factors.append(i).append(" ");
                }
            }
            if (sum == n) {
                System.out.println(n + " 的因子：" + factors);
            }
        }
    }
}`,
    },
    {
      id: 'java-p2-2',
      no: 2,
      title: '算法：输出 1 到 100 的素数',
      score: '25 分',
      fileName: 'Prime.java',
      engine: 'Java',
      requirement: '输出 1 到 100 之间的所有素数，每行打印 10 个。',
      checks: ['素数判定', '每行 10 个换行'],
      answer: `public class Prime {
    public static void main(String[] args) {
        int count = 0;
        for (int n = 2; n <= 100; n++) {
            boolean prime = true;
            for (int i = 2; i * i <= n; i++) {
                if (n % i == 0) {
                    prime = false;
                    break;
                }
            }
            if (prime) {
                System.out.print(n + " ");
                count++;
                if (count % 10 == 0) {
                    System.out.println();
                }
            }
        }
        System.out.println();
    }
}`,
    },
    {
      id: 'java-p2-3',
      no: 3,
      title: 'Swing：计数按钮',
      score: '25 分',
      fileName: 'CounterWindow.java',
      engine: 'Java',
      requirement:
        '用 JFrame 做一个计数窗口：中间 JLabel 显示次数，底部两个按钮「加一」和「清零」，点按钮更新标签文字。窗口 320×160，标题「计数」。',
      checks: ['JFrame + BorderLayout', 'JLabel 显示计数', '两个按钮加监听器更新文字'],
      answer: `import java.awt.BorderLayout;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;

public class CounterWindow extends JFrame {
    private int count = 0;
    private final JLabel label = new JLabel("0", SwingConstants.CENTER);

    public CounterWindow() {
        super("计数");
        setLayout(new BorderLayout());
        add(label, BorderLayout.CENTER);

        JButton add = new JButton("加一");
        JButton reset = new JButton("清零");
        add.addActionListener(e -> label.setText(String.valueOf(++count)));
        reset.addActionListener(e -> {
            count = 0;
            label.setText("0");
        });

        JPanel bottom = new JPanel();
        bottom.add(add);
        bottom.add(reset);
        add(bottom, BorderLayout.SOUTH);

        setSize(320, 160);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new CounterWindow();
    }
}`,
    },
    {
      id: 'java-p2-4',
      no: 4,
      title: '绘图：在面板上画图形',
      score: '25 分',
      fileName: 'DrawPanel.java',
      engine: 'Java',
      requirement:
        '编写程序，在窗口中放一个自定义面板，重写 paintComponent 方法：画一个红色圆和一个蓝色矩形，并写上一行文字。',
      checks: ['继承 JPanel 重写 paintComponent', '调用 super.paintComponent', '设置颜色并画图形与文字'],
      answer: `import java.awt.Color;
import java.awt.Graphics;
import javax.swing.JFrame;
import javax.swing.JPanel;

public class DrawPanel extends JPanel {
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        g.setColor(Color.RED);
        g.fillOval(40, 30, 80, 80);
        g.setColor(Color.BLUE);
        g.fillRect(150, 40, 100, 60);
        g.setColor(Color.BLACK);
        g.drawString("绘图示例", 40, 160);
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("绘图");
        frame.add(new DrawPanel());
        frame.setSize(320, 220);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
    },
  ],
};

const javaPaper3: LabSet = {
  id: 'java-mock-p3',
  name: 'Java 模拟卷 3',
  note: '字节流、数组排序、Swing 输入、异常处理。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p3-1',
      no: 1,
      title: '字节流：复制文件',
      score: '25 分',
      fileName: 'FileCopy.java',
      engine: 'Java',
      requirement:
        '用字节流把一个文件复制成另一个文件（源文件名、目标文件名从命令行参数取），复制完成后输出复制的字节数。',
      checks: ['FileInputStream / FileOutputStream', '循环读写与关闭', '输出字节数'],
      answer: `import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

public class FileCopy {
    public static void main(String[] args) {
        if (args.length < 2) {
            System.out.println("用法：java FileCopy 源文件 目标文件");
            return;
        }
        long total = 0;
        try (FileInputStream in = new FileInputStream(args[0]);
             FileOutputStream out = new FileOutputStream(args[1])) {
            byte[] buffer = new byte[1024];
            int n;
            while ((n = in.read(buffer)) != -1) {
                out.write(buffer, 0, n);
                total += n;
            }
            System.out.println("已复制 " + total + " 字节");
        } catch (IOException e) {
            System.out.println("复制失败：" + e.getMessage());
        }
    }
}`,
    },
    {
      id: 'java-p3-2',
      no: 2,
      title: '数组：冒泡排序',
      score: '25 分',
      fileName: 'BubbleSort.java',
      engine: 'Java',
      requirement:
        '用冒泡排序把整型数组 {5, 3, 9, 1, 7} 从小到大排序，排序前后各输出一次数组内容。',
      checks: ['双层循环', '交换逻辑', '排序前后都输出'],
      answer: `import java.util.Arrays;

public class BubbleSort {
    public static void main(String[] args) {
        int[] data = { 5, 3, 9, 1, 7 };
        System.out.println("排序前：" + Arrays.toString(data));

        for (int i = 0; i < data.length - 1; i++) {
            for (int j = 0; j < data.length - 1 - i; j++) {
                if (data[j] > data[j + 1]) {
                    int temp = data[j];
                    data[j] = data[j + 1];
                    data[j + 1] = temp;
                }
            }
        }

        System.out.println("排序后：" + Arrays.toString(data));
    }
}`,
    },
    {
      id: 'java-p3-3',
      no: 3,
      title: 'Swing：加法计算器',
      score: '25 分',
      fileName: 'Adder.java',
      engine: 'Java',
      requirement:
        '做一个窗口：两个文本框输入两个整数，一个按钮「计算」，点击后在标签上显示两数之和；输入不是数字时提示「请输入整数」。',
      checks: ['JTextField 两个', '按钮监听里解析整数', '异常时给出提示'],
      answer: `import java.awt.GridLayout;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JTextField;

public class Adder extends JFrame {
    private final JTextField a = new JTextField();
    private final JTextField b = new JTextField();
    private final JLabel result = new JLabel("结果：", JLabel.CENTER);

    public Adder() {
        super("加法计算器");
        setLayout(new GridLayout(4, 1, 6, 6));

        add(a);
        add(b);

        JButton calc = new JButton("计算");
        calc.addActionListener(e -> {
            try {
                int x = Integer.parseInt(a.getText().trim());
                int y = Integer.parseInt(b.getText().trim());
                result.setText("结果：" + (x + y));
            } catch (NumberFormatException ex) {
                result.setText("请输入整数");
            }
        });
        add(calc);
        add(result);

        setSize(300, 200);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new Adder();
    }
}`,
    },
    {
      id: 'java-p3-4',
      no: 4,
      title: '异常处理：读文件失败要提示',
      score: '25 分',
      fileName: 'ReadSafe.java',
      engine: 'Java',
      requirement:
        '编写程序读取 data.txt 的全部内容并打印；文件不存在时捕获异常，输出「文件不存在：data.txt」，程序不能崩。',
      checks: ['try/catch 捕获 IOException', '文件不存在给提示', '用 try-with-resources'],
      answer: `import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class ReadSafe {
    public static void main(String[] args) {
        Path file = Path.of("data.txt");
        try {
            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            for (String line : lines) {
                System.out.println(line);
            }
        } catch (IOException e) {
            System.out.println("文件不存在：" + file);
        }
    }
}`,
    },
  ],
};

const javaPaper4: LabSet = {
  id: 'java-mock-p4',
  name: 'Java 模拟卷 4',
  note: '继承多态、数字处理、集合统计、菜单界面。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p4-1',
      no: 1,
      title: '类的继承：形状面积',
      score: '25 分',
      fileName: 'ShapeDemo.java',
      engine: 'Java',
      requirement:
        '定义抽象类 Shape（抽象方法 area），派生出圆 Circle 和矩形 Rect，各自实现面积计算；在 main 中用父类数组存放两种对象并逐个输出面积。',
      checks: ['抽象类与抽象方法', '子类实现 area', '父类数组多态调用'],
      answer: `public class ShapeDemo {
    static abstract class Shape {
        abstract double area();
    }

    static class Circle extends Shape {
        private final double r;
        Circle(double r) {
            this.r = r;
        }

        @Override
        double area() {
            return Math.PI * r * r;
        }
    }

    static class Rect extends Shape {
        private final double w, h;
        Rect(double w, double h) {
            this.w = w;
            this.h = h;
        }

        @Override
        double area() {
            return w * h;
        }
    }

    public static void main(String[] args) {
        Shape[] shapes = { new Circle(3), new Rect(4, 5) };
        for (Shape s : shapes) {
            System.out.printf("%.2f%n", s.area());
        }
    }
}`,
    },
    {
      id: 'java-p4-2',
      no: 2,
      title: '数字处理：提取各位数字',
      score: '25 分',
      fileName: 'Digits.java',
      engine: 'Java',
      requirement:
        '输入一个正整数，输出它的位数、各位数字之和，以及按逆序拼成的数（例如 91802 → 位数 5、和 20、逆序 20819）。',
      checks: ['while 取余拆位', '统计位数与和', '逆序拼接'],
      answer: `import java.util.Scanner;

public class Digits {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.hasNextInt() ? sc.nextInt() : 91802;

        int digits = 0;
        int sum = 0;
        long reverse = 0;
        int temp = n;
        while (temp > 0) {
            int d = temp % 10;
            digits++;
            sum += d;
            reverse = reverse * 10 + d;
            temp /= 10;
        }

        System.out.println("位数 " + digits + " 和 " + sum + " 逆序 " + reverse);
    }
}`,
    },
    {
      id: 'java-p4-3',
      no: 3,
      title: '集合：统计字符出现次数',
      score: '25 分',
      fileName: 'CharStat.java',
      engine: 'Java',
      requirement:
        '输入一个字符串，用 Map 统计每个字符出现的次数，然后按键升序输出每个字符和次数。',
      checks: ['使用 HashMap 或 TreeMap', '遍历字符统计', '按键有序输出'],
      answer: `import java.util.Map;
import java.util.Scanner;
import java.util.TreeMap;

public class CharStat {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.hasNextLine() ? sc.nextLine() : "";

        Map<Character, Integer> map = new TreeMap<>();
        for (char c : line.toCharArray()) {
            map.put(c, map.getOrDefault(c, 0) + 1);
        }

        for (Map.Entry<Character, Integer> e : map.entrySet()) {
            System.out.println(e.getKey() + " " + e.getValue());
        }
    }
}`,
    },
    {
      id: 'java-p4-4',
      no: 4,
      title: 'Swing：菜单栏',
      score: '25 分',
      fileName: 'MenuWindow.java',
      engine: 'Java',
      requirement:
        '做一个带菜单栏的窗口：文件菜单下有「退出」项，点击退出程序；帮助菜单下有「关于」项，点击弹出消息框显示「Java 上机练习」。',
      checks: ['JMenuBar / JMenu / JMenuItem', '退出项调用 System.exit', '关于项弹 JOptionPane'],
      answer: `import javax.swing.JFrame;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;

public class MenuWindow extends JFrame {
    public MenuWindow() {
        super("菜单示例");

        JMenuBar bar = new JMenuBar();

        JMenu file = new JMenu("文件");
        JMenuItem quit = new JMenuItem("退出");
        quit.addActionListener(e -> System.exit(0));
        file.add(quit);

        JMenu help = new JMenu("帮助");
        JMenuItem about = new JMenuItem("关于");
        about.addActionListener(e ->
                JOptionPane.showMessageDialog(this, "Java 上机练习"));
        help.add(about);

        bar.add(file);
        bar.add(help);
        setJMenuBar(bar);

        setSize(360, 220);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new MenuWindow();
    }
}`,
    },
  ],
};

const javaPaper5: LabSet = {
  id: 'java-mock-p5',
  name: 'Java 模拟卷 5',
  note: 'Applet 与绘图、线程同步、文本文件统计、字符串处理。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p5-1',
      no: 1,
      title: 'Applet：绘制文字与图形',
      score: '25 分',
      fileName: 'HelloApplet.java',
      engine: 'Java',
      requirement:
        '编写一个 Applet（继承 java.applet.Applet），在 paint 方法里画一个矩形并写上一行文字。',
      checks: ['继承 Applet', '重写 paint(Graphics)', '画图并输出文字'],
      answer: `import java.applet.Applet;
import java.awt.Color;
import java.awt.Graphics;

public class HelloApplet extends Applet {
    @Override
    public void paint(Graphics g) {
        setBackground(Color.WHITE);
        g.setColor(Color.ORANGE);
        g.fillRect(20, 20, 120, 60);
        g.setColor(Color.BLACK);
        g.drawString("Hello Applet", 20, 120);
    }
}`,
    },
    {
      id: 'java-p5-2',
      no: 2,
      title: '多线程：同步售票',
      score: '25 分',
      fileName: 'Ticket.java',
      engine: 'Java',
      requirement:
        '编写程序模拟 3 个窗口卖 20 张票：用线程模拟窗口，保证不会卖出超过 20 张、也不会卖出重复票号。',
      checks: ['实现 Runnable 或继承 Thread', 'synchronized 保票号不重复', '票卖完退出'],
      answer: `public class Ticket implements Runnable {
    private int left = 20;

    @Override
    public void run() {
        while (true) {
            int no;
            synchronized (this) {
                if (left <= 0) {
                    return;
                }
                no = 21 - left;
                left--;
            }
            System.out.println(Thread.currentThread().getName() + " 卖出第 " + no + " 张");
        }
    }

    public static void main(String[] args) {
        Ticket ticket = new Ticket();
        new Thread(ticket, "窗口1").start();
        new Thread(ticket, "窗口2").start();
        new Thread(ticket, "窗口3").start();
    }
}`,
    },
    {
      id: 'java-p5-3',
      no: 3,
      title: '文件：统计行数与字符数',
      score: '25 分',
      fileName: 'FileStat.java',
      engine: 'Java',
      requirement:
        '读取文本文件 data.txt，统计一共有多少行、多少个字符（不含换行符），并输出结果。',
      checks: ['逐行读取', '累加行数与字符数', '文件不存在要提示'],
      answer: `import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class FileStat {
    public static void main(String[] args) {
        int lines = 0;
        int chars = 0;
        try (BufferedReader in = new BufferedReader(new FileReader("data.txt"))) {
            String line;
            while ((line = in.readLine()) != null) {
                lines++;
                chars += line.length();
            }
            System.out.println("行数 " + lines + " 字符数 " + chars);
        } catch (IOException e) {
            System.out.println("读取失败：" + e.getMessage());
        }
    }
}`,
    },
    {
      id: 'java-p5-4',
      no: 4,
      title: '字符串：反转与单词数',
      score: '25 分',
      fileName: 'WordCount.java',
      engine: 'Java',
      requirement:
        '输入一行英文句子，输出它的反转字符串（逐字符倒序）和单词个数（以空格分隔）。',
      checks: ['StringBuilder reverse', 'split 统计单词', '空行不报错'],
      answer: `import java.util.Scanner;

public class WordCount {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.hasNextLine() ? sc.nextLine() : "";

        String reversed = new StringBuilder(line).reverse().toString();
        String trimmed = line.trim();
        int words = trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;

        System.out.println("反转：" + reversed);
        System.out.println("单词数：" + words);
    }
}`,
    },
  ],
};

const javaPaper6: LabSet = {
  id: 'java-mock-p6',
  name: 'Java 模拟卷 6',
  note: '综合：递归、二维数组、Swing 列表、IO 与集合。',
  hideChecks: true,
  questions: [
    {
      id: 'java-p6-1',
      no: 1,
      title: '递归：阶乘与斐波那契',
      score: '25 分',
      fileName: 'Recursion.java',
      engine: 'Java',
      requirement:
        '编写两个递归方法：一个求 n 的阶乘，一个求斐波那契数列第 n 项，在 main 中输出 n=10 的两个结果。',
      checks: ['两个递归方法', '递归终止条件', 'main 输出两个结果'],
      answer: `public class Recursion {
    static long fact(int n) {
        return n <= 1 ? 1 : n * fact(n - 1);
    }

    static long fib(int n) {
        return n <= 2 ? 1 : fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("10 的阶乘：" + fact(10));
        System.out.println("斐波那契第 10 项：" + fib(10));
    }
}`,
    },
    {
      id: 'java-p6-2',
      no: 2,
      title: '二维数组：矩阵转置',
      score: '25 分',
      fileName: 'Transpose.java',
      engine: 'Java',
      requirement:
        '有一个 3×3 的整数矩阵，输出它的转置矩阵（行变列），按行打印。',
      checks: ['二维数组遍历', '行列互换', '按行打印'],
      answer: `public class Transpose {
    public static void main(String[] args) {
        int[][] m = {
            { 1, 2, 3 },
            { 4, 5, 6 },
            { 7, 8, 9 }
        };
        int[][] t = new int[3][3];
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                t[j][i] = m[i][j];
            }
        }
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                System.out.print(t[i][j] + " ");
            }
            System.out.println();
        }
    }
}`,
    },
    {
      id: 'java-p6-3',
      no: 3,
      title: 'Swing：待办清单',
      score: '25 分',
      fileName: 'Todo.java',
      engine: 'Java',
      requirement:
        '做一个待办清单窗口：上面文本框输入内容，点「添加」把它加到 JList 里，点「删除」移除选中的一项。',
      checks: ['JList 与 DefaultListModel', '添加按钮读取文本框', '删除按钮移除选中项'],
      answer: `import java.awt.BorderLayout;
import java.awt.GridLayout;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JTextField;

public class Todo extends JFrame {
    private final DefaultListModel<String> model = new DefaultListModel<>();
    private final JList<String> list = new JList<>(model);
    private final JTextField input = new JTextField();

    public Todo() {
        super("待办清单");
        setLayout(new BorderLayout());
        add(input, BorderLayout.NORTH);
        add(list, BorderLayout.CENTER);

        JButton addBtn = new JButton("添加");
        addBtn.addActionListener(e -> {
            String text = input.getText().trim();
            if (!text.isEmpty()) {
                model.addElement(text);
                input.setText("");
            }
        });

        JButton delBtn = new JButton("删除");
        delBtn.addActionListener(e -> {
            int index = list.getSelectedIndex();
            if (index >= 0) {
                model.remove(index);
            }
        });

        JPanel bottom = new JPanel(new GridLayout(1, 2, 6, 6));
        bottom.add(addBtn);
        bottom.add(delBtn);
        add(bottom, BorderLayout.SOUTH);

        setSize(320, 240);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new Todo();
    }
}`,
    },
    {
      id: 'java-p6-4',
      no: 4,
      title: 'IO 与集合：统计词频',
      score: '25 分',
      fileName: 'WordFreq.java',
      engine: 'Java',
      requirement:
        '读取文本文件 words.txt，按空格拆分单词，用 Map 统计每个单词出现次数，输出次数最多的前三个单词。',
      checks: ['读文件拆词', 'Map 累计次数', '排序取前三'],
      answer: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WordFreq {
    public static void main(String[] args) throws IOException {
        String text = Files.readString(Path.of("words.txt"));
        Map<String, Integer> map = new HashMap<>();
        for (String w : text.trim().split("\\s+")) {
            if (!w.isEmpty()) {
                map.put(w, map.getOrDefault(w, 0) + 1);
            }
        }

        List<Map.Entry<String, Integer>> list = new ArrayList<>(map.entrySet());
        list.sort((x, y) -> y.getValue() - x.getValue());

        for (int i = 0; i < Math.min(3, list.size()); i++) {
            System.out.println(list.get(i).getKey() + " " + list.get(i).getValue());
        }
    }
}`,
    },
  ],
};

export const javaMockPapers: LabSet[] = [
  javaPaper1,
  javaPaper2,
  javaPaper3,
  javaPaper4,
  javaPaper5,
  javaPaper6,
];
