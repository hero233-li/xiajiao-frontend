import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/http';
import { createUuid } from '../../utils/uuid';
import { printSyncConfig, serverPrint, type PrintSyncMode, type PrintSyncJob, blobBase64, printBlob, printBridge, type PrintDocument, type PrintConnection } from './printApi';

export function usePrintWorkspace(scopeId: string | undefined, hasCourse: boolean) {
  const client = useQueryClient();
  const [mode,setMode]=useState<PrintSyncMode|null>(null);const [qr,setQr]=useState('');const [qrUntil,setQrUntil]=useState(0);const [serverJobs,setServerJobs]=useState<PrintSyncJob[]>([]);const lastServerDone=useRef('');
  const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(10);
  const [syncResults,setSyncResults]=useState<{id:string;filename:string;ok:boolean;reason:string}[]>([]);
  const [filter, setFilter] = useState('PENDING');const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);const pending = useRef(false);const [message, setMessage] = useState('');const [error, setError] = useState('');
  const [connection, setConnection] = useState<PrintConnection>({connected:false,reason:'尚未检查连接'});
  const connectionPending=useRef(false);const [checking,setChecking] = useState(false);
  const [remoteSelected,setRemoteSelected]=useState<string[]>([]);const [deletingRemote,setDeletingRemote]=useState(false);const [remoteError,setRemoteError]=useState('');
  const [checkedAt,setCheckedAt] = useState('');
  const [history,setHistory] = useState<{ title: string; items: {id:string;action:string;created_at:string}[] } | null>(null);
  const attempts = useRef<{action:string;ids:string;keys:Record<string,string>}>();
  const query = useQuery({queryKey:['print-documents',scopeId],queryFn:async()=> (await apiRequest<{data:PrintDocument[]}>({url:'/api/v1/printing/documents',params:scopeId?{courseId:scopeId}:{},silent:true})).data});
  const allDocs=(query.data??[]).filter(d=>!scopeId||d.course_id===scopeId);const docs=allDocs.filter(d=>!d.status.startsWith('TRASH_'));const visible = allDocs.filter(d=>filter==='TRASH'?d.status.startsWith('TRASH_'):!d.status.startsWith('TRASH_')&&(filter==='ALL'||filter==='PENDING'&&d.status!=='PRINTED'||d.status===filter));const chosen=allDocs.filter(d=>selected.includes(d.id));
  const pageCount=Math.max(1,Math.ceil(visible.length/pageSize));const currentPage=Math.min(page,pageCount);const pageDocs=visible.slice((currentPage-1)*pageSize,currentPage*pageSize);const chosenPages=chosen.reduce((n,d)=>n+d.pages,0);
  useEffect(()=>{setSelected([]);setPage(1);},[scopeId,filter]);
  const refreshConnection = useCallback(async () => {
    if(connectionPending.current||deletingRemote)return;connectionPending.current=true;setChecking(true);
    try{const currentMode=mode??(await printSyncConfig()).mode;setMode(currentMode);const result=currentMode==='SERVER'?await serverPrint<PrintConnection>('status'):await printBridge('status');setConnection(result);setRemoteSelected([]);setCheckedAt(new Date().toLocaleTimeString('zh-CN'));}
    catch(cause){setConnection({connected:false,reason:cause instanceof Error?cause.message:'连接失败'});}
    finally{connectionPending.current=false;setChecking(false);}
  }, [mode, deletingRemote]);
  // Keep the existing mount and polling cadence while using current connection state.
  const refreshConnectionRef = useRef(refreshConnection);
  useEffect(() => { refreshConnectionRef.current = refreshConnection; }, [refreshConnection]);
  useEffect(()=>{void refreshConnectionRef.current();},[]);
  async function startServerLogin(){
    setError('');try{const result=await serverPrint<{image:string;expiresIn:number}>('login','POST');setQr(result.image);setQrUntil(Date.now()+result.expiresIn*1000);}catch(cause){setError(cause instanceof Error?cause.message:'二维码读取失败');}
  }
  useEffect(()=>{
    if(mode!=='SERVER')return;let cancelled=false;
    const poll=async()=>{try{const jobs=await serverPrint<PrintSyncJob[]>(`jobs${scopeId?`?courseId=${encodeURIComponent(scopeId)}`:''}`);if(cancelled)return;setServerJobs(jobs);const done=jobs.filter(job=>job.status==='SUCCEEDED').map(job=>job.id).join(',');if(done!==lastServerDone.current){lastServerDone.current=done;void refreshConnectionRef.current();}await client.invalidateQueries({queryKey:['print-documents']});}catch{/* Keep the last durable queue visible while offline. */}};
    void poll();const timer=window.setInterval(()=>void poll(),5000);return()=>{cancelled=true;window.clearInterval(timer);};
  },[mode,scopeId,client]);
  useEffect(()=>{if(!qr||mode!=='SERVER')return;const timer=window.setInterval(()=>{if(Date.now()>qrUntil){setQr('');setMessage('二维码已过期，请重新获取');return;}void refreshConnectionRef.current();},5000);return()=>window.clearInterval(timer);},[qr,qrUntil,mode]);
  useEffect(()=>{if(connection.loggedIn)setQr('');},[connection.loggedIn]);
  async function jobAction(id:string,action:'retry'|'cancel'){
    try{await serverPrint(`jobs/${id}${action==='retry'?'/retry':''}`,action==='retry'?'POST':'DELETE');setServerJobs(await serverPrint<PrintSyncJob[]>(`jobs${scopeId?`?courseId=${encodeURIComponent(scopeId)}`:''}`));}catch(cause){setError(cause instanceof Error?cause.message:'操作失败');}
  }
  async function deleteRemote(keys:string[]){
    if(deletingRemote||!keys.length)return;
    if(!window.confirm(`确认删除文印网站中的 ${keys.length} 份文件？此操作删除图书馆网站上的文件，知途原PDF和打印记录保留。`))return;
    setDeletingRemote(true);setRemoteError('');
    try{const state=mode==='SERVER'?await serverPrint<PrintConnection>('files','DELETE',{keys}):await printBridge('delete',{keys});setConnection(state);setRemoteSelected([]);}
    catch(cause){setRemoteError(cause instanceof Error?cause.message:'文印删除失败，请同步列表检查');}
    finally{setDeletingRemote(false);}
  }
  async function emptyTrash(){
    const trash=allDocs.filter(d=>d.status.startsWith('TRASH_'));if(pending.current||!trash.length)return;
    if(!window.confirm(`永久清空${hasCourse?'当前课程':'当前范围'}回收站中的 ${trash.length} 份文件？PDF及对应打印记录将永久删除，无法恢复。文印网站文件不受影响。`))return;
    pending.current=true;setBusy(true);setError('');setMessage('');
    try{await apiRequest({url:'/api/v1/printing/documents/trash',method:'DELETE',params:scopeId?{courseId:scopeId}:{},data:{documents:trash.map(d=>({id:d.id,revision:d.revision}))},silent:true});setSelected([]);setMessage(`已清空回收站，永久删除 ${trash.length} 份文件。`);}
    catch(cause){setError(cause instanceof Error?cause.message:'清空失败，请刷新列表后重试');}
    finally{await client.invalidateQueries({queryKey:['print-documents']});pending.current=false;setBusy(false);}
  }
  async function mark(d:PrintDocument,action:string,key:string) {return (await apiRequest<{data:PrintDocument}>({url:`/api/v1/printing/documents/${d.id}/actions`,method:'POST',data:{action,key,revision:d.revision},silent:true})).data;}
  async function performSingle(d:PrintDocument,action:string){await perform(action,[d]);}
  async function perform(action:string,selection=chosen) {
    const chosen=selection;
    if(pending.current||!chosen.length)return;pending.current=true;setBusy(true);setError('');setMessage('');
    const ids=chosen.map(d=>d.id).join(',');if(attempts.current?.action!==action||action!=='UPLOADED'&&attempts.current.ids!==ids)attempts.current={action,ids,keys:{}};
    attempts.current!.ids=ids;for(const d of chosen)attempts.current!.keys[d.id]??=createUuid();
    try{
      if(action==='UPLOADED'&&mode==='SERVER'){
        const key=attempts.current!.keys[chosen[0].id];
        const accepted=await serverPrint<PrintSyncJob[]>('jobs','POST',{key,documents:chosen.map(d=>d.id)});
        setServerJobs(accepted.filter(job=>!scopeId||job.course_id===scopeId));
        setMessage(`已提交 ${chosen.length} 份文件，服务器会在后台继续同步，可关闭页面。`);setSelected([]);attempts.current=undefined;return;
      }
      if(action==='UPLOADED'){
        if(!mode)throw Error('尚未读取同步模式，请检查连接后重试');
        const state=await printBridge('status');setConnection(state);
        if(!state.connected||!state.loggedIn)throw Error(state.reason??'请先打开文印网站并扫码登录');
      }
      if(action==='UPLOADED'){
        const results:{id:string;filename:string;ok:boolean;reason:string}[]=[];setSyncResults([]);
        for(const [index,d] of chosen.entries()){
          setMessage(`正在同步 ${index+1}/${chosen.length}：${d.filename}`);
          let confirmed=false;
          try{
            const blob=await printBlob(d.id);const result=await printBridge('upload',{name:d.filename,base64:await blobBase64(blob),pages:d.pages});
            if(!result.connected)throw Error(result.reason??'文印网站尚未确认上传结果');
            confirmed=true;setConnection(result);await mark(d,action,attempts.current!.keys[d.id]);
            results.push({id:d.id,filename:d.filename,ok:true,reason:'文印网站已确认，记录已保存'});
          }catch(cause){const reason=cause instanceof Error?cause.message:'同步失败';results.push({id:d.id,filename:d.filename,ok:false,reason:confirmed?`文印已收到文件，但记录保存失败：${reason}；重试会先检查已上传文件`:reason});}
          setSyncResults([...results]);
        }
        const failed=results.filter(r=>!r.ok);setSelected(failed.map(r=>r.id));
        setMessage(`同步完成：成功 ${results.length-failed.length} 份，失败 ${failed.length} 份。${failed.length?'已保留失败文件的勾选，可直接重试。':'文件已在文印网站确认，尚未标记实际打印。'}`);
        if(!failed.length)attempts.current=undefined;
        return;
      }
      for(const [index,d] of chosen.entries()){ 
        setMessage(`正在处理 ${index+1}/${chosen.length}：${d.filename}`);
        await mark(d,action,attempts.current.keys[d.id]);
      }
      attempts.current=undefined;setMessage(action==='TRASH'?'已移入回收站，可随时恢复，打印记录保留。':action==='RESTORE'?'已恢复到打印列表。':action==='PRINTED'?`已标记 ${chosen.length} 份文件打印完成，打印次数已记录。`:action==='REPRINT'?'已加入待打印列表，之前的打印次数和历史记录保留。':`已同步 ${chosen.length} 份文件到文印网站；尚未标记为实际打印。`);
      setSelected([]);if(action==='UPLOADED')await refreshConnection();
    }catch(cause){setError(cause instanceof Error?cause.message:'处理失败，请重试');}
    finally{await client.invalidateQueries({queryKey:['print-documents']});pending.current=false;setBusy(false);}
  }
  async function show(d:PrintDocument) {
    // Open during the click so an authenticated, asynchronous download is not blocked as a popup.
    const tab = window.open('about:blank', '_blank');
    if (!tab) { setError('浏览器阻止了预览窗口，请允许本站打开新标签页后重试。'); return; }
    tab.opener = null;
    tab.document.title = d.filename;
    tab.document.body.textContent = '正在读取 PDF，请稍候…';
    try {
      setError('');
      const blob = await printBlob(d.id);
      if (tab.closed) return;
      const url = URL.createObjectURL(blob);
      try { tab.location.replace(url); }
      catch (cause) { URL.revokeObjectURL(url); throw cause; }
      // Give the browser's PDF viewer time to load before releasing the private file URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (cause) {
      tab.close();
      setError(cause instanceof Error ? cause.message : '文件读取失败');
    }
  }
  async function showHistory(d:PrintDocument){try{setHistory({title:d.filename,items:(await apiRequest<{data:{id:string;action:string;created_at:string}[]}>({url:`/api/v1/printing/documents/${d.id}/history`,silent:true})).data});}catch(cause){setError(cause instanceof Error?cause.message:'历史读取失败');}}
  return { mode, qr, serverJobs, pageSize, setPageSize, syncResults, filter, setFilter, selected, setSelected, busy, message, error, connection, checking, remoteSelected, setRemoteSelected, deletingRemote, remoteError, checkedAt, history, setHistory, query, allDocs, docs, visible, chosen, pageCount, currentPage, pageDocs, chosenPages, setPage, refreshConnection, startServerLogin, jobAction, deleteRemote, emptyTrash, performSingle, perform, show, showHistory };
}
