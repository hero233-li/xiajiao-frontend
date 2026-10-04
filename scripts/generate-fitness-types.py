#!/usr/bin/env python3
"""Generate browser types from authoritative Java records; no duplicated field list."""
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1]
source=(root.parent/'backend/src/main/java/cn/xuexizhitu/fitness/domain/FitnessModels.java').read_text()
out=['// Generated from backend FitnessModels.java. Run python3 scripts/generate-fitness-types.py.']
for name,values in re.findall(r'public enum (\w+) \{([^}]+)\}',source):
 out.append('export type '+name+' = '+' | '.join(repr(v.strip()) for v in values.split(','))+';')
for m in re.finditer(r'public record (\w+)\(',source):
 name=m.group(1); start=m.end(); depth=1; i=start
 while depth:
  if source[i]=='(':depth+=1
  elif source[i]==')':depth-=1
  i+=1
 params=source[start:i-1]
 params=re.sub(r'@(\w+)(?:\([^)]*\))?',r'@\1',params)
 fields=[]; depth=0; last=0
 for i,c in enumerate(params):
  if c=='<':depth+=1
  elif c=='>':depth-=1
  elif c==',' and depth==0:fields.append(params[last:i]);last=i+1
 fields.append(params[last:]); out.append('export interface '+name+' {')
 for field in fields:
  required='@NotNull' in field or '@NotBlank' in field
  field=re.sub(r'@\w+','',field).strip(); typ,key=field.rsplit(None,1)
  typ=re.sub(r'\s+','',typ)
  mapping={'String':'string','LocalDate':'string','BigDecimal':'number','Integer':'number','Boolean':'boolean'}
  if typ.startswith('List<'):typ=typ[5:-1]+'[]'
  else:typ=mapping.get(typ,typ)
  out.append('  '+key+': '+typ+(';' if required else ' | null;'))
 out.append('}')
result='\n'.join(out)+'\n'; target=root/'src/api/fitness-models.ts'
if '--check' in sys.argv:
 if not target.exists() or target.read_text()!=result:sys.exit('Fitness contract drift')
else:target.write_text(result)
