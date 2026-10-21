import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Component } from './PrintPage';
const pdf=vi.hoisted(()=>vi.fn());
const syncConfig=vi.hoisted(()=>vi.fn());const server=vi.hoisted(()=>vi.fn());
const request=vi.hoisted(()=>vi.fn());const bridge=vi.hoisted(()=>vi.fn());
vi.mock('react-router-dom',()=>({useSearchParams:()=>[new URLSearchParams()]}));
vi.mock('../features/course/CourseContext',()=>({useCourse:()=>({id:'course',name:'高等数学'})}));
vi.mock('../api/http',()=>({apiRequest:request}));
vi.mock('../features/printing/printApi',()=>({PRINT_SITE:'https://selfcopying.cnbksy.com/client/new/cprintPc/cprint.html',printSyncConfig:syncConfig,serverPrint:server,printBridge:bridge,printBlob:pdf,blobBase64:vi.fn()}));
let docs:any[];
const mount=()=>{const result=render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Component/></QueryClientProvider>);fireEvent.click(screen.getByRole('tab',{name:/^全部/}));return result;};
beforeEach(()=>{
 syncConfig.mockReset();syncConfig.mockResolvedValue({mode:'BROWSER',serverAvailable:true});server.mockReset();
 docs=[{id:'one',filename:'考点一.pdf',course_id:'course',chapter_title:'第一章',difficulty:'simple',pages:1,byte_size:1000,status:'PENDING',printed_count:0,revision:0,last_printed_at:null},{id:'two',filename:'考点二.pdf',course_id:'course',chapter_title:'第一章',difficulty:'simple',pages:2,byte_size:2000,status:'PRINTED',printed_count:2,revision:3,last_printed_at:'2026-10-17T02:00:00.000+00:00'}];
 request.mockReset();bridge.mockReset();pdf.mockReset();bridge.mockResolvedValue({connected:false,reason:'尚未连接打印助手'});request.mockImplementation(async(config:any)=>{if(config.method==='DELETE'){const ids=config.data.documents.map((d:any)=>d.id);docs=docs.filter(d=>!ids.includes(d.id));return{data:ids.length};}if(config.method==='POST'){const id=config.url.split('/').at(-2);docs=docs.map(d=>d.id!==id?d:{...d,status:config.data.action==='TRASH'?'TRASH_'+d.status:config.data.action==='RESTORE'?d.status.substring(6):config.data.action==='REPRINT'?'PENDING':config.data.action==='UPLOADED'?'UPLOADED':'PRINTED',printed_count:d.printed_count+(config.data.action==='PRINTED'?1:0),revision:d.revision+1});return{data:docs.find(d=>d.id===id)};}return{data:docs.map(d=>({...d}))};});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('selects files individually or all and keeps print counts when requesting reprint',async()=>{
 mount();await screen.findByText('考点一.pdf');
 expect(screen.getByText(/1 页 · A4 · 黑白 · 单面/)).toBeVisible();expect(screen.getByText(/2 页 · A4 · 黑白 · 双面长边/)).toBeVisible();
 fireEvent.click(screen.getByLabelText('全选打印文件'));expect(screen.getByText('已选 2')).toBeVisible();expect(screen.getByRole('button',{name:'再次打印'})).toBeDisabled();
 fireEvent.click(screen.getByLabelText('选择 考点一.pdf'));fireEvent.click(screen.getByRole('button',{name:'再次打印'}));
 await waitFor(()=>expect(request.mock.calls.some(([c])=>c.method==='POST'&&c.data.action==='REPRINT')).toBe(true));
 await screen.findByText('已加入待打印列表，之前的打印次数和历史记录保留。');
 expect(docs[1].printed_count).toBe(2);expect(docs[1].status).toBe('PENDING');
});
it('reads actual bridge status and remote file list without pretending to be connected',async()=>{
 bridge.mockResolvedValue({connected:true,loggedIn:true,files:[{name:'图书馆已有.pdf',parameters:'A4 黑白 单面 1份'}]});mount();
 expect(screen.getByText('未连接')).toBeVisible();
 await screen.findByText('已连接 · 已登录');expect(screen.getByText('图书馆已有.pdf')).toBeVisible();
});

it('opens a new tab immediately before the private PDF finishes loading, without an inline preview',async()=>{
 let resolve!: (blob:Blob)=>void;
 pdf.mockImplementation(()=>new Promise<Blob>(done=>{resolve=done;}));
 const tab={opener:window,document:{title:'',body:{textContent:''}},closed:false,location:{replace:vi.fn()},close:vi.fn()};
 const open=vi.spyOn(window,'open').mockReturnValue(tab as unknown as Window);
 vi.stubGlobal('URL',Object.assign(class extends URL {},{createObjectURL:vi.fn(()=> 'blob:private-pdf'),revokeObjectURL:vi.fn()}));
 mount();await screen.findByText('考点一.pdf');fireEvent.click(screen.getAllByRole('button',{name:'预览 PDF'})[0]);
 expect(open).toHaveBeenCalledWith('about:blank','_blank');expect(tab.opener).toBeNull();expect(tab.location.replace).not.toHaveBeenCalled();
 resolve(new Blob(['%PDF'],{type:'application/pdf'}));
 await waitFor(()=>expect(tab.location.replace).toHaveBeenCalledWith('blob:private-pdf'));
 expect(screen.queryByTitle('打印PDF预览')).not.toBeInTheDocument();
});
it('explains popup blocking without downloading a private PDF',async()=>{
 pdf.mockReset();vi.spyOn(window,'open').mockReturnValue(null);mount();await screen.findByText('考点一.pdf');fireEvent.click(screen.getAllByRole('button',{name:'预览 PDF'})[0]);
 expect(await screen.findByRole('alert')).toHaveTextContent('浏览器阻止了预览窗口');expect(pdf).not.toHaveBeenCalled();
});
it('closes the loading tab and reports a private PDF download failure',async()=>{
 const tab={opener:window,document:{title:'',body:{textContent:''}},closed:false,close:vi.fn()};vi.spyOn(window,'open').mockReturnValue(tab as unknown as Window);pdf.mockRejectedValue(new Error('文件读取失败'));
 mount();await screen.findByText('考点一.pdf');fireEvent.click(screen.getAllByRole('button',{name:'预览 PDF'})[0]);
 expect(await screen.findByRole('alert')).toHaveTextContent('文件读取失败');expect(tab.close).toHaveBeenCalled();
});

it('moves one file to the recycle bin and restores it without changing print counts',async()=>{
 mount();await screen.findByText('考点一.pdf');fireEvent.click(screen.getAllByRole('button',{name:/^删除$/})[1]);
 await screen.findByText('已移入回收站，可随时恢复，打印记录保留。');
 expect(screen.queryByText('考点二.pdf')).not.toBeInTheDocument();expect(docs[1].printed_count).toBe(2);
 fireEvent.click(screen.getByRole('tab',{name:/^回收站/}));await screen.findByText('考点二.pdf');fireEvent.click(screen.getByRole('button',{name:/^恢复$/}));
 await screen.findByText('已恢复到打印列表。');expect(docs[1].status).toBe('PRINTED');expect(docs[1].printed_count).toBe(2);
});
it('does not describe an unread remote queue as empty',async()=>{
 bridge.mockResolvedValue({connected:true,loggedIn:true,files:[],filesReady:false});mount();
 await screen.findByText(/文印已登录，文件列表尚未读取成功/);expect(screen.queryByText('文印网站当前没有文件。')).not.toBeInTheDocument();
});

it('paginates files, preserves cross-page selection and prices duplex by printed side',async()=>{
 docs=Array.from({length:13},(_,i)=>({...docs[0],id:'doc'+i,filename:'考点'+(i+1)+'.pdf',pages:i===10?2:1}));mount();await screen.findByText('考点1.pdf');
 expect(screen.queryByText('考点11.pdf')).not.toBeInTheDocument();fireEvent.click(screen.getByLabelText('全选打印文件'));expect(screen.getByText('已选 10')).toBeVisible();expect(screen.getByText('10 面 · 预估 ¥1.50')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'下一页'}));await screen.findByText('考点11.pdf');expect(screen.queryByText('考点1.pdf')).not.toBeInTheDocument();const row=screen.getByText('考点11.pdf').closest('tr')!;expect(within(row).getByText(/2 页 · A4 · 黑白 · 双面长边/)).toBeVisible();expect(within(row).getByText('¥0.30')).toBeVisible();
 fireEvent.click(screen.getByLabelText('选择 考点11.pdf'));expect(screen.getByText('已选 11')).toBeVisible();expect(screen.getByText('12 面 · 预估 ¥1.80')).toBeVisible();
 fireEvent.change(screen.getByLabelText('每页文件数'),{target:{value:'20'}});await screen.findByText('考点1.pdf');expect(screen.getByText('考点13.pdf')).toBeVisible();
});

it('keeps course B out of course A and moves repeat prints back to the pending tab',async()=>{
 docs.push({...docs[0],id:'foreign',course_id:'other-course',filename:'课程B.pdf'});mount();await screen.findByText('考点一.pdf');expect(screen.queryByText('课程B.pdf')).not.toBeInTheDocument();
 expect(request.mock.calls.some(([c])=>c.params?.courseId==='course')).toBe(true);
 fireEvent.click(screen.getByRole('tab',{name:/^待打印/}));expect(screen.queryByText('考点二.pdf')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab',{name:/^已打印/}));await screen.findByText('考点二.pdf');expect(screen.queryByText('考点一.pdf')).not.toBeInTheDocument();
 fireEvent.click(screen.getByLabelText('选择 考点二.pdf'));fireEvent.click(screen.getByRole('button',{name:'再次打印'}));await screen.findByText('已加入待打印列表，之前的打印次数和历史记录保留。');
 fireEvent.click(screen.getByRole('tab',{name:/^待打印/}));await screen.findByText('考点二.pdf');expect(docs[1].printed_count).toBe(2);
});

it('requires confirmation before deleting library files and synchronizes the returned list',async()=>{
 const file={key:'library-key',name:'远程练习.pdf',parameters:'A4 黑白 单面 1份'};
 bridge.mockResolvedValue({connected:true,loggedIn:true,filesReady:true,files:[file]});mount();await screen.findByText('远程练习.pdf');
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'删除文印文件'}));expect(bridge.mock.calls.some(([action])=>action==='delete')).toBe(false);
 confirm.mockReturnValue(true);bridge.mockImplementation(async(action:string)=>({connected:true,loggedIn:true,filesReady:true,files:action==='delete'?[]:[file]}));
 fireEvent.click(screen.getByRole('button',{name:'删除文印文件'}));await waitFor(()=>expect(screen.queryByText('远程练习.pdf')).not.toBeInTheDocument());
 expect(bridge).toHaveBeenCalledWith('delete',{keys:['library-key']});
});

it('empties only the current course trash after explicit permanent-delete confirmation',async()=>{
 docs[0].status='TRASH_PENDING';docs.push({...docs[0],id:'foreign-trash',course_id:'other-course',filename:'其他课程.pdf'});mount();await screen.findByText('考点二.pdf');fireEvent.click(screen.getByRole('tab',{name:/^回收站/}));await screen.findByText('考点一.pdf');
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'清空回收站'}));expect(request.mock.calls.some(([c])=>c.method==='DELETE')).toBe(false);
 confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'清空回收站'}));await screen.findByText('已清空回收站，永久删除 1 份文件。');
 expect(request.mock.calls.find(([c])=>c.method==='DELETE')?.[0]).toMatchObject({params:{courseId:'course'},data:{documents:[{id:'one',revision:0}]}});expect(docs.some(d=>d.id==='foreign-trash')).toBe(true);expect(docs.some(d=>d.id==='two')).toBe(true);
});

it('continues a batch after one upload fails, reports each result and retries only failures',async()=>{
 docs=[docs[0],{...docs[0],id:'two',filename:'考点二.pdf'},{...docs[0],id:'three',filename:'考点三.pdf'}];pdf.mockResolvedValue(new Blob(['%PDF-'],{type:'application/pdf'}));
 let fail=true;bridge.mockImplementation(async(action:string,payload:any)=>{if(action==='upload'&&payload.name==='考点二.pdf'&&fail)throw Error('上传超时');return{connected:true,loggedIn:true,files:[]};});
 mount();await screen.findByText('考点一.pdf');fireEvent.click(screen.getByLabelText('全选打印文件'));fireEvent.click(screen.getByRole('button',{name:'同步文件列表到文印网站'}));
 await screen.findByText('同步完成：成功 2 份，失败 1 份。已保留失败文件的勾选，可直接重试。');
 expect(bridge.mock.calls.filter(([action])=>action==='upload').map(([,p])=>p.name)).toEqual(['考点一.pdf','考点二.pdf','考点三.pdf']);expect(screen.getByText('已选 1')).toBeVisible();expect(screen.getByText(/上传超时/)).toBeVisible();expect(docs.map(d=>d.status)).toEqual(['UPLOADED','PENDING','UPLOADED']);
 fail=false;await waitFor(()=>expect(screen.getByRole('button',{name:'同步文件列表到文印网站'})).not.toBeDisabled());fireEvent.click(screen.getByRole('button',{name:'同步文件列表到文印网站'}));
 await screen.findByText('同步完成：成功 1 份，失败 0 份。文件已在文印网站确认，尚未标记实际打印。');expect(bridge.mock.calls.filter(([action])=>action==='upload').map(([,p])=>p.name)).toEqual(['考点一.pdf','考点二.pdf','考点三.pdf','考点二.pdf']);
});

it('submits durable server jobs without downloading files into the browser',async()=>{
 syncConfig.mockResolvedValue({mode:'SERVER',serverAvailable:true});let queued=false;
 server.mockImplementation(async(path:string,method:string)=>{
  if(path==='status')return {connected:true,loggedIn:true,filesReady:true,files:[],reason:'服务器已登录'};
  if(path==='jobs'&&method==='POST'){queued=true;return [{id:'job',document_id:'one',filename:'考点一.pdf',course_id:'course',status:'QUEUED',attempts:0,reason:''}];}
  if(path.startsWith('jobs'))return queued?[{id:'job',document_id:'one',filename:'考点一.pdf',status:'QUEUED',attempts:0,reason:''}]:[];
 });
 mount();await screen.findByText(/服务器已登录/);await screen.findByText('考点一.pdf');
 fireEvent.click(screen.getByLabelText('选择 考点一.pdf'));fireEvent.click(screen.getByRole('button',{name:'同步文件列表到文印网站'}));
 await screen.findByText(/已提交 1 份文件，服务器会在后台继续同步/);
 expect(server).toHaveBeenCalledWith('jobs','POST',expect.objectContaining({documents:['one'],key:expect.any(String)}));expect(bridge).not.toHaveBeenCalled();expect(pdf).not.toHaveBeenCalled();await screen.findByText('排队中');
});
it('does not silently fall back to browser mode when config cannot be loaded',async()=>{
 syncConfig.mockRejectedValue(new Error('服务器暂不可用'));mount();await screen.findByText(/服务器暂不可用/);await screen.findByText('考点一.pdf');fireEvent.click(screen.getByLabelText('选择 考点一.pdf'));expect(screen.getByRole('button',{name:'同步文件列表到文印网站'})).toBeDisabled();expect(bridge).not.toHaveBeenCalled();
});
