import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { Tabs } from './Tabs';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';
import { ProgressBar } from './ProgressBar';
import { Toast } from './Toast';
import { MathText } from './MathText';
import { notifications } from '../utils/notifications';

describe('公共组件', () => {
  it('按钮禁用和加载状态均说明原因且不触发操作', async () => {
    let clicks = 0;
    render(<><Button disabled disabledReason="缺少输入" onClick={() => clicks++}>提交</Button><Button loading loadingLabel="正在保存">保存</Button></>);
    expect(screen.getByRole('button',{ name: '提交' })).toHaveAccessibleDescription('缺少输入');
    await userEvent.click(screen.getByRole('button',{ name: '提交' })); expect(clicks).toBe(0);
    expect(screen.getByRole('button',{ name: '保存' })).toBeDisabled(); expect(screen.getByRole('button',{ name: '保存' })).toHaveAccessibleDescription('正在保存');
  });
  it('标签支持左右、首尾键，跳过禁用项并关联面板', async () => {
    function Example() { const [value,setValue] = useState('one'); return <Tabs label="示例标签" value={value} onChange={setValue} items={[{id:'one',label:'第一项',content:'第一项内容'},{id:'blocked',label:'禁用项',disabledReason:'暂不可用',content:'隐藏内容'},{id:'two',label:'第二项',content:'第二项内容'}]} />; }
    render(<Example />); screen.getByRole('tab',{ name: '第一项' }).focus();
    await userEvent.keyboard('{ArrowRight}'); expect(screen.getByRole('tab',{ name: '第二项' })).toHaveFocus(); expect(screen.getByRole('tabpanel')).toHaveTextContent('第二项内容');
    await userEvent.keyboard('{ArrowRight}'); expect(screen.getByRole('tab',{ name: '第一项' })).toHaveFocus();
    await userEvent.keyboard('{End}'); expect(screen.getByRole('tab',{ name: '第二项' })).toHaveFocus();
    await userEvent.keyboard('{Home}'); expect(screen.getByRole('tab',{ name: '第一项' })).toHaveFocus();
  });
  it('弹窗锁住焦点、Esc关闭并恢复到触发按钮', async () => {
    function Example() { const [open,setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>打开</Button><Modal open={open} title="示例弹窗" onClose={() => setOpen(false)}><input aria-label="示例输入" /><Button onClick={() => setOpen(false)}>完成</Button></Modal></>; }
    render(<Example />); await userEvent.click(screen.getByRole('button',{name:'打开'}));
    expect(screen.getByRole('button',{name:'关闭弹窗'})).toHaveFocus();
    await userEvent.tab({shift:true}); expect(screen.getByRole('button',{name:'完成'})).toHaveFocus();
    await userEvent.tab(); expect(screen.getByRole('button',{name:'关闭弹窗'})).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('button',{name:'打开'})).toHaveFocus();
  });
  it('确认失败保持弹窗并允许重试', async () => {
    let attempts=0;
    function Example() { const [open,setOpen]=useState(true); return <ConfirmDialog open={open} title="确认" message="执行示例操作" onClose={() => setOpen(false)} onConfirm={async () => { if (++attempts === 1) throw new Error('操作失败'); }} />; }
    render(<Example />); await userEvent.click(screen.getByRole('button',{name:'确认'})); expect(await screen.findByRole('alert')).toHaveTextContent('操作失败'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'确认'})); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(attempts).toBe(2);
  });
  it('加载、空状态和错误重试都可访问', async () => {
    let action=0; let retry=0;
    render(<><Skeleton label="正在加载内容" /><EmptyState message="暂无内容" actionLabel="添加内容" onAction={() => action++} /><ErrorState message="请求失败" onRetry={() => retry++} /></>);
    expect(screen.getByRole('status')).toHaveAccessibleName('正在加载内容'); expect(screen.getByText('暂无内容')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'添加内容'})); await userEvent.click(screen.getByRole('button',{name:'重新加载'})); expect([action,retry]).toEqual([1,1]);
  });
  it('进度带完整ARIA属性，禁用卡片阻隔内容交互', () => {
    render(<><ProgressBar value={32} label="学习进度" /><Card state="disabled" message="未开放"><Button>不可操作内容</Button></Card></>);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','32'); expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin','0'); expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax','100'); expect(screen.getByText('不可操作内容').closest('[inert]')).not.toBeNull();
  });
  it('统一错误提示可关闭', async () => {
    notifications.error('网络连接失败'); render(<Toast />); expect(screen.getByRole('alert')).toHaveTextContent('网络连接失败'); await userEvent.click(screen.getByRole('button',{name:'关闭提示'})); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('懒加载公式，保留纯文本与转义美元符号', async () => {
    const { container } = render(<MathText text={'公式：$x^2$；价格：\\$10；普通文本。'} />);
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull()); expect(container).toHaveTextContent('价格：$10；普通文本。');
  });
  it('错误公式降级，危险链接和原始HTML不执行', async () => {
    const { container } = render(<MathText text={'$\\notACommand$ $\\href{javascript:alert(1)}{链接}$ <img src=x onerror=alert(1)>'} />);
    expect(await screen.findAllByRole('note')).not.toHaveLength(0); expect(container.querySelector('a[href^="javascript:"]')).toBeNull(); expect(container.querySelector('img')).toBeNull();
  });
});
