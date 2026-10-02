/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type FileMetadataState = typeof FileMetadataState[keyof typeof FileMetadataState];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const FileMetadataState = {
  ACTIVE: 'ACTIVE',
  DELETE_PENDING: 'DELETE_PENDING',
  DELETED: 'DELETED',
} as const;
