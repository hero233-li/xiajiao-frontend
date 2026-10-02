/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * multipart/form-data，不接受owner、路径或storageKey；照片只是成绩存档，不评分。
 */
export interface ImageUpload {
  /** 二进制文件，JPG/PNG/WebP；服务端验证真实格式和单张≤8388608字节 */
  file: Blob;
}
