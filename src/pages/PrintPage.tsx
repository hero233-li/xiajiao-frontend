import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, RefreshCw, Check, RotateCcw, FileText, Trash2, Undo2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCourse } from '../features/course/CourseContext';
import { apiRequest } from '../api/http';
import { Button } from '../components/Button';
import { createUuid } from '../utils/uuid';
import { PRINT_SITE, printSyncConfig, serverPrint, type PrintSyncMode, type PrintSyncJob, blobBase64, printBlob, printBridge, type PrintDocument, type PrintConnection } from '../features/printing/printApi';
import '../features/printing/printing.css';

const states: Record<string, string> = { PENDING: '待打印', UPLOADED: '已同步文印', PRINTED: '已打印' };
const events: Record<string, string> = { PRINTED: '标记已打印', UPLOADED: '同步到文印网站', REPRINT: '再次打印', TRASH: '移入回收站', RESTORE: '恢复文件' };
const pageCost=(pages:number)=>(pages*15/100).toFixed(2);
function date(value: string | null) { if (!value) return '—'; const iso = value.replace(' ', 'T');return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : iso+'Z').toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}); }
export function Component() {
  const course = useCourse();const [params]=useSearchParams();const scopeId=course?.id??params.get('courseId')??undefined;const client = useQueryClient();
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
  async function refreshConnection() {
    if(connectionPending.current||deletingRemote)return;connectionPending.current=true;setChecking(true);
    try{const currentMode=mode??(await printSyncConfig()).mode;setMode(currentMode);const result=currentMode==='SERVER'?await serverPrint<PrintConnection>('status'):await printBridge('status');setConnection(result);setRemoteSelected([]);setCheckedAt(new Date().toLocaleTimeString('zh-CN'));}
    catch(cause){setConnection({connected:false,reason:cause instanceof Error?cause.message:'连接失败'});}
    finally{connectionPending.current=false;setChecking(false);}
  }
  useEffect(()=>{void refreshConnection();},[]);
  async function startServerLogin(){
    setError('');try{const result=await serverPrint<{image:string;expiresIn:number}>('login','POST');setQr(result.image);setQrUntil(Date.now()+result.expiresIn*1000);}catch(cause){setError(cause instanceof Error?cause.message:'二维码读取失败');}
  }
  useEffect(()=>{
    if(mode!=='SERVER')return;let cancelled=false;
    const poll=async()=>{try{const jobs=await serverPrint<PrintSyncJob[]>(`jobs${scopeId?`?courseId=${encodeURIComponent(scopeId)}`:''}`);if(cancelled)return;setServerJobs(jobs);const done=jobs.filter(job=>job.status==='SUCCEEDED').map(job=>job.id).join(',');if(done!==lastServerDone.current){lastServerDone.current=done;void refreshConnection();}await client.invalidateQueries({queryKey:['print-documents']});}catch{/* Keep the last durable queue visible while offline. */}};
    void poll();const timer=window.setInterval(()=>void poll(),5000);return()=>{cancelled=true;window.clearInterval(timer);};
  },[mode,scopeId,client]);
  useEffect(()=>{if(!qr||mode!=='SERVER')return;const timer=window.setInterval(()=>{if(Date.now()>qrUntil){setQr('');setMessage('二维码已过期，请重新获取');return;}void refreshConnection();},5000);return()=>window.clearInterval(timer);},[qr,qrUntil,mode]);
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
    if(!window.confirm(`永久清空${course?'当前课程':'当前范围'}回收站中的 ${trash.length} 份文件？PDF及对应打印记录将永久删除，无法恢复。文印网站文件不受影响。`))return;
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
  return <section className="print-workbench">
    <header className="page-heading"><div><p className="eyebrow">自学空间 · {course?.name??(scopeId?'当前课程':'全部课程')}</p><h1>打印功能区</h1><p className="secondary">先整理文件，再同步文印。实际打印完成后，标记并记录次数。</p></div><Printer size={28}/></header>
    <div className="print-summary-grid">{[['文件',docs.length],['待打印',docs.filter(d=>d.status!=='PRINTED').length],['累计打印次数',docs.reduce((n,d)=>n+d.printed_count,0)],['全部文件预估金额',`¥${pageCost(docs.reduce((n,d)=>n+d.pages,0))}`]].map(([label,value])=><article className="print-panel" key={label}><h2>{label}</h2><strong className="analysis-metric">{value}</strong></article>)}</div>
    <section className="print-panel print-connection"><div className="print-toolbar"><h2>上海图书馆文印连接 · {mode==='SERVER'?'服务器后台同步':mode==='BROWSER'?'浏览器同步':'正在读取模式'}</h2><span className="print-badge">{connection.connected?(connection.loggedIn?'已连接 · 已登录':'已连接 · 待扫码'):'未连接'}</span></div>
      <p>{connection.reason??'登录状态保留在当前浏览器中，只有点击同步才会上传所选文件。'}{checkedAt&&` · 最近检查 ${checkedAt}`}</p>
      <div className="print-toolbar">{mode==='SERVER'&&<Button variant="secondary" onClick={()=>void startServerLogin()}>服务器扫码登录</Button>}<a className="button button-secondary" href={PRINT_SITE} target="_blank" rel="noopener noreferrer">打开文印网站 / 扫码登录</a><Button variant="secondary" disabled={checking} onClick={()=>void refreshConnection()}><RefreshCw size={16}/>{checking?'正在读取文印列表…':'检查连接与文印列表'}</Button></div>
      {qr&&<div className="print-server-qr"><img src={qr} alt="服务器文印登录二维码"/><p>请用微信扫码并确认登录，登录成功后二维码会自动关闭。</p></div>}
      {mode==='SERVER'&&<p className="print-cost-note">文件提交成功后，关闭浏览器或手机断网不影响服务器任务。登录失效时任务保留，重新扫码后继续。</p>}
      {mode==='BROWSER'&&!connection.connected&&<details className="print-help"><summary>连接打印助手</summary><p>在电脑 Chrome 中安装打印助手，保持知途和文印网站两个页面打开。文印登录信息仅留在你的浏览器。</p><a href="/zhitu-print-helper.zip" download>下载打印助手</a><p>解压后在 Chrome 扩展程序中加载解压后的文件夹，再刷新这两个页面。手机端可整理文件、标记打印次数；自动上传请使用电脑 Chrome。</p></details>}

    </section>
    {mode==='SERVER'&&<section className="print-panel"><div className="print-toolbar"><h2>服务器同步任务</h2><span className="secondary">刷新页面后记录保留 · 先核对文印列表再重试</span></div>{!serverJobs.length?<p className="secondary">暂无任务，选中文件后点击“同步文件列表到文印网站”。</p>:<div className="print-table-scroll"><table className="print-table"><thead><tr><th>文件</th><th>状态</th><th>处理次数</th><th>说明</th><th>操作</th></tr></thead><tbody>{serverJobs.slice(0,100).map(job=><tr key={job.id}><td>{job.filename??'已删除文件'}</td><td>{{QUEUED:'排队中',RUNNING:'同步中',WAIT_LOGIN:'等待扫码',SUCCEEDED:'已同步',FAILED:'失败',CANCELLED:'已取消'}[job.status]??job.status}</td><td>{job.attempts}</td><td>{job.reason}</td><td>{['FAILED','WAIT_LOGIN'].includes(job.status)&&<Button variant="ghost" onClick={()=>void jobAction(job.id,'retry')}>重试</Button>}{['QUEUED','WAIT_LOGIN','FAILED'].includes(job.status)&&<Button variant="ghost" onClick={()=>void jobAction(job.id,'cancel')}>取消</Button>}</td></tr>)}</tbody></table></div>}</section>}
    <div className="print-columns">
    <section className="print-panel"><div className="print-toolbar"><h2>我的打印文件</h2><Button variant="ghost" onClick={()=>void query.refetch()}>刷新</Button></div>
      <div className="print-status-tabs" role="tablist" aria-label="打印文件状态">{[['PENDING','待打印'],['PRINTED','已打印'],['TRASH','回收站'],['ALL','全部']].map(([value,label])=><button key={value} role="tab" aria-selected={filter===value} onClick={()=>setFilter(value)}>{label}<span>{allDocs.filter(d=>value==='TRASH'?d.status.startsWith('TRASH_'):!d.status.startsWith('TRASH_')&&(value==='ALL'||value==='PENDING'&&d.status!=='PRINTED'||d.status===value)).length}</span></button>)}</div>
      <div className="print-toolbar"><label><input type="checkbox" aria-label="全选打印文件" checked={!!pageDocs.length&&pageDocs.every(d=>selected.includes(d.id))} onChange={e=>setSelected(old=>e.target.checked?[...new Set([...old,...pageDocs.map(d=>d.id)])]:old.filter(id=>!pageDocs.some(d=>d.id===id)))} disabled={busy}/>全选本页</label><span>已选 {chosen.length}</span><span className="print-selection-cost">{chosenPages} 面 · 预估 ¥{pageCost(chosenPages)}</span>
        <Button disabled={!mode||busy||!chosen.length||filter==='TRASH'} loading={busy} onClick={()=>void perform('UPLOADED')}>同步文件列表到文印网站</Button>
        <Button variant="secondary" disabled={busy||!chosen.length||filter==='TRASH'} onClick={()=>void perform('PRINTED')}><Check size={16}/>标记已打印</Button>
        <Button variant="secondary" disabled={busy||!chosen.length||filter==='TRASH'||chosen.some(d=>!d.printed_count)} onClick={()=>void perform('REPRINT')}><RotateCcw size={16}/>再次打印</Button>
        {filter==='TRASH'&&<Button variant="ghost" disabled={busy||!visible.length} onClick={()=>void emptyTrash()}><Trash2 size={16}/>清空回收站</Button>}
        {filter==='TRASH'?<Button variant="secondary" disabled={busy||!chosen.length} onClick={()=>void perform('RESTORE')}><Undo2 size={16}/>恢复所选</Button>:<Button variant="ghost" disabled={busy||!chosen.length} onClick={()=>void perform('TRASH')}><Trash2 size={16}/>删除所选</Button>}
      </div>
      {query.isPending?<p role="status">正在读取打印文件…</p>:query.isError?<p role="alert">{query.error.message}</p>:!visible.length?<div className="analysis-empty"><Printer size={40}/><h3>{filter==='TRASH'?'回收站为空':'暂无打印文件'}</h3><p>{filter==='TRASH'?'删除的文件将在这里保留，可恢复到原列表。':'历史打印文件会保留在这里，可继续预览和管理。'}</p></div>:<div className="print-table-scroll" role="region" aria-label="打印文件表格，可横向滚动" tabIndex={0}><table className="print-table" aria-label="我的打印文件表格"><colgroup><col style={{width:40}}/><col style={{width:200}}/><col style={{width:140}}/><col style={{width:65}}/><col style={{width:215}}/><col style={{width:80}}/><col style={{width:95}}/><col style={{width:70}}/><col style={{width:185}}/></colgroup><thead><tr><th scope="col">选择</th><th scope="col">文件名称</th><th scope="col">章节</th><th scope="col">难度</th><th scope="col">打印参数</th><th scope="col">预估金额</th><th scope="col">状态</th><th scope="col">打印次数</th><th scope="col">操作</th></tr></thead><tbody>{pageDocs.map(d=><tr key={d.id} className={selected.includes(d.id)?'is-selected':''}><td><input type="checkbox" aria-label={`选择 ${d.filename}`} checked={selected.includes(d.id)} disabled={busy} onChange={e=>setSelected(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id))}/></td><td><span className="print-table-filename" title={d.filename}><FileText size={16}/><span>{d.filename.replace(/-[0-9a-f]{12}(?=\.pdf$)/,'')}</span></span></td><td title={d.chapter_title}><span className="print-table-truncate">{d.chapter_title}</span></td><td>{d.difficulty}</td><td title={`${(d.byte_size/1024/1024).toFixed(2)} MB`}>{d.pages} 页 · A4 · 黑白 · {d.pages===1?'单面':'双面长边'} · 全部 · 1份</td><td className="print-table-money">¥{pageCost(d.pages)}</td><td><span className="print-badge">{d.status.startsWith('TRASH_')?'回收站':states[d.status]??d.status}</span></td><td title={`最近打印 ${date(d.last_printed_at)}`}>{d.printed_count} 次</td><td><div className="print-table-actions"><Button variant="ghost" onClick={()=>void show(d)}>预览 PDF</Button><Button variant="ghost" onClick={()=>void showHistory(d)}>打印记录</Button><Button variant="ghost" disabled={busy} onClick={()=>{setSelected([d.id]);void performSingle(d,d.status.startsWith('TRASH_')?'RESTORE':'TRASH');}}>{d.status.startsWith('TRASH_')?'恢复':'删除'}</Button></div></td></tr>)}</tbody></table></div>}

      <div className="print-pagination" aria-label="打印文件分页"><span>共 {visible.length} 份 · 第 {currentPage} / {pageCount} 页</span><label>每页<select aria-label="每页文件数" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n} value={n}>{n} 份</option>)}</select></label><Button variant="secondary" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一页</Button><Button variant="secondary" disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)}>下一页</Button></div>
      <p className="print-cost-note">黑白 ¥0.15 / 面，按每份 1 份预估；双面文件按实际页数计费。实际收费以文印系统为准。</p>
      {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
      {!!syncResults.length&&<details className="print-sync-results" open={syncResults.some(r=>!r.ok)}><summary>本次同步记录 · 成功 {syncResults.filter(r=>r.ok).length} / {syncResults.length}</summary><ul>{syncResults.map(r=><li key={r.id}><strong>{r.ok?'成功':'失败'}</strong> {r.filename}<span> — {r.reason}</span></li>)}</ul></details>}
    </section>
    <aside className="print-panel print-remote"><div className="print-toolbar"><h2>文印文件管理</h2><span className="print-badge">{connection.files?.length??'—'} 份</span></div><p className="secondary">文印账号共享列表，不随课程切换</p><Button variant="secondary" disabled={checking} onClick={()=>void refreshConnection()}><RefreshCw size={16}/>{checking?'正在读取…':'同步文印列表'}</Button>
      {connection.files?.length?<><div className="print-remote-actions"><label><input type="checkbox" aria-label="全选文印文件" disabled={deletingRemote} checked={!!remoteSelected.length&&connection.files.every(f=>!!f.key&&remoteSelected.includes(f.key))} onChange={e=>setRemoteSelected(e.target.checked?connection.files!.flatMap(f=>f.key?[f.key]:[]):[])}/>全选</label><Button variant="ghost" disabled={deletingRemote||!remoteSelected.length} onClick={()=>void deleteRemote(remoteSelected)}>删除所选文印文件</Button></div><div className="print-table-scroll" role="region" aria-label="文印文件表格，可横向滚动" tabIndex={0}><table className="print-table print-remote-table" aria-label="文印网站文件表格"><thead><tr><th scope="col">选择</th><th scope="col">文件名称</th><th scope="col">打印参数</th><th scope="col">操作</th></tr></thead><tbody>{connection.files.map((f,i)=><tr key={f.name+i}><td><input type="checkbox" aria-label={`选择文印文件 ${f.name}`} disabled={deletingRemote||!f.key} checked={!!f.key&&remoteSelected.includes(f.key)} onChange={e=>setRemoteSelected(old=>e.target.checked?[...old,f.key!]:old.filter(k=>k!==f.key))}/></td><td title={f.name}><span className="print-table-truncate">{f.name}</span></td><td>{f.parameters}</td><td><Button variant="ghost" disabled={deletingRemote||!f.key} onClick={()=>void deleteRemote([f.key!])}>删除文印文件</Button></td></tr>)}</tbody></table></div></>:<p className="print-remote-empty">{checking?'正在读取文件管理列表，请稍候…':!connection.connected?'点击刷新，连接打印助手并读取文件管理列表。':!connection.loggedIn?'请先扫码登录文印网站。':connection.filesReady?'文印网站当前没有文件。':'文印已登录，文件列表尚未读取成功。请刷新打印助手后重试。'}</p>}
      {deletingRemote&&<p role="status">正在删除所选文印文件…</p>}{remoteError&&<p role="alert">{remoteError}</p>}
      {connection.files?.some(f=>!f.key)&&<p className="print-cost-note">请刷新至打印助手 1.0.4 后使用文印删除。</p>}
      <a className="print-remote-link" href="https://selfcopying.cnbksy.com/client/new/cprintPc/printDoc.html" target="_blank" rel="noopener noreferrer">打开文印网站文件管理 ↗</a>
    </aside></div>
    {history&&<section className="print-panel"><div className="print-toolbar"><h2>打印记录</h2><Button variant="ghost" onClick={()=>setHistory(null)}>关闭</Button></div><p>{history.title}</p>{history.items.length?<ul className="print-history">{history.items.map(e=><li key={e.id}>{events[e.action]??e.action} · {date(e.created_at)}</li>)}</ul>:<p className="secondary">暂无打印记录。</p>}</section>}
  </section>;
}
