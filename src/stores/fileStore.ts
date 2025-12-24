/**
 * 文件状态管理Store
 * 实现智能缓存策略：只缓存图片，其余文件只缓存预览信息
 */

import type {
  CacheConfig,
  DownloadTask,
  FileCache,
  FileMetadata,
  ImageCache,
  PreviewCache,
  UploadTask,
} from '@/types/file'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { formatFileSize, shouldCacheFullyByMimeType } from '@/utils/fileUtils'

export const useFileStore = defineStore('file', () => {
  // ========== 状态定义 ==========

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
      maxSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 50,
      maxFileSize: 10 * 1024 * 1024, // 单个图片最大10MB
    },
    previewCache: {
      maxFiles: 200,
    },
  })

  // ========== 计算属性 ==========

  // 图片缓存总大小
  const currentImageCacheSize = computed(() => {
    let total = 0
    for (const cache of imageCache.value.values()) {
      total += cache.size || 0
    }
    return total
  })

  // 图片缓存数量
  const imageCacheCount = computed(() => imageCache.value.size)

  // 预览缓存数量
  const previewCacheCount = computed(() => previewCache.value.size)

  // 活跃的上传任务数量
  const activeUploadTasks = computed(() => {
    let count = 0
    for (const task of uploadTasks.value.values()) {
      if (task.status === 'uploading' || task.status === 'pending') {
        count++
      }
    }
    return count
  })

  // 活跃的下载任务数量
  const activeDownloadTasks = computed(() => {
    let count = 0
    for (const task of downloadTasks.value.values()) {
      if (task.status === 'downloading' || task.status === 'pending') {
        count++
      }
    }
    return count
  })

  // ========== 缓存管理核心方法 ==========

  /**
   * 获取缓存文件（根据MIME类型自动选择缓存类型）
   * @param fileId 文件ID
   * @param mimeType MIME类型
   * @returns 缓存对象或undefined
   */
  const getFile = (fileId: string, mimeType?: string): FileCache | undefined => {
    // 优先检查图片缓存
    const image = imageCache.value.get(fileId)
    if (image) {
      // 更新访问信息（LRU算法）
      image.lastAccess = Date.now()
      image.accessCount++
      return image
    }

    // 检查预览缓存
    const preview = previewCache.value.get(fileId)
    if (preview) {
      // 更新访问信息
      preview.lastAccess = Date.now()
      preview.accessCount++
      return preview
    }

    return undefined
  }

  /**
   * 添加文件到缓存（根据文件类型自动选择缓存策略）
   * @param fileId 文件ID
   * @param metadata 文件元数据
   * @param blob 文件数据（可选，仅图片需要）
   * @param mimeType MIME类型
   */
  const cacheFile = (
    fileId: string,
    metadata: FileMetadata,
    blob?: Blob,
    mimeType?: string,
  ): void => {
    const fileType = mimeType || metadata.mime_type

    if (shouldCacheFullyByMimeType(fileType)) {
      // 图片文件：完整缓存
      cacheImageFile(fileId, metadata, blob, fileType)
    } else {
      // 其他文件：仅缓存预览信息
      cachePreviewFile(fileId, metadata, fileType)
    }
  }

  /**
   * 缓存图片文件（完整缓存）
   * @param fileId 文件ID
   * @param metadata 文件元数据
   * @param blob 文件数据
   * @param mimeType MIME类型
   */
  const cacheImageFile = (
    fileId: string,
    metadata: FileMetadata,
    blob?: Blob,
    mimeType?: string,
  ): void => {
    if (!blob) {
      console.warn('缓存图片文件需要提供blob数据')
      return
    }

    // 检查单个文件大小限制
    if (blob.size > config.value.imageCache.maxFileSize) {
      console.warn(`图片文件过大，跳过缓存: ${formatFileSize(blob.size)} > ${formatFileSize(config.value.imageCache.maxFileSize)}`)
      return
    }

    // 检查缓存空间，必要时清理
    if (currentImageCacheSize.value + blob.size > config.value.imageCache.maxSize) {
      cleanupOldestImageCache(blob.size)
    }

    // 检查文件数量限制
    if (imageCache.value.size >= config.value.imageCache.maxFiles) {
      cleanupLeastUsedImageCache()
    }

    // 创建Blob URL
    const blobUrl = URL.createObjectURL(blob)

    // 添加到缓存
    imageCache.value.set(fileId, {
      fileId,
      fileName: metadata.display_name,
      fileSize: metadata.file_size,
      mimeType: mimeType || metadata.mime_type,
      blob,
      blobUrl,
      thumbnail: metadata.thumbnail,
      metadata,
      lastAccess: Date.now(),
      accessCount: 1,
      size: blob.size,
    })
  }

  /**
   * 缓存预览文件（仅元数据）
   * @param fileId 文件ID
   * @param metadata 文件元数据
   * @param mimeType MIME类型
   */
  const cachePreviewFile = (
    fileId: string,
    metadata: FileMetadata,
    mimeType?: string,
  ): void => {
    // 检查数量限制
    if (previewCache.value.size >= config.value.previewCache.maxFiles) {
      cleanupLeastUsedPreviewCache()
    }

    // 添加到预览缓存
    previewCache.value.set(fileId, {
      fileId,
      fileName: metadata.display_name,
      fileSize: metadata.file_size,
      mimeType: mimeType || metadata.mime_type,
      file_type: metadata.file_type,
      previewUrl: metadata.url,
      thumbnail: metadata.thumbnail,
      metadata,
      lastAccess: Date.now(),
      accessCount: 1,
    })
  }

  /**
   * 清理最旧的图片缓存（基于LRU算法）
   * @param requiredSpace 需要释放的空间大小
   */
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

      if (freedSpace >= requiredSpace) {
        break
      }
    }

    console.log(`清理图片缓存，释放空间: ${formatFileSize(freedSpace)}`)
  }

  /**
   * 清理最少使用的图片缓存
   */
  const cleanupLeastUsedImageCache = (): void => {
    const entries = Array.from(imageCache.value.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)

    // 删除最少使用的10%文件
    const deleteCount = Math.ceil(entries.length * 0.1)
    for (let i = 0; i < deleteCount; i++) {
      const [fileId, cache] = entries[i]
      imageCache.value.delete(fileId)

      // 释放Blob URL
      if (cache.blobUrl) {
        URL.revokeObjectURL(cache.blobUrl)
      }
    }

    console.log(`清理最少使用的图片缓存，删除 ${deleteCount} 个文件`)
  }

  /**
   * 清理最少使用的预览缓存
   */
  const cleanupLeastUsedPreviewCache = (): void => {
    const entries = Array.from(previewCache.value.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)

    // 删除最少使用的10%文件
    const deleteCount = Math.ceil(entries.length * 0.1)
    for (let i = 0; i < deleteCount; i++) {
      const [fileId] = entries[i]
      previewCache.value.delete(fileId)
    }

    console.log(`清理最少使用的预览缓存，删除 ${deleteCount} 个文件`)
  }

  /**
   * 从缓存中移除文件
   * @param fileId 文件ID
   */
  const removeFile = (fileId: string): boolean => {
    const image = imageCache.value.get(fileId)
    if (image) {
      imageCache.value.delete(fileId)
      // 释放Blob URL
      if (image.blobUrl) {
        URL.revokeObjectURL(image.blobUrl)
      }
      return true
    }

    const preview = previewCache.value.get(fileId)
    if (preview) {
      previewCache.value.delete(fileId)
      return true
    }

    return false
  }

  /**
   * 清空所有缓存
   */
  const clearCache = (): void => {
    // 释放所有Blob URL
    for (const cache of imageCache.value.values()) {
      if (cache.blobUrl) {
        URL.revokeObjectURL(cache.blobUrl)
      }
    }

    imageCache.value.clear()
    previewCache.value.clear()
    console.log('已清空所有文件缓存')
  }

  // ========== 任务管理方法 ==========

  /**
   * 添加上传任务
   * @param taskId 任务ID
   * @param task 任务信息
   */
  const addUploadTask = (taskId: string, task: UploadTask): void => {
    uploadTasks.value.set(taskId, task)
  }

  /**
   * 更新上传任务进度
   * @param taskId 任务ID
   * @param progress 进度百分比 0-100
   */
  const updateUploadProgress = (taskId: string, progress: number): void => {
    const task = uploadTasks.value.get(taskId)
    if (task) {
      task.progress = Math.max(0, Math.min(100, progress))
      task.status = progress >= 100 ? 'completed' : 'uploading'
    }
  }

  /**
   * 标记上传任务为错误状态
   * @param taskId 任务ID
   * @param error 错误信息
   */
  const markUploadTaskError = (taskId: string, error: string): void => {
    const task = uploadTasks.value.get(taskId)
    if (task) {
      task.status = 'error'
      task.error = error
    }
  }

  /**
   * 移除上传任务
   * @param taskId 任务ID
   */
  const removeUploadTask = (taskId: string): boolean => {
    return uploadTasks.value.delete(taskId)
  }

  /**
   * 添加下载任务
   * @param taskId 任务ID
   * @param task 任务信息
   */
  const addDownloadTask = (taskId: string, task: DownloadTask): void => {
    downloadTasks.value.set(taskId, task)
  }

  /**
   * 更新下载任务进度
   * @param taskId 任务ID
   * @param progress 进度百分比 0-100
   */
  const updateDownloadProgress = (taskId: string, progress: number): void => {
    const task = downloadTasks.value.get(taskId)
    if (task) {
      task.progress = Math.max(0, Math.min(100, progress))
      task.status = progress >= 100 ? 'completed' : 'downloading'
    }
  }

  /**
   * 标记下载任务为错误状态
   * @param taskId 任务ID
   * @param error 错误信息
   */
  const markDownloadTaskError = (taskId: string, error: string): void => {
    const task = downloadTasks.value.get(taskId)
    if (task) {
      task.status = 'error'
      task.error = error
    }
  }

  /**
   * 移除下载任务
   * @param taskId 任务ID
   */
  const removeDownloadTask = (taskId: string): boolean => {
    return downloadTasks.value.delete(taskId)
  }

  // ========== 配置管理方法 ==========

  /**
   * 更新缓存配置
   * @param newConfig 新配置
   */
  const updateConfig = (newConfig: Partial<CacheConfig>): void => {
    config.value = { ...config.value, ...newConfig }

    // 如果新的配置更严格，触发清理
    if (newConfig.imageCache) {
      if (currentImageCacheSize.value > newConfig.imageCache.maxSize) {
        cleanupOldestImageCache(currentImageCacheSize.value - newConfig.imageCache.maxSize)
      }
      if (imageCache.value.size > newConfig.imageCache.maxFiles) {
        cleanupLeastUsedImageCache()
      }
    }

    if (newConfig.previewCache && previewCache.value.size > newConfig.previewCache.maxFiles) {
      cleanupLeastUsedPreviewCache()
    }
  }

  // ========== 调试和统计方法 ==========

  /**
   * 获取缓存统计信息
   * @returns 统计信息对象
   */
  const getCacheStats = () => {
    return {
      imageCache: {
        count: imageCacheCount.value,
        size: currentImageCacheSize.value,
        maxSize: config.value.imageCache.maxSize,
        sizeUsage: (currentImageCacheSize.value / config.value.imageCache.maxSize * 100).toFixed(2) + '%',
      },
      previewCache: {
        count: previewCacheCount.value,
        maxFiles: config.value.previewCache.maxFiles,
        usage: (previewCacheCount.value / config.value.previewCache.maxFiles * 100).toFixed(2) + '%',
      },
      tasks: {
        activeUploads: activeUploadTasks.value,
        activeDownloads: activeDownloadTasks.value,
      },
    }
  }

  return {
    // 状态（只读）
    imageCache: readonly(imageCache),
    previewCache: readonly(previewCache),
    uploadTasks: readonly(uploadTasks),
    downloadTasks: readonly(downloadTasks),
    config: readonly(config),

    // 计算属性
    currentImageCacheSize,
    imageCacheCount,
    previewCacheCount,
    activeUploadTasks,
    activeDownloadTasks,

    // 缓存管理
    getFile,
    cacheFile,
    cacheImageFile,
    cachePreviewFile,
    removeFile,
    clearCache,

    // 任务管理
    addUploadTask,
    updateUploadProgress,
    markUploadTaskError,
    removeUploadTask,
    addDownloadTask,
    updateDownloadProgress,
    markDownloadTaskError,
    removeDownloadTask,

    // 配置管理
    updateConfig,

    // 调试和统计
    getCacheStats,
  }
})
