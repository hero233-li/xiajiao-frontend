/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { UserRole } from './userRole';

export interface User {
  /** 稳定UUID */
  id: string;
  username: string;
  email: string;
  role: UserRole;
}
