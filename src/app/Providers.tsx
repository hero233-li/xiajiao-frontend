import { useState, type PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './queryClient';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ConfirmationProvider } from '../components/ConfirmationProvider';
import { Toast } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  return <ErrorBoundary><QueryClientProvider client={client}><AuthProvider><ConfirmationProvider>{children}<Toast /></ConfirmationProvider></AuthProvider></QueryClientProvider></ErrorBoundary>;
}
