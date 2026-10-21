import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssessmentPanel } from './AssessmentPanel';
import type { BankPaper } from '../../api/bank';
const papers = ['A','B','C'].map(variant=>({id:variant,title:`第一章 · ${variant}卷`,kind:'CHAPTER',variant,chapter_id:'chapter',limit_minutes:120})) as BankPaper[];
describe('AssessmentPanel',()=>{
 it('每套卷保留独立开始操作，按钮名称能够区分试卷',()=>{
  const start=vi.fn();render(<AssessmentPanel title="第一章" kind="CHAPTER" description="规则" papers={papers} blockedReason="" busy={false} onStart={start}/>);
  fireEvent.click(screen.getByRole('button',{name:'开始 第一章 · B卷 · 120 分钟'}));expect(start).toHaveBeenCalledWith('B');
 });
 it('未开放原因集中展示，全部开始按钮禁用',()=>{
  render(<AssessmentPanel title="模拟卷" kind="MOCK" description="规则" papers={papers} blockedReason="尚有6章未通过" busy={false} onStart={vi.fn()}/>);
  expect(screen.getAllByText('尚有6章未通过')).toHaveLength(1);screen.getAllByRole('button').forEach(b=>expect(b).toBeDisabled());
 });
 it('区分已评分和待核对状态，未完成三套时不显示平均通过成绩',()=>{
  render(<AssessmentPanel title="第一章" kind="CHAPTER" description="规则" papers={papers} blockedReason="" busy={false} onStart={vi.fn()} progress={{required:3,submitted:2,graded:1,meanRate:null,rateLabel:'平均得分率',meetsThreshold:false,papers:[{variant:'A',status:'GRADED',rate:95,rateLabel:'得分率'},{variant:'B',status:'NEEDS_REVIEW'},{variant:'C',status:'NOT_SUBMITTED'}]}}/>);
  expect(screen.getByText('95%')).toBeInTheDocument();expect(screen.getByText('待核对')).toBeInTheDocument();expect(screen.getByText('待评分')).toBeInTheDocument();expect(screen.queryByText('本章已通过')).not.toBeInTheDocument();
 });
});
