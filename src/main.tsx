import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Radix UI Colors：所有颜色只从这里取，不手写十六进制
import '@radix-ui/colors/slate.css';
import '@radix-ui/colors/slate-dark.css';
import '@radix-ui/colors/iris.css';
import '@radix-ui/colors/iris-dark.css';
import '@radix-ui/colors/teal.css';
import '@radix-ui/colors/teal-dark.css';
import '@radix-ui/colors/red.css';
import '@radix-ui/colors/red-dark.css';
import '@radix-ui/colors/amber.css';
import '@radix-ui/colors/amber-dark.css';
import '@radix-ui/colors/orange.css';
import '@radix-ui/colors/orange-dark.css';
import '@radix-ui/colors/blue.css';
import '@radix-ui/colors/blue-dark.css';
import '@radix-ui/colors/green.css';
import '@radix-ui/colors/green-dark.css';

import { App } from './app/App';
import { applyTheme, initialTheme } from './lib/theme';
import './styles/index.css';

// 深色模式在首帧前就挂上，避免闪一下
applyTheme(initialTheme());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
