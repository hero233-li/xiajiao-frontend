import { createContext, useEffect, useRef, useSyncExternalStore, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, login, logout } from '../../api/generated/auth/auth';
import type { LoginRequest, User } from '../../api/generated/models';
import { sessionStore } from '../../api/session';
export interface AuthState { status: 'checking' | 'anonymous' | 'authenticated'; user: User | null; signIn: (input: LoginRequest) => Promise<void>; signOut: () => Promise<void>; }
export const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  const client = useQueryClient(); const sessionEpoch = session?.epoch; const previousEpoch = useRef(sessionEpoch);
  const identity = useQuery({ queryKey: ['auth','identity',session?.epoch], queryFn: ({ signal }) => getCurrentUser({ signal, silent: true }), enabled: !!session && !session.verified });
  useEffect(() => { if (session && !session.verified && identity.data) sessionStore.verify(identity.data.data,session.epoch); if (session && identity.isError) sessionStore.clear(); }, [session,identity.data,identity.isError]);
  useEffect(() => { if (sessionEpoch === undefined && previousEpoch.current !== undefined) { void client.cancelQueries(); client.clear(); } previousEpoch.current = sessionEpoch; }, [sessionEpoch,client]);
  const signIn = useMutation({ mutationFn: (input: LoginRequest) => login(input,{ skipAuth: true, skipRefresh: true, silent: true }), onSuccess: async response => { await client.cancelQueries(); client.clear(); sessionStore.start(response.data); } });
  const signOut = useMutation({ mutationFn: () => logout({ skipRefresh: true }), onSettled: async () => { sessionStore.clear(); await client.cancelQueries(); client.clear(); } });
  return <AuthContext.Provider value={{ status: !session ? 'anonymous' : session.verified ? 'authenticated' : 'checking', user: session?.user ?? null, signIn: async input => { await signIn.mutateAsync(input); }, signOut: async () => { await signOut.mutateAsync(); } }}>{children}</AuthContext.Provider>;
}
