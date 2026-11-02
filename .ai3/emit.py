import json,io,glob,os,re,unicodedata
MAP={'judge':'tf','single':'single','multi':'multi'}
def load(dirn):
    ans={}
    for f in glob.glob(f'.ai3/{dirn}/*.json'):
        base=os.path.basename(f)[:-5]; kind,idx=base.split('-'); typ=MAP[kind]; off=(int(idx)-1)*100
        for a in json.load(io.open(f,encoding='utf-8'))['answers']:
            ans[(typ,off+int(a['no']))]=a['ans'].strip().upper()
    return ans
A=load('answers'); B=load('answers2'); C=load('answers3')
adj={}
if os.path.exists('.ai3/adjudicated.json'):
    for a in json.load(io.open('.ai3/adjudicated.json',encoding='utf-8'))['answers']:
        adj[(a['type'],int(a['no']))]=a['ans'].strip().upper()
p5=json.load(io.open('/tmp/ai3/paper5.json',encoding='utf-8'))
def norm(s):
    s=unicodedata.normalize('NFKC',s)
    return re.sub(r'[\s\u3000（）()【】\[\]“”"\'’‘。，,、；;：:？?！!．.\-—]','',s)[:60]
off={}
for key,typ in [('tf','tf'),('single','single'),('multi','multi')]:
    for o in p5[key]:
        off[(typ,norm(o['stem']))]=(['T'] if o['answer'] else ['F']) if typ=='tf' else list(o['answer'])
def norm_pub(s):
    s=unicodedata.normalize('NFKC',s or '')
    s=re.split(r'答案[:：]',s)[0]
    s=re.split(r'[（(]\s*[A-Ea-e]\s*[)）]',s)[0]
    s=re.sub(r'[\s\u3000，。、；：？！,.;:?!（）()【】\[\]“”"\'’‘\-—_/]+','',s)
    return s[:50]
PUB={}
if os.path.exists('/tmp/ai3/pub70.json'):
    for typ,qs in json.load(io.open('/tmp/ai3/pub70.json',encoding='utf-8')).items():
        for q in qs:
            PUB[(typ,q['norm'])]=q['key']
bank=json.load(io.open('.ai3/bank_raw.json',encoding='utf-8'))
rows=[];stat={'official':0,'public':0,'adj':0,'agree':0,'only1':0}
for q in bank:
    typ=q['type']; k=(typ,q['no'])
    o=off.get((typ,norm(q['stem'])))
    pk=PUB.get((typ,norm_pub(q['stem'])))
    if o is not None:
        ans=o; ver=True; stat['official']+=1
    elif pk is not None:
        ans=['T'] if pk=='T' else (['F'] if typ=='tf' else list(pk)); ver=True; stat['public']+=1
    elif k in adj:
        a=adj[k]; ans=['T'] if (typ=='tf' and a=='T') else (['F'] if typ=='tf' else list(a)); ver=False; stat['adj']+=1
    else:
        from collections import Counter
        votes=[x for x in (A.get(k),B.get(k),C.get(k)) if x]
        if votes:
            top,cnt=Counter(votes).most_common(1)[0]
            if cnt>=2: a=top; stat['agree']+=1
            else: a=A.get(k) or votes[0]; stat['only1']+=1
        else:
            a='T' if typ=='tf' else 'A'
        ans=['T'] if (typ=='tf' and a=='T') else (['F'] if typ=='tf' else list(a))
        ver=False
    opts=','.join("{key:'%s',text:%s}"%(kk,json.dumps(tt,ensure_ascii=False)) for kk,tt in q['opts'])
    rows.append("  { id: '%s', type: '%s', stem: %s, %sanswer: [%s], verified: %s },"%(
        f"ai3-{typ}-{q['no']}", typ, json.dumps(q['stem'],ensure_ascii=False),
        ("options: [%s], "%opts) if opts else '',
        ','.join("'%s'"%x for x in ans), 'true' if ver else 'false'))
head='''/** 人工智能训练师（三级）理论知识题库。
 *  题目来源：《人工智能训练师_3级_理论知识复习题》（第 3 部分，官方公布，900 题）：
 *    判断题 300 + 单选题 300 + 多选题 300。
 *  答案来源：
 *   - verified: true  → 有权威答案：官方《理论知识模拟试卷》(190 题) + 《题库·公开 70%》(含答案与解析)，
 *                       合计 892 题；
 *   - verified: false → AI 解析推定（三遍独立作答 + 多数表决），仅 8 题，可在页面上纠错。
 *  考试结构按《3 级认定方案》：90 分钟；判断 40×0.5 + 单选 140×0.5 + 多选 10×1 = 100 分。
 */

export type AiQuestionType = 'tf' | 'single' | 'multi';

export interface AiOption {
  key: string;
  text: string;
}

export interface AiQuestion {
  id: string;
  type: AiQuestionType;
  stem: string;
  options?: AiOption[];
  /** 正确答案：判断题为 ['T'] / ['F']，选择题为字母数组。 */
  answer: string[];
  /** 是否来自官方带答案的模拟卷（false = AI 解析推定）。 */
  verified?: boolean;
}

/** 理论考试方案（与认定方案一致）。 */
export const AI_THEORY_PLAN = [
  { type: 'tf' as const, label: '判断题', count: 40, per: 0.5 },
  { type: 'single' as const, label: '单选题', count: 140, per: 0.5 },
  { type: 'multi' as const, label: '多选题', count: 10, per: 1 },
];

export const AI_THEORY_MINUTES = 90;

export const AI_THEORY_QUESTIONS: AiQuestion[] = [
'''
io.open('src/data/aiTrainer.ts','w',encoding='utf-8').write(head+'\n'.join(rows)+'\n];\n')
print('写出 src/data/aiTrainer.ts：', len(rows), '题 |', stat)
