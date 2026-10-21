const pause=ms=>new Promise(r=>setTimeout(r,ms));
let observedList=false;
const fullName=h=>(h.getAttribute('title')||h.textContent||'').trim();
const fileParameters=h=>h.parentElement.textContent.replace(h.textContent,'').trim();
function read(){
 const login=document.querySelector('.loginselect,#loginselect');const text=login?.textContent?.trim()??'';
 const loggedIn=!!text&&!/登录|扫码|login/i.test(text);
 const list=document.querySelector('#printul,.printul');
 const files=[...(list?.querySelectorAll('h4')??[])].map(h=>{const name=fullName(h);const parameters=fileParameters(h);return {name,parameters,key:JSON.stringify([name,parameters])};});
 if(files.length)observedList=true;
 const listEmpty=!!list&&/暂无|没有文件|无文件|no files/i.test(list.textContent);
 const filesReady=!!list&&(files.length>0||listEmpty||observedList);
 return {ready:!!text,connected:true,loggedIn,files,filesReady,reason:loggedIn?'文印网站已登录，登录信息仅保留在浏览器中':'请在文印网站扫码登录'};
}
function radio(text){
 const input=[...document.querySelectorAll('input[type=radio]')].find(r=>{
   const label=r.id&&document.querySelector('label[for="'+r.id+'"]');
   return label?.textContent?.trim()===text||r.parentElement.textContent.replace(/\s/g,'')===text||r.nextSibling?.textContent?.trim()===text||r.nextElementSibling?.textContent?.trim()===text;
 });
 if(!input)throw Error('文印表单已变化，未找到“'+text+'”选项');input.click();if(!input.checked)throw Error('未能确认打印参数：'+text);return input;
}
async function upload(p){
 if(!read().loggedIn)throw Error('请先扫码登录文印网站');
 const input=document.querySelector('input[type=file]#file');const button=document.querySelector('#upfile');
 if(!input||!button)throw Error('文印上传表单暂不可用');
 const raw=atob(p.base64);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length>10*1024*1024||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('须为10MB以内的PDF');
 const files=new DataTransfer();files.items.add(new File([bytes],p.name,{type:'application/pdf'}));input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 for(let n=0;n<30&&button.disabled;n++)await pause(300);
 radio('黑白');radio('A4');radio(p.pages===1?'单面':'双面长边');radio('全部');
 const copies=document.querySelector('#dwCopies');if(!copies)throw Error('未找到打印份数');copies.value='1';copies.dispatchEvent(new Event('input',{bubbles:true}));copies.dispatchEvent(new Event('change',{bubbles:true}));
 if(button.disabled||copies.value!=='1')throw Error('文印网站尚未允许提交，请检查文件');
 button.click();return {started:true};
}
function prepareDelete(keys){
 const state=read();if(!state.loggedIn||!state.filesReady)throw Error('请先刷新文印列表并登录');
 if(!Array.isArray(keys)||!keys.length||keys.length>100||keys.some(k=>typeof k!=='string'||k.length>2000))throw Error('请选择要删除的文印文件');
 const list=document.querySelector('#printul,.printul');const headings=[...list.querySelectorAll('h4')];const selected=[];
 for(const key of keys){
  const matches=headings.filter(h=>JSON.stringify([fullName(h),fileParameters(h)])===key);
  if(matches.length!==1)throw Error('文件列表已变化或存在重名文件，请重新同步列表后再删除');
  let row=matches[0].parentElement;
  while(row&&row!==list&&!row.querySelector('input[type=checkbox]'))row=row.parentElement;
  if(!row||row===list)throw Error('无法定位文印文件，请在文印网站操作');
  const boxes=row.querySelectorAll('input[type=checkbox]');if(boxes.length!==1)throw Error('文件结构已变化，请在文印网站操作');selected.push(boxes[0]);
 }
 const button=document.querySelector('#del-btn');if(!button)throw Error('未找到文印删除按钮');
 for(const box of list.querySelectorAll('input[type=checkbox]'))if(box.checked!==selected.includes(box))box.click();
 if(selected.some(box=>!box.checked))throw Error('未能确认所选文件');
 // Preserve the library's own confirmation dialog for the user to review.
 setTimeout(()=>button.click(),100);return {started:true};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return;
 if(message.action==='delete'){try{respond(prepareDelete(message.keys));}catch(e){respond({error:e.message});}return;}
 if(message.action==='read'){respond(read());return;}
 if(message.action==='upload'){upload(message.payload).then(respond,e=>respond({error:e.message}));return true;}
});

// Use the website's own same-origin API and this browser's existing session.
// No login credential is sent to Zhitu or to another browser.
async function libraryRequest(path,options={}){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),100000);
 try{const r=await fetch('/api/client/'+path,{...options,credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('文印服务暂时不可用（'+r.status+'）');return r;}finally{clearTimeout(timer);}
}
async function remoteStatus(){
 const auth=await (await libraryRequest('Auth/Check',{method:'POST'})).json();if(auth.code!==0)return {connected:true,loggedIn:false,filesReady:false,files:[],reason:'浏览器文印登录已失效，请扫码登录'};
 const result=await (await libraryRequest('PrintJob/Get')).json();if(result.code!==0)throw Error('文印文件列表读取失败，请重新登录');
 const files=(result.result||[]).map(row=>{const p=JSON.parse(row.szPaperDetail);const a=row.szAttribe||'';const parameters=(p[0]?.dwPaperID===9?'A4':'A3')+'; '+(a.includes('color')?'彩色':'黑白')+'; '+(a.includes('vdup')?'双面长边':a.includes('single')?'单面':'双面短边')+'; '+row.dwCopies+' 份';return {remoteId:String(row.dwJobId),name:row.szJobName,parameters,key:JSON.stringify([row.szJobName,parameters]),pages:p.reduce((n,x)=>n+x.dwBWPages+x.dwColorPages,0)};});
 return {connected:true,loggedIn:true,filesReady:true,files,reason:'浏览器文印已登录；同步期间请保持电脑联网和浏览器运行'};
}
function remoteMatch(state,p){const files=state.files.filter(f=>f.name===p.name);if(!files.length)return false;if(files.length!==1)throw Error('文印存在重名文件，请先检查');const f=files[0];if(f.parameters!==`A4; 黑白; ${p.pages===1?'单面':'双面长边'}; 1 份`||f.pages!==p.pages)throw Error('同名文件的文印参数或页数不一致，请检查后重试');return true;}
async function remoteUpload(p){
 let state=await remoteStatus();if(!state.loggedIn)throw Error(state.reason);if(remoteMatch(state,p))return state;
 const raw=atob(p.base64);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(bytes.length>10*1024*1024||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('须为10MB以内的PDF');
 const form=new FormData();form.append('szPath',new File([bytes],p.name,{type:'application/pdf'}));for(const [k,v] of Object.entries({dwColor:'1',dwPaperId:'9',dwDuplex:p.pages===1?'1':'2',dwFrom:'0',dwTo:'0',dwCopies:'1',BackURL:location.origin+'/client/new/cprintPc/printDoc.html'}))form.append(k,v);
 await libraryRequest('CloudPrint/Upload',{method:'POST',body:form});
 for(let n=0;n<10;n++){state=await remoteStatus();if(!state.loggedIn)throw Error(state.reason);if(remoteMatch(state,p))return state;await pause(1000);}throw Error('文印尚未确认结果，请同步列表后重试');
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||!['remoteStatus','remoteUpload','remoteDelete'].includes(message.action))return;
 (message.action==='remoteStatus'?remoteStatus():message.action==='remoteDelete'?remoteDelete(message.keys):remoteUpload(message.payload)).then(respond,e=>respond({error:e.name==='AbortError'?'文印请求超时，请先同步列表核对结果':e.message}));return true;
});

async function remoteDelete(keys){
 if(!Array.isArray(keys)||!keys.length||keys.length>100||keys.some(k=>typeof k!=='string'||k.length>2000))throw Error('请选择要删除的文印文件');
 const state=await remoteStatus();if(!state.loggedIn)throw Error(state.reason);const files=keys.map(key=>{const matches=state.files.filter(f=>f.key===key);if(matches.length!==1)throw Error('文印列表已变化或存在重名文件，请刷新后重试');return matches[0];});
 for(const file of files){const result=await (await libraryRequest('PrintJob/Del',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dwJobId:Number(file.remoteId),dwOldJobId:Number(file.remoteId)})})).json();if(result.code!==0)throw Error('文印删除失败，请刷新列表核对');}
 const current=await remoteStatus();if(!current.loggedIn||files.some(f=>current.files.some(row=>row.remoteId===f.remoteId)))throw Error('删除结果尚未确认，请刷新列表');return current;
}
