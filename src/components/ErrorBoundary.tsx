import { Component, type PropsWithChildren, type ReactNode } from 'react';
import { Button } from './Button';
export class ErrorBoundary extends Component<PropsWithChildren<{ fallback?: ReactNode }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback ?? <div className="state" role="alert"><h1>页面暂时无法显示</h1><p>请刷新页面后重试。</p><Button onClick={() => window.location.reload()}>刷新页面</Button></div> : this.props.children; }
}
