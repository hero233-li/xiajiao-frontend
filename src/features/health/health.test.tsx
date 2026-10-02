import { it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { renderRoute, startDemoSession } from '../../test/helpers';
it('健康检查显示Mock成功响应和上海时间', async () => {
  await startDemoSession(); renderRoute('/health'); expect(await screen.findByText('服务连接正常')).toBeInTheDocument(); expect(screen.getByText(/最近检查时间：\d{2}\/\d{2} \d{2}:\d{2}/)).toBeInTheDocument();
});
it('健康检查空响应支持重新检查', async () => {
  await startDemoSession(); server.use(http.get('/api/v1/health',() => HttpResponse.json({code:0,data:null,message:'ok'}))); renderRoute('/health'); expect(await screen.findByText('健康检查接口没有返回数据。')).toBeInTheDocument(); expect(screen.getByRole('button',{name:'重新检查'})).toBeInTheDocument();
});
it('健康检查失败可重试恢复', async () => {
  await startDemoSession(); let attempts=0; server.use(http.get('/api/v1/health',() => ++attempts === 1 ? HttpResponse.json({code:50001,data:null,message:'服务暂不可用'},{status:500}) : HttpResponse.json({code:0,data:{status:'UP'},message:'ok'}))); renderRoute('/health'); await screen.findByRole('heading',{name:'加载遇到问题'}); await userEvent.click(screen.getByRole('button',{name:'重新加载'})); expect(await screen.findByText('服务连接正常')).toBeInTheDocument();
});
