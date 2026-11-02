import json,io,re,unicodedata,os,glob
bank=json.load(io.open('.ai3/bank_raw.json',encoding='utf-8'))
# 汇总答案
ans={}
MAP={'judge':'tf','single':'single','multi':'multi'}
for f in glob.glob('.ai3/answers/*.json'):
    base=os.path.basename(f)[:-5]
    kind,idx=base.split('-'); typ=MAP[kind]; off=(int(idx)-1)*100
    d=json.load(io.open(f,encoding='utf-8'))
    for a in d['answers']:
        ans[(typ,off+int(a['no']))]=a['ans'].strip().upper()
print('摘要答案条数',len(ans))
# 官方 190
p5=json.load(io.open('/tmp/ai3/paper5.json',encoding='utf-8'))
def norm(s):
    s=unicodedata.normalize('NFKC',s)
    return re.sub(r'[\s\u3000（）()【】\[\]“”"\'’‘。，,、；;：:？?！!．.\-—]','',s)[:60]
off={}
for key,typ in [('tf','tf'),('single','single'),('multi','multi')]:
    for o in p5[key]:
        off[(typ,norm(o['stem']))]=o
missing=[]; agree=0; disagree=[]; verified_n=0
out=[]
for q in bank:
    typ=q['type']; key=(typ,norm(q['stem']))
    o=off.get(key)
    if o is not None:
        if typ=='tf': anslist=['T'] if o['answer'] else ['F']
        else: anslist=list(o['answer'])
        verified=True; verified_n+=1
        mine=ans.get((typ,q['no']))
        if mine:
            if ''.join(sorted(mine))==''.join(sorted(anslist)): agree+=1
            else: disagree.append((q['no'],typ,mine,''.join(anslist),q['stem'][:34]))
    else:
        a=ans.get((typ,q['no']))
        if not a: missing.append((typ,q['no'])); anslist=['T']; verified=False
        else:
            anslist=['T'] if (typ=='tf' and a=='T') else (['F'] if typ=='tf' else list(a))
            verified=False
    opts=[{'key':k,'text':t} for k,t in q['opts']]
    out.append({'id':f"ai3-{typ}-{q['no']}",'type':typ,'stem':q['stem'],'options':opts or None,'answer':anslist,'verified':verified})
print('官方答案覆盖',verified_n,'| AI与官方一致',agree,'/',verified_n-agree+agree if verified_n else 0,'| 不一致',len(disagree))
for d in disagree[:12]: print('  分歧',d)
print('缺答案',len(missing),missing[:5])
json.dump(out,io.open('.ai3/bank_final.json','w',encoding='utf-8'),ensure_ascii=False)
print('写出 .ai3/bank_final.json',len(out))
