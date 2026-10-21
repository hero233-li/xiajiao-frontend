const BASE='https://selfcopying.cnbksy.com/client/new/cprintPc/';
const origins=new Set(['https://xiajiao.cloud','http://124.222.151.76:8080','http://localhost:5173','http://127.0.0.1:5173']);
let uploading=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function manager(){const stored=await chrome.storage.session.get('manager');let tab;try{tab=stored.manager&&await chrome.tabs.get(stored.manager);}catch{/* The remembered tab may have closed; create a replacement below. */}if(!tab||!tab.url?.startsWith(BASE)){tab=await chrome.tabs.create({url:BASE+'printDoc.html',active:false});await chrome.storage.session.set({manager:tab.id});}return tab;}
async function command(tab,message){
 // Retry only delivery while the content script is loading. Never replay an uncertain upload.
 for(let n=0;n<120;n++){
  let response;try{response=await chrome.tabs.sendMessage(tab.id,message);}catch(error){if(!/Receiving end does not exist|Could not establish connection/i.test(error.message))throw error;await pause(250);continue;}
  if(response?.error)throw Error(response.error);if(!response)throw Error('文印未返回结果，请同步列表后再重试');return response;
 }throw Error('文印页面尚未加载，请打开文印网站后重试');
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.frameId!==0||!sender.url||!origins.has(new URL(sender.url).origin)||!['status','upload','delete'].includes(message.action))return;
 (async()=>{
  const tab=await manager();
  if(message.action==='status')return {result:await command(tab,{action:'remoteStatus'})};
  if(uploading)throw Error('已有文件正在处理，请等待完成');uploading=true;
  try{
   if(message.action==='delete'){
    return {result:await command(tab,{action:'remoteDelete',keys:message.payload?.keys})};
   }
   const p=message.payload;if(!p||typeof p.name!=='string'||p.name.length>300||!p.name.endsWith('.pdf')||typeof p.base64!=='string'||p.base64.length>14*1024*1024||!Number.isInteger(p.pages)||p.pages<1||p.pages>500)throw Error('打印文件参数无效');
   return {result:await command(tab,{action:'remoteUpload',payload:p})};
  }finally{uploading=false;}
 })().then(respond,error=>respond({error:error.message}));return true;
});
