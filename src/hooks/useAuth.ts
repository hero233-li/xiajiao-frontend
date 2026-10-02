import { useContext } from 'react';
import { AuthContext } from '../features/auth/AuthProvider';
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('认证上下文未初始化'); return auth; }
