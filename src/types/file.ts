/**
 * 文件模块相关类型定义
 * 采用"只缓存图片，其余文件只缓存预览"的策略
 */

// 文件类型枚举
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  CODE = 'code',
  UNKNOWN = 'unknown',
}

// 文件上传上下文
export interface FileUploadContext {
  type: 'avatar' | 'chat' | 'group' | 'announcement'
  relatedId?: string // 聊天ID或群组ID
}

// 文件上传选项
export interface UploadOptions {
  fileName?: string
  fileType?: string
  context?: FileUploadContext
  onProgress?: (progress: number) => void
  timeout?: number
}

// API返回的文件元数据
export interface FileMetadata {
  file_id: string
  display_name: string
  file_size: number
  mime_type: string
  file_type: string
  upload_time: string
  owner_uid: string
  url?: string // 在线访问URL
  thumbnail?: string // 缩略图URL
}

// 上传结果
export interface UploadResult {
  file_id: string
  display_name: string
  file_size: number
  mime_type: string
  file_type: string
  upload_time: string
  owner_uid: string
  url?: string
  thumbnail?: string
}

// 图片完整缓存接口
export interface ImageCache {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  blob: Blob // 完整文件数据
  blobUrl: string // 本地访问URL
  thumbnail?: string // 缩略图URL
  metadata: FileMetadata
  lastAccess: number
  accessCount: number
  size: number // 实际占用的内存大小
}

// 预览缓存接口（仅元数据）
export interface PreviewCache {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  file_type: string
  previewUrl?: string // 在线预览URL
  thumbnail?: string // 缩略图（如果有）
  metadata: FileMetadata
  lastAccess: number
  accessCount: number
  // 注意：不包含blob和blobUrl，以节省内存
}

// 统一的文件缓存类型（用于Map存储）
export type FileCache = ImageCache | PreviewCache

// 上传任务状态
export interface UploadTask {
  fileId: string
  fileName: string
  fileSize: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

// 下载任务状态
export interface DownloadTask {
  fileId: string
  fileName?: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number
  error?: string
}

// 缓存配置
export interface CacheConfig {
  imageCache: {
    maxSize: number // 最大缓存大小（字节）
    maxFiles: number // 最大文件数量
    maxFileSize: number // 单个文件最大大小
  }
  previewCache: {
    maxFiles: number // 最大预览缓存数量
  }
}

// 文件验证规则
export interface FileValidationRule {
  maxSize?: number // 最大文件大小
  allowedTypes?: string[] // 允许的文件类型
  allowedMimeTypes?: string[] // 允许的MIME类型
}

// 文件预览信息
export interface FilePreviewInfo {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  fileType: FileType
  previewUrl?: string
  thumbnail?: string
  canPreview: boolean // 是否支持预览
  needDownload: boolean // 是否需要下载才能查看
}

// 错误类型
export class FileError extends Error {
  constructor (message: string, public originalError?: any) {
    super(message)
    this.name = 'FileError'
  }
}

export class FileUploadError extends FileError {
  constructor (message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileUploadError'
  }
}

export class FileDownloadError extends FileError {
  constructor (message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileDownloadError'
  }
}

export class FileValidationError extends FileError {
  constructor (message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileValidationError'
  }
}
