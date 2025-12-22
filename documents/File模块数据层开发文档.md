# File模块数据层开发文档

## 概述

本文档专注于echat_web聊天应用的File模块数据层实现，采用"只缓存图片，其余文件只缓存预览"的智能缓存策略。数据层包含类型定义、工具函数、状态管理、API服务和业务逻辑组合函数。

---

## 一、智能缓存策略

### 1.1 缓存策略设计

#### 核心思想
- **图片文件**：完整缓存（blob + blobUrl + 元数据）
- **其他文件类型**：仅缓存预览信息（元数据）

#### 缓存决策逻辑
```typescript
// src/utils/fileUtils.ts
export const shouldCacheFully = (file: File): boolean => {
  // 策略：只有图片文件才完整缓存
  const fileType = getFileType(file)
  const mimeType = file.type.toLowerCase()

  return (
    fileType === FileType.IMAGE ||
    mimeType.startsWith('image/')
  )
}

export const getCacheType = (file: File): 'image' | 'preview' => {
  return shouldCacheFully(file) ? 'image' : 'preview'
}
```

#### 文件类型识别
```typescript
// src/utils/fileUtils.ts
export const FILE_TYPE_MAP = {
  [FileType.IMAGE]: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  [FileType.DOCUMENT]: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  [FileType.VIDEO]: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'mkv'],
  [FileType.AUDIO]: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'],
  [FileType.ARCHIVE]: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  [FileType.CODE]: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt']
}

export const getFileType = (file: File): FileType => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension) {
    return FileType.UNKNOWN
  }

  for (const [type, extensions] of Object.entries(FILE_TYPE_MAP)) {
    if (extensions.includes(extension)) {
      return type as FileType
    }
  }

  return FileType.UNKNOWN
}
```

### 1.2 缓存架构

#### 分层缓存结构
```typescript
// 图片完整缓存接口
interface ImageCache {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  blob: Blob          // 完整文件数据
  blobUrl: string     // 本地访问URL
  thumbnail?: string  // 缩略图URL
  metadata: FileMetadata
  lastAccess: number
  accessCount: number
  size: number        // 实际占用的内存大小
}

// 预览缓存接口（仅元数据）
interface PreviewCache {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  file_type: string
  previewUrl?: string  // 在线预览URL
  thumbnail?: string   // 缩略图（如果有）
  metadata: FileMetadata
  lastAccess: number
  accessCount: number
  // 注意：不包含blob和blobUrl，以节省内存
}
```

#### LRU缓存管理
```typescript
// src/stores/fileStore.ts
const cleanupOldestImageCache = (requiredSpace: number): void => {
  const entries = Array.from(imageCache.value.entries())
    .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)

  let freedSpace = 0
  for (const [fileId, cache] of entries) {
    imageCache.value.delete(fileId)
    freedSpace += cache.size || 0

    // 释放Blob URL
    if (cache.blobUrl) {
      URL.revokeObjectURL(cache.blobUrl)
    }

    if (freedSpace >= requiredSpace) break
  }
}
```

---

## 二、文件传输机制

### 2.1 HTTP文件上传

#### FormData封装
```typescript
// src/service/fileService.ts
export const createFileFormData = (
  file: File,
  metadata?: {
    fileName?: string
    fileType?: string
    context?: FileUploadContext
  }
): FormData => {
  const formData = new FormData()

  // 添加文件本身
  formData.append('file', file)

  // 添加文件名
  formData.append('fileName', metadata?.fileName || file.name)

  // 添加文件类型
  formData.append('fileType', metadata?.fileType || getFileType(file))

  // 添加业务上下文
  if (metadata?.context) {
    formData.append('context', JSON.stringify(metadata.context))
  }

  return formData
}
```

#### 上传进度监控
```typescript
// src/service/fileService.ts
const response = await authApi.post<UploadResult>('/auth/file/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  onUploadProgress: (progressEvent) => {
    if (progressEvent.total && options.onProgress) {
      const progress = (progressEvent.loaded / progressEvent.total) * 100
      // 使用防抖优化进度更新频率
      this.debouncedProgressUpdate(options.onProgress, progress)
    }
  },
  timeout: options.timeout || 5 * 60 * 1000 // 默认5分钟超时
})
```

### 2.2 文件下载处理

#### 智能下载策略
```typescript
// src/composables/useFile.ts
const downloadFile = async (fileId: string, fileName?: string): Promise<void> => {
  // 1. 检查缓存（仅图片文件可能有缓存）
  const cachedFile = fileStore.getFile(fileId)
  if (cachedFile && 'blob' in cachedFile && cachedFile.blob) {
    // 从缓存下载
    downloadFromUrl(cachedFile.blobUrl, fileName || cachedFile.fileName)
    showSuccess('文件下载完成')
    return
  }

  // 2. 从服务器下载
  const blob = await FileService.downloadFile(fileId, (progress) => {
    fileStore.updateDownloadProgress(taskId, progress)
  })

  // 3. 创建下载链接并触发下载
  const blobUrl = URL.createObjectURL(blob)
  downloadFromUrl(blobUrl, fileName!)
}
```

---

## 三、数据层架构

### 3.1 类型定义 (src/types/file.ts)

#### 核心类型
```typescript
// 文件类型枚举
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  CODE = 'code',
  UNKNOWN = 'unknown'
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
  url?: string        // 在线访问URL
  thumbnail?: string  // 缩略图URL
}

// 缓存配置
export interface CacheConfig {
  imageCache: {
    maxSize: number        // 最大缓存大小（字节）
    maxFiles: number       // 最大文件数量
    maxFileSize: number    // 单个文件最大大小
  }
  previewCache: {
    maxFiles: number       // 最大预览缓存数量
  }
}
```

### 3.2 状态管理 (src/stores/fileStore.ts)

#### Pinia Store结构
```typescript
export const useFileStore = defineStore('file', () => {
  // 图片完整缓存
  const imageCache = ref<Map<string, ImageCache>>(new Map())

  // 文件预览信息缓存（非图片）
  const previewCache = ref<Map<string, PreviewCache>>(new Map())

  // 上传任务管理
  const uploadTasks = ref<Map<string, UploadTask>>(new Map())

  // 下载任务管理
  const downloadTasks = ref<Map<string, DownloadTask>>(new Map())

  // 缓存配置
  const config = ref<CacheConfig>({
    imageCache: {
      maxSize: 50 * 1024 * 1024,  // 50MB
      maxFiles: 50,
      maxFileSize: 10 * 1024 * 1024  // 单个图片最大10MB
    },
    previewCache: {
      maxFiles: 200
    }
  })

  return {
    // 状态
    imageCache: readonly(imageCache),
    previewCache: readonly(previewCache),
    uploadTasks: readonly(uploadTasks),
    downloadTasks: readonly(downloadTasks),

    // 方法
    getFile,
    cacheFile,
    clearCache,
    addUploadTask,
    updateUploadProgress,
    removeUploadTask,
    // ... 更多方法
  }
})
```

### 3.3 服务层 (src/service/fileService.ts)

#### API服务封装
```typescript
export class FileServiceClass {
  async uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult>
  async getFileInfo(fileId: string): Promise<FileMetadata>
  async downloadFile(fileId: string, onProgress?: (progress: number) => void): Promise<Blob>
  async deleteFile(fileId: string): Promise<{ success: boolean }>

  generatePreviewUrl(fileId: string, metadata: FileMetadata): string
  canPreviewOnline(metadata: FileMetadata): boolean
  getDownloadUrl(fileId: string): string
  createThumbnail(file: File, maxWidth?: number, maxHeight?: number): Promise<Blob | null>
  uploadFiles(files: File[], options?: UploadOptions): Promise<UploadResult[]>
}
```

### 3.4 业务逻辑 (src/composables/useFile.ts)

#### 组合式函数接口
```typescript
export function useFile() {
  return {
    // 上传功能
    uploadFile,
    uploadFiles,

    // 下载功能
    downloadFile,

    // 预览功能
    previewFile,
    getFilePreviewInfo,

    // 文件管理
    deleteFile,
    clearCache,
    getCacheStats,

    // 文件类型判断
    isImage,
    isVideo,
    isAudio,
    getFileTypeFromMimeType,

    // 工具函数
    formatFileSize,

    // Store状态访问
    imageCache: fileStore.imageCache,
    previewCache: fileStore.previewCache,
    uploadTasks: fileStore.uploadTasks,
    downloadTasks: fileStore.downloadTasks,
    activeUploadTasks: fileStore.activeUploadTasks,
    activeDownloadTasks: fileStore.activeDownloadTasks
  }
}
```

---

## 四、安全验证机制

### 4.1 文件验证

#### 验证规则
```typescript
// src/utils/fileUtils.ts
export const validateFile = (file: File, rule: FileValidationRule): void => {
  // 文件大小验证
  if (rule.maxSize && file.size > rule.maxSize) {
    throw new FileValidationError(
      `文件大小超出限制。最大允许: ${formatFileSize(rule.maxSize)}，当前文件: ${formatFileSize(file.size)}`
    )
  }

  // 文件类型验证
  if (rule.allowedTypes) {
    const fileType = getFileType(file)
    if (!rule.allowedTypes.includes(fileType)) {
      throw new FileValidationError(
        `不支持的文件类型: ${fileType}。支持的类型: ${rule.allowedTypes.join(', ')}`
      )
    }
  }

  // MIME类型验证（支持通配符匹配）
  if (rule.allowedMimeTypes) {
    const normalizedMimeType = file.type.toLowerCase()
    const isAllowed = rule.allowedMimeTypes.some(allowed => {
      const normalizedAllowed = allowed.toLowerCase()
      if (normalizedAllowed.endsWith('/*')) {
        const prefix = normalizedAllowed.slice(0, -2)
        return normalizedMimeType.startsWith(prefix)
      }
      return normalizedMimeType === normalizedAllowed
    })

    if (!isAllowed) {
      throw new FileValidationError(
        `不支持的MIME类型: ${file.type}。支持的类型: ${rule.allowedMimeTypes.join(', ')}`
      )
    }
  }
}
```

#### 安全处理
```typescript
// src/utils/fileUtils.ts
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // 移除危险字符
    .replace(/^\.+/g, '_')                     // 移除开头的点
    .replace(/\s+/g, ' ')                      // 将连续空格替换为单个空格
    .slice(0, 255)                             // 限制长度
}
```

### 4.2 错误处理

#### 自定义错误类
```typescript
// src/types/file.ts
export class FileError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'FileError'
  }
}

export class FileUploadError extends FileError {
  constructor(message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileUploadError'
  }
}

export class FileDownloadError extends FileError {
  constructor(message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileDownloadError'
  }
}

export class FileValidationError extends FileError {
  constructor(message: string, originalError?: any) {
    super(message, originalError)
    this.name = 'FileValidationError'
  }
}
```

---

## 五、性能优化策略

### 5.1 内存管理

#### 自动清理机制
```typescript
// src/stores/fileStore.ts
const cacheFile = (fileId: string, metadata: FileMetadata, blob?: Blob): void => {
  const fileType = metadata.mime_type

  if (shouldCacheFullyByFileType(fileType)) {
    // 检查缓存空间，必要时清理
    if (currentImageCacheSize.value + blob.size > config.value.imageCache.maxSize) {
      cleanupOldestImageCache(blob.size)
    }

    // 检查文件数量限制
    if (imageCache.value.size >= config.value.imageCache.maxFiles) {
      cleanupLeastUsedImageCache()
    }
  }
}
```

#### Blob URL管理
```typescript
// src/stores/fileStore.ts
const clearCache = (): void => {
  // 释放所有Blob URL
  for (const cache of imageCache.value.values()) {
    if (cache.blobUrl) {
      URL.revokeObjectURL(cache.blobUrl)
    }
  }

  imageCache.value.clear()
  previewCache.value.clear()
}
```

### 5.2 网络优化

#### 防抖进度更新
```typescript
// src/service/fileService.ts
private debouncedProgressUpdate = (() => {
  const timers = new Map<(progress: number) => void, NodeJS.Timeout>()

  return (callback: (progress: number) => void, progress: number) => {
    const existingTimer = timers.get(callback)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      callback(progress)
      timers.delete(callback)
    }, 100) // 100ms防抖

    timers.set(callback, timer)
  }
})()
```

#### 缩略图生成
```typescript
// src/utils/fileUtils.ts
export const createImageThumbnail = (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      // 计算缩略图尺寸
      let { width, height } = img
      const aspectRatio = width / height

      if (width > maxWidth || height > maxHeight) {
        if (aspectRatio > maxWidth / maxHeight) {
          width = maxWidth
          height = width / aspectRatio
        } else {
          height = maxHeight
          width = height * aspectRatio
        }
      }

      canvas.width = width
      canvas.height = height

      // 绘制缩略图
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为Blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('无法生成缩略图'))
        }
      }, file.type, quality)
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}
```

---

## 六、API接口定义

### 6.1 文件管理API

基于用户提供的API规范：

#### 上传文件 (√√√)
- URL: `/auth/file/upload`
- 方法: POST
- 场景：已登录用户可上传文件（如图片、文档、音视频等），用于聊天消息、群公告附件、个人资料等场景。

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**
```
file: [file]                    // 文件本身
fileName: "表情包"               // 文件名
fileType: "image"               // 文件类型
context: {...}                  // 业务上下文（JSON字符串）
```

**响应体**
```json
{
  "file_id": "file_7d8e9f0a1b2c3d4",
  "display_name": "Annual Report 2024.pdf",
  "file_size": 2456789,
  "mime_type": "application/pdf",
  "file_type": "document",
  "upload_time": "2024-01-20T14:32:45Z",
  "owner_uid": "user_12345"
}
```

#### 预览文件 (√√√)
- URL: `/auth/file/preview`
- 方法: POST
- 场景：用户在聊天、群公告或文件列表中点击一个已上传的文件，前端调用此接口获取临时可访问链接。

**请求头**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "file_id": "string"
}
```

**响应体**
```json
{
  "display_name": "Annual Report 2024.pdf",
  "file_size": 2456789,
  "file_type": "document"
}
```

#### 下载文件 (√√√)
- URL: `/auth/file/download`
- 方法: POST
- 场景：用户在聊天、群公告或文件列表中点击"下载"按钮，系统校验其权限后，返回一个安全的下载链接。

**请求头**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "file_id": "7772"
}
```

#### 删除文件 (√√√)
- URL: `/auth/file/delete`
- 方法: POST
- 场景：用户可删除自己上传的文件。

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**
```json
{
  "file_id": "7771"
}
```

**响应体**
```json
{
  "success": true
}
```

---

## 七、实现清单

### 7.1 已实现的数据层文件

✅ **核心类型定义**
- `src/types/file.ts` - 完整的文件类型定义和错误类

✅ **工具函数库**
- `src/utils/fileUtils.ts` - 文件处理工具函数，包含缓存策略、验证、格式化等

✅ **状态管理**
- `src/stores/fileStore.ts` - 智能缓存管理，支持图片完整缓存和预览缓存分离

✅ **API服务层**
- `src/service/fileService.ts` - 完整的文件API服务，支持上传、下载、预览等

✅ **业务逻辑组合函数**
- `src/composables/useFile.ts` - 文件操作业务逻辑封装

### 7.2 数据层特点

#### 智能缓存策略
- **图片文件**：完整缓存，支持快速预览和离线访问
- **其他文件**：仅缓存元数据，减少内存占用
- **LRU算法**：自动清理最少使用的缓存
- **内存监控**：实时监控缓存大小，防止内存溢出

#### 安全验证
- **文件类型验证**：基于扩展名和MIME类型双重验证
- **文件大小限制**：可配置的文件大小限制
- **文件名安全处理**：移除危险字符，防止路径遍历攻击
- **MIME通配符支持**：支持如 `image/*` 的通配符匹配

#### 性能优化
- **防抖进度更新**：优化上传/下载进度更新频率
- **缩略图生成**：为图片自动生成缩略图，减少内存占用
- **批量操作支持**：支持批量文件上传
- **Blob URL管理**：自动管理和释放Blob URL，防止内存泄漏

---

## 八、使用示例

### 8.1 上传文件示例

```typescript
import { useFile } from '@/composables/useFile'

const { uploadFile } = useFile()

// 上传单个文件
const handleFileUpload = async (file: File) => {
  try {
    const result = await uploadFile(file, {
      fileName: '自定义文件名',
      fileType: 'image',
      context: {
        type: 'chat',
        relatedId: 'chat_123'
      },
      onProgress: (progress) => {
        console.log(`上传进度: ${progress}%`)
      }
    })

    console.log('上传成功:', result.file_id)
  } catch (error) {
    console.error('上传失败:', error)
  }
}
```

### 8.2 预览文件示例

```typescript
import { useFile } from '@/composables/useFile'

const { previewFile, getFilePreviewInfo } = useFile()

// 获取预览URL
const previewUrl = await previewFile(fileId)
if (previewUrl) {
  // 图片文件直接显示
  // 其他文件可能需要在线预览或下载
}

// 获取完整预览信息
const previewInfo = await getFilePreviewInfo(fileId)
console.log('文件信息:', previewInfo)
```

### 8.3 缓存管理示例

```typescript
import { useFileStore } from '@/stores/fileStore'

const fileStore = useFileStore()

// 获取缓存统计
const stats = fileStore.getCacheStats()
console.log('图片缓存:', stats.imageCache)
console.log('预览缓存:', stats.previewCache)

// 清理缓存
fileStore.clearCache()
```

---

## 总结

File模块数据层实现了完整的智能缓存策略，通过分离图片完整缓存和其他文件预览缓存，有效优化了内存使用。数据层提供了丰富的API接口和工具函数，支持文件的上传、下载、预览、管理等核心功能，并具备完善的安全验证和性能优化机制。

该实现遵循Vue3 + TypeScript + Pinia架构，具有良好的类型安全性和可扩展性，为上层UI组件提供了强大的数据支持。