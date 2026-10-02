import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Tabs } from '../components/Tabs';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { MathText } from '../components/MathText';
import { Breadcrumb } from '../components/Breadcrumb';
import { notifications } from '../utils/notifications';
export function Component() {
  const [tab,setTab] = useState('loading'); const [modal,setModal] = useState(false); const [confirm,setConfirm] = useState(false);
  return <><Breadcrumb items={[{ label: '健康检查', to: '/health' },{ label: '公共组件' }]} /><h1>公共组件示例</h1><p>以下数值仅用于组件展示，不代表业务数据。</p><div className="example-grid"><Card><h2>按钮状态</h2><div className="stack"><Button>主操作</Button><Button variant="secondary">次要操作</Button><Button disabled disabledReason="请先完成必要的输入">暂不可操作</Button><Button loading loadingLabel="正在提交，请稍候">提交</Button><Button error="提交失败，请重试">重试提交</Button></div></Card><Card><h2>进度与公式</h2><ProgressBar value={1} label="开始学习" /><ProgressBar value={50} label="学习过半" /><ProgressBar value={100} label="学习完成" /><p><MathText text="行内公式：$x^2 + y^2 = 1$。" /></p>{[String.raw`块级公式：$$\frac{1}{2}$$`, String.raw`极限：$\lim_{t\to 0}\frac{e^{2t}-1}{t}$`, String.raw`积分：\(\int_0^1 x\,dx\)`, String.raw`求和：\[\sum_{n=1}^3 n\]`, String.raw`矩阵：$$\begin{pmatrix}1&2\\3&4\end{pmatrix}$$`, String.raw`原文回退：$\invalidcommand$`].map(text => <div key={text}><MathText text={text} /></div>)}</Card><Card><h2>异步状态</h2><Tabs label="异步状态示例" value={tab} onChange={setTab} items={[{ id: 'loading', label: '加载中', content: <Skeleton block /> },{ id: 'empty', label: '空状态', content: <EmptyState message="暂无可显示的内容。" actionLabel="重新加载" onAction={() => setTab('loading')} /> },{ id: 'error', label: '出错', content: <ErrorState message="请求失败，请重试。" onRetry={() => setTab('loading')} /> }]} /></Card><Card><h2>弹窗与提示</h2><div className="stack"><Button onClick={() => setModal(true)}>打开弹窗</Button><Button variant="secondary" onClick={() => setConfirm(true)}>打开确认弹窗</Button><Button variant="secondary" onClick={() => notifications.error('这是错误提示示例。')}>显示错误提示</Button></div></Card><Card state="disabled" message="演示卡片暂不可用"><p>禁用内容</p></Card><Card state="loading"><p>内容正在准备</p></Card><Card state="error" message="卡片加载失败"><Button onClick={() => notifications.error('重试示例')}>重新加载</Button></Card></div><Modal open={modal} title="公共弹窗" onClose={() => setModal(false)}><p>按 Esc 关闭，关闭后焦点回到打开按钮。</p><label htmlFor="example-input">示例输入<input id="example-input" /></label><Button onClick={() => setModal(false)}>完成</Button></Modal><ConfirmDialog open={confirm} title="确认操作" message="这是组件交互示例，确认后关闭弹窗。" onClose={() => setConfirm(false)} onConfirm={() => undefined} /></>;
}
