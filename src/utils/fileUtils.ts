/**
 * 文件处理工具函数
 * 包含文件类型识别、缓存策略判断、验证等核心工具
 */

import type { FileValidationRule } from '@/types/file'
import { FileType, FileValidationError } from '@/types/file'

// 文件类型映射
export const FILE_TYPE_MAP = {
  [FileType.IMAGE]: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  [FileType.DOCUMENT]: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  [FileType.VIDEO]: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'mkv'],
  [FileType.AUDIO]: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'],
  [FileType.ARCHIVE]: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  [FileType.CODE]: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt'],
}

/**
 * 根据文件扩展名获取文件类型
 * @param file 文件对象
 * @returns 文件类型
 */
export function getFileType (file: File): FileType {
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

/**
 * 根据MIME类型获取文件类型
 * @param mimeType MIME类型
 * @returns 文件类型
 */
export function getFileTypeFromMimeType (mimeType: string): FileType {
  if (mimeType.startsWith('image/')) {
    return FileType.IMAGE
  }
  if (mimeType.startsWith('video/')) {
    return FileType.VIDEO
  }
  if (mimeType.startsWith('audio/')) {
    return FileType.AUDIO
  }

  // 根据MIME类型进一步细分
  if (mimeType.includes('pdf')) {
    return FileType.DOCUMENT
  }
  if (mimeType.includes('text/')) {
    return FileType.DOCUMENT
  }
  if (mimeType.includes('application/zip')) {
    return FileType.ARCHIVE
  }

  return FileType.UNKNOWN
}

/**
 * 智能缓存策略：判断文件是否应该完整缓存
 * @param file 文件对象
 * @returns true表示应该完整缓存，false表示仅缓存预览信息
 */
export function shouldCacheFully (file: File): boolean {
  // 策略：只有图片文件才完整缓存
  const fileType = getFileType(file)
  const mimeType = file.type.toLowerCase()

  return (
    fileType === FileType.IMAGE
    || mimeType.startsWith('image/')
  )
}

/**
 * 获取缓存类型
 * @param file 文件对象
 * @returns 'image' 或 'preview'
 */
export function getCacheType (file: File): 'image' | 'preview' {
  return shouldCacheFully(file) ? 'image' : 'preview'
}

/**
 * 根据MIME类型判断缓存策略
 * @param mimeType MIME类型
 * @returns 是否应该完整缓存
 */
export function shouldCacheFullyByMimeType (mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * 验证文件是否符合规则
 * @param file 文件对象
 * @param rule 验证规则
 * @throws FileValidationError 验证失败时抛出异常
 */
export function validateFile (file: File, rule: FileValidationRule): void {
  // 文件大小验证
  if (rule.maxSize && file.size > rule.maxSize) {
    throw new FileValidationError(
      `文件大小超出限制。最大允许: ${formatFileSize(rule.maxSize)}，当前文件: ${formatFileSize(file.size)}`,
    )
  }

  // 文件类型验证
  if (rule.allowedTypes) {
    const fileType = getFileType(file)
    if (!rule.allowedTypes.includes(fileType)) {
      throw new FileValidationError(
        `不支持的文件类型: ${fileType}。支持的类型: ${rule.allowedTypes.join(', ')}`,
      )
    }
  }

  // MIME类型验证
  if (rule.allowedMimeTypes) {
    const normalizedMimeType = file.type.toLowerCase()
    const isAllowed = rule.allowedMimeTypes.some(allowed => {
      const normalizedAllowed = allowed.toLowerCase()
      // 支持通配符匹配，如 'image/*'
      if (normalizedAllowed.endsWith('/*')) {
        const prefix = normalizedAllowed.slice(0, -2)
        return normalizedMimeType.startsWith(prefix)
      }
      return normalizedMimeType === normalizedAllowed
    })

    if (!isAllowed) {
      throw new FileValidationError(
        `不支持的MIME类型: ${file.type}。支持的类型: ${rule.allowedMimeTypes.join(', ')}`,
      )
    }
  }
}

/**
 * 格式化文件大小显示
 * @param bytes 字节数
 * @param decimals 保留小数位数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize (bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const dm = Math.max(decimals, 0)
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 生成唯一的文件ID
 * @param file 文件对象
 * @returns 文件ID
 */
export function generateFileId (file: File): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 11)
  const extension = file.name.split('.').pop()

  return `file_${timestamp}_${random}.${extension || ''}`
}

/**
 * 生成任务ID
 * @returns 任务ID
 */
export function generateTaskId (): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * 安全化文件名（移除危险字符）
 * @param fileName 原始文件名
 * @returns 安全化的文件名
 */
export function sanitizeFileName (fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') // 移除危险字符
    .replace(/^\.+/g, '_') // 移除开头的点
    .replace(/\s+/g, ' ') // 将连续空格替换为单个空格
    .slice(0, 255) // 限制长度
}

/**
 * 从URL中提取文件名
 * @param url URL字符串
 * @returns 文件名
 */
export function getFileNameFromUrl (url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop()

    return fileName || 'unknown'
  } catch {
    return url.split('/').pop() || 'unknown'
  }
}

/**
 * 创建文件缩略图
 * @param file 文件对象
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 图片质量 0-1
 * @returns Promise<Blob>
 */
export function createImageThumbnail (file: File,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('只支持图片文件'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法创建canvas上下文'))
      return
    }

    const img = new Image()
    img.addEventListener('load', () => {
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
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('无法生成缩略图'))
        }
      }, file.type, quality)
    })

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 下载文件到本地
 * @param url 文件URL
 * @param fileName 文件名
 */
export function downloadFromUrl (url: string, fileName?: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || getFileNameFromUrl(url)

  // 处理跨域下载
  link.setAttribute('crossorigin', 'anonymous')

  document.body.append(link)
  link.click()
  link.remove()
}

/**
 * 检查文件是否为图片
 * @param file 文件对象
 * @returns 是否为图片
 */
export function isImageFile (file: File): boolean {
  return shouldCacheFully(file)
}

/**
 * 检查文件是否为视频
 * @param file 文件对象
 * @returns 是否为视频
 */
export function isVideoFile (file: File): boolean {
  return getFileType(file) === FileType.VIDEO || file.type.startsWith('video/')
}

/**
 * 检查文件是否为音频
 * @param file 文件对象
 * @returns 是否为音频
 */
export function isAudioFile (file: File): boolean {
  return getFileType(file) === FileType.AUDIO || file.type.startsWith('audio/')
}

/**
 * 检查文件是否为文档
 * @param file 文件对象
 * @returns 是否为文档
 */
export function isDocumentFile (file: File): boolean {
  return getFileType(file) === FileType.DOCUMENT
}

/**
 * 获取文件类型标签
 * @param fileType 文件类型
 * @returns 中文标签
 */
export function getFileTypeLabel (fileType: FileType): string {
  const labels = {
    [FileType.IMAGE]: '图片',
    [FileType.VIDEO]: '视频',
    [FileType.AUDIO]: '音频',
    [FileType.DOCUMENT]: '文档',
    [FileType.ARCHIVE]: '压缩包',
    [FileType.CODE]: '代码',
    [FileType.UNKNOWN]: '文件',
  }
  return labels[fileType] || '文件'
}

/**
 * 防抖函数，用于文件上传进度更新
 * @param func 需要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
/**
 * 创建FormData用于文件上传
 * @param file 文件对象
 * @param metadata 上传元数据
 * @returns FormData对象
 */
export function createFileFormData (file: File,
  metadata?: {
    fileName?: string
    fileType?: string
    context?: {
      type: 'avatar' | 'chat' | 'group' | 'announcement'
      relatedId?: string
    }
  }): FormData {
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

/**
 * 防抖函数，用于文件上传进度更新
 * @param func 需要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any> (func: T,
  wait: number): ((...args: Parameters<T>) => void) {
  let timeout: number | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
