import fs from 'node:fs';import {fileURLToPath} from 'node:url';import vm from 'node:vm';import assert from 'node:assert/strict';
let files=[],uploads=0,deletions=[];const listeners=[];const formFields=[];
const context={console,chrome:{runtime:{id:'helper',onMessage:{addListener:f=>listeners.push(f)}}},setTimeout,clearTimeout,atob,Uint8Array,FormData,File,AbortController,location:{origin:'https://selfcopying.cnbksy.com'},fetch:async(path,options={})=>{
 let data;if(path.endsWith('Auth/Check'))data={code:0};
 else if(path.endsWith('PrintJob/Get'))data={code:0,result:files};
 else if(path.endsWith('CloudPrint/Upload')){const f=options.body;formFields.push(Object.fromEntries([...f.entries()].filter(([k])=>k!=='szPath')));uploads++;const pages=f.get('dwDuplex')==='1'?1:2;files.push({dwJobId:uploads,szJobName:f.get('szPath').name,dwCopies:1,szAttribe:pages===1?'single,':'vdup,',szPaperDetail:JSON.stringify([{dwPaperID:9,dwBWPages:pages,dwColorPages:0}])});data={};}
 else if(path.endsWith('PrintJob/Del')){const d=JSON.parse(options.body);deletions.push(d.dwJobId);files=files.filter(f=>f.dwJobId!==d.dwJobId);data={code:0};}
 else throw Error(path);return {ok:true,json:async()=>data};
}};vm.createContext(context);vm.runInContext(fs.readFileSync(fileURLToPath(new URL('../../print-helper/library.js',import.meta.url)),'utf8'),context);
const call=(name,...args)=>{context.args=args;return vm.runInContext(`${name}(...args)`,context);};
const one={name:'完整长文件名称不会截断.pdf',pages:1,base64:Buffer.from('%PDF-1.4 synthetic').toString('base64')};let state=await call('remoteUpload',one);assert.equal(state.files[0].name,one.name);await call('remoteUpload',one);assert.equal(uploads,1);
state=await call('remoteUpload',{...one,name:'双面.pdf',pages:2});assert.equal(uploads,2);assert.equal(formFields[0].dwDuplex,'1');assert.equal(formFields[1].dwDuplex,'2');assert.equal(formFields[1].dwPaperId,'9');assert.equal(formFields[1].dwColor,'1');assert.equal(formFields[1].dwCopies,'1');
await call('remoteDelete',[state.files[0].key]);assert.deepEqual(deletions,[1]);assert.equal(files.length,1);await assert.rejects(call('remoteDelete',['missing']),/已变化/);assert.equal(files.length,1);console.log('browser API upload/dedup/duplex/exact deletion: PASS');
