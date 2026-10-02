export class ApiError extends Error {
  constructor(message: string, public readonly status = 0, public readonly code = 50001) { super(message); this.name = 'ApiError'; }
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '暂时无法加载，请稍后重试';
