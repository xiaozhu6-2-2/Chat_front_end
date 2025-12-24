/**
 * 文件处理组合式函数
 * 提供文件上传、下载、预览等业务逻辑
 * 实现智能缓存策略：只缓存图片，其余文件只缓存预览
 */

import type {
  FileMetadata,
  FilePreviewInfo,
  FileType,
  FileUploadContext,
  UploadOptions,
  UploadResult,
} from '@/types/file'
import axios from 'axios'
import { ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { FileService } from '@/service/fileService'
import { useFileStore } from '@/stores/fileStore'
import {
  FileDownloadError,
  FileUploadError,
} from '@/types/file'
import {
  createImageThumbnail,
  downloadFromUrl,
  formatFileSize,
  generateFileId,
  generateTaskId,
  shouldCacheFully,
  shouldCacheFullyByMimeType,
  validateFile,
} from '@/utils/fileUtils'

/**
 * 文件处理组合式函数
 * @returns 文件操作方法和状态
 */
export function useFile () {
  const fileStore = useFileStore()
  const { showSuccess, showError, showInfo } = useSnackbar()

  // ========== 上传功能 ==========

  /**
   * 上传单个文件
   * @param file 文件对象
   * @param options 上传选项
   * @returns 上传结果
   */
  const uploadFile = async (
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> => {
    const taskId = generateTaskId()

    try {
      // 1. 创建上传任务
      fileStore.addUploadTask(taskId, {
        fileId: generateFileId(file),
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        progress: 0,
      })

      // 2. 上传文件
      const result = await FileService.uploadFile(file, {
        ...options,
        onProgress: progress => {
          fileStore.updateUploadProgress(taskId, progress)
          options.onProgress?.(progress)
        },
      })

      // 3. 获取完整文件信息
      const metadata: FileMetadata = {
        ...result,
        url: FileService.generatePreviewUrl(result.file_id, result),
        thumbnail: result.thumbnail,
      }

      // 4. 根据缓存策略处理文件
      if (shouldCacheFully(file)) {
        // 图片文件：创建缩略图并完整缓存
        try {
          const thumbnail = await createImageThumbnail(file)
          const thumbnailUrl = thumbnail ? URL.createObjectURL(thumbnail) : undefined

          fileStore.cacheFile(result.file_id, metadata, file, file.type)

          // 更新元数据中的缩略图信息
          if (thumbnailUrl) {
            fileStore.cacheFile(result.file_id, {
              ...metadata,
              thumbnail: thumbnailUrl,
            }, file, file.type)
          }
        } catch (error) {
          console.error('创建缩略图失败:', error)
          // 即使缩略图创建失败，仍然缓存原文件
          fileStore.cacheFile(result.file_id, metadata, file, file.type)
        }
      } else {
        // 其他文件：仅缓存预览信息
        fileStore.cacheFile(result.file_id, metadata)
      }

      // 5. 清理上传任务
      fileStore.removeUploadTask(taskId)

      // 6. 显示成功消息
      showSuccess(`文件 "${file.name}" 上传成功`)

      return result
    } catch (error) {
      // 处理上传失败
      fileStore.markUploadTaskError(taskId, error instanceof Error ? error.message : '上传失败')

      const errorMessage = error instanceof FileUploadError
        ? error.message
        : '文件上传失败'

      showError(errorMessage)
      throw error
    }
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @param options 上传选项
   * @returns 上传结果数组
   */
  const uploadFiles = async (
    files: File[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> => {
    if (files.length === 0) {
      return []
    }

    showInfo(`开始上传 ${files.length} 个文件...`)

    try {
      const results = await FileService.uploadFiles(
        files,
        options,
        (fileIndex, progress) => {
          // 单个文件进度更新
          console.log(`文件 ${fileIndex + 1}/${files.length} 进度: ${progress}%`)
        },
        overallProgress => {
          // 总体进度更新（可以显示进度条）
          console.log(`总体上传进度: ${overallProgress}%`)
        },
      )

      const successCount = results.length
      const failCount = files.length - successCount

      if (successCount > 0) {
        showSuccess(`成功上传 ${successCount} 个文件`)
      }

      if (failCount > 0) {
        showError(`${failCount} 个文件上传失败`)
      }

      return results
    } catch (error) {
      showError('批量上传失败')
      throw error
    }
  }

  /**
   * 使用临时token上传文件（用于注册等特殊场景）
   * @param file 文件对象
   * @param token 临时认证token
   * @param options 上传选项
   * @returns 上传结果
   */
  const uploadFileWithTempToken = async (
    file: File,
    token: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> => {
    const taskId = generateTaskId()

    try {
      // 1. 创建临时API实例
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const tempAuthApi = axios.create({
        baseURL: `${baseURL}/auth`,
        timeout: options.timeout || 5 * 60 * 1000,
      })

      // 2. 设置认证头
      tempAuthApi.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // 3. 创建上传任务
      fileStore.addUploadTask(taskId, {
        fileId: generateFileId(file),
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        progress: 0,
      })

      // 4. 验证文件（使用现有的验证规则）
      const validationRules = {
        maxSize: 10 * 1024 * 1024, // 10MB（图片限制）
        allowedTypes: ['image'], // 图片文件类型
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], // 支持的MIME类型
      }
      validateFile(file, validationRules)

      // 5. 创建FormData（手动创建，避免后端不支持的context字段）
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', options.fileName || file.name)
      formData.append('fileType', options.fileType || 'image')

      // 6. 发送上传请求
      const response = await tempAuthApi.post<UploadResult>('/file/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            fileStore.updateUploadProgress(taskId, progress)
            options.onProgress?.(progress)
          }
        },
        timeout: options.timeout || 5 * 60 * 1000,
      })

      // 7. 处理响应
      if (response.data?.file_id) {
        const metadata: FileMetadata = {
          ...response.data,
          url: `${baseURL}/auth/file/preview/${response.data.file_id}`,
        }

        // 8. 根据缓存策略处理
        if (shouldCacheFully(file)) {
          fileStore.cacheFile(response.data.file_id, metadata, file, file.type)
        }

        // 9. 清理上传任务
        fileStore.removeUploadTask(taskId)

        return response.data
      } else {
        throw new Error('上传响应格式错误')
      }
    } catch (error: any) {
      console.error('uploadFileWithTempToken:', error)
      fileStore.markUploadTaskError(taskId, error instanceof Error ? error.message : '上传失败')
      throw new FileUploadError(
        error.response?.data?.message || error.message || '文件上传失败',
        error,
      )
    } finally {
      fileStore.removeUploadTask(taskId)
    }
  }

  // ========== 下载功能 ==========

  /**
   * 下载文件
   * @param fileId 文件ID
   * @param fileName 文件名（可选）
   * @returns Promise<void>
   */
  const downloadFile = async (fileId: string, fileName?: string): Promise<void> => {
    const taskId = generateTaskId()

    try {
      // 1. 检查缓存（仅图片文件可能有缓存）
      const cachedFile = fileStore.getFile(fileId)
      if (cachedFile && 'blob' in cachedFile && cachedFile.blob) {
        // 从缓存下载
        downloadFromUrl(cachedFile.blobUrl, fileName || cachedFile.fileName)
        showSuccess('文件下载完成')
        return
      }

      // 2. 获取文件信息（如果需要文件名）
      if (!fileName) {
        const metadata = await FileService.getFileInfo(fileId)
        fileName = metadata.display_name
      }

      // 3. 创建下载任务
      fileStore.addDownloadTask(taskId, {
        fileId,
        fileName,
        status: 'pending',
        progress: 0,
      })

      // 4. 下载文件
      const blob = await FileService.downloadFile(fileId, progress => {
        fileStore.updateDownloadProgress(taskId, progress)
      })

      // 5. 创建下载链接并触发下载
      const blobUrl = URL.createObjectURL(blob)
      downloadFromUrl(blobUrl, fileName!)

      // 6. 清理下载任务和URL
      fileStore.removeDownloadTask(taskId)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000) // 延迟释放，确保下载开始

      showSuccess('文件下载完成')
    } catch (error) {
      fileStore.markDownloadTaskError(taskId, error instanceof Error ? error.message : '下载失败')

      const errorMessage = error instanceof FileDownloadError
        ? error.message
        : '文件下载失败'

      showError(errorMessage)
      throw error
    }
  }

  // ========== 预览功能 ==========

  /**
   * 预览文件（返回可访问的URL）
   * @param fileId 文件ID
   * @param metadata 文件元数据（可选，用于优化性能）
   * @returns 预览URL或null
   */
  const previewFile = async (fileId: string, metadata?: FileMetadata): Promise<string | null> => {
    try {
      // 1. 检查缓存
      const cachedFile = fileStore.getFile(fileId)
      if (cachedFile) {
        if ('blobUrl' in cachedFile && cachedFile.blobUrl) {
          // 图片文件返回缓存的blobUrl
          return cachedFile.blobUrl
        } else if ('previewUrl' in cachedFile && cachedFile.previewUrl) {
          // 其他文件返回在线预览URL
          return cachedFile.previewUrl
        }
      }

      // 2. 获取文件信息
      if (!metadata) {
        metadata = await FileService.getFileInfo(fileId)
      }

      // 3. 生成预览URL
      const previewUrl = FileService.generatePreviewUrl(fileId, metadata)

      // 4. 根据文件类型处理缓存
      if (shouldCacheFullyByMimeType(metadata.mime_type)) {
        // 图片文件：下载并缓存
        try {
          const blob = await FileService.downloadFile(fileId)
          fileStore.cacheFile(fileId, metadata, blob, metadata.mime_type)

          // 返回新的blobUrl
          const newCachedFile = fileStore.getFile(fileId)
          if (newCachedFile && 'blobUrl' in newCachedFile) {
            return newCachedFile.blobUrl
          }
        } catch (error) {
          console.error('缓存图片失败:', error)
          // 如果缓存失败，仍然返回在线URL
        }
      } else {
        // 其他文件：仅缓存预览信息
        fileStore.cacheFile(fileId, metadata)
      }

      return previewUrl
    } catch (error) {
      console.error('预览文件失败:', error)
      showError('无法预览文件')
      return null
    }
  }

  /**
   * 获取文件预览信息
   * @param fileId 文件ID
   * @returns 预览信息对象
   */
  const getFilePreviewInfo = async (fileId: string): Promise<FilePreviewInfo> => {
    try {
      // 检查缓存
      const cachedFile = fileStore.getFile(fileId)
      if (cachedFile) {
        return {
          fileId: cachedFile.fileId,
          fileName: cachedFile.fileName,
          fileSize: cachedFile.fileSize,
          mimeType: cachedFile.mimeType,
          fileType: getFileTypeFromMimeType(cachedFile.mimeType),
          previewUrl: 'previewUrl' in cachedFile ? cachedFile.previewUrl : undefined,
          thumbnail: cachedFile.thumbnail,
          canPreview: FileService.canPreviewOnline(cachedFile.metadata),
          needDownload: !('blob' in cachedFile),
        }
      }

      // 获取文件信息
      const metadata = await FileService.getFileInfo(fileId)
      const fileType = getFileTypeFromMimeType(metadata.file_type)

      return {
        fileId: metadata.file_id,
        fileName: metadata.display_name,
        fileSize: metadata.file_size,
        mimeType: metadata.mime_type,
        fileType,
        previewUrl: FileService.generatePreviewUrl(fileId, metadata),
        thumbnail: metadata.thumbnail,
        canPreview: FileService.canPreviewOnline(metadata),
        needDownload: true,
      }
    } catch (error) {
      console.error('获取文件预览信息失败:', error)
      throw error
    }
  }

  // ========== 文件管理 ==========

  /**
   * 删除文件
   * @param fileId 文件ID
   * @returns 删除结果
   */
  const deleteFile = async (fileId: string): Promise<void> => {
    try {
      // 1. 从服务器删除
      await FileService.deleteFile(fileId)

      // 2. 从缓存中删除
      fileStore.removeFile(fileId)

      showSuccess('文件删除成功')
    } catch (error) {
      showError('文件删除失败')
      throw error
    }
  }

  /**
   * 清理缓存
   */
  const clearCache = (): void => {
    fileStore.clearCache()
    showInfo('文件缓存已清空')
  }

  /**
   * 获取缓存统计信息
   */
  const getCacheStats = () => {
    return fileStore.getCacheStats()
  }

  // ========== 文件类型判断 ==========

  /**
   * 检查文件是否为图片
   */
  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/')
  }

  /**
   * 检查文件是否为视频
   */
  const isVideo = (mimeType: string): boolean => {
    return mimeType.startsWith('video/')
  }

  /**
   * 检查文件是否为音频
   */
  const isAudio = (mimeType: string): boolean => {
    return mimeType.startsWith('audio/')
  }

  /**
   * 从MIME类型获取文件类型
   */
  const getFileTypeFromMimeType = (mimeType: string): FileType => {
    if (mimeType.startsWith('image/')) {
      return 'image' as FileType
    }
    if (mimeType.startsWith('video/')) {
      return 'video' as FileType
    }
    if (mimeType.startsWith('audio/')) {
      return 'audio' as FileType
    }

    // 更详细的判断
    if (mimeType.includes('pdf') || mimeType.includes('text/')) {
      return 'document' as FileType
    }
    if (mimeType.includes('zip')) {
      return 'archive' as FileType
    }

    return 'unknown' as FileType
  }

  // ========== 返回公共接口 ==========

  return {
    // 上传功能
    uploadFile,
    uploadFiles,
    uploadFileWithTempToken,

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
    activeDownloadTasks: fileStore.activeDownloadTasks,
  }
}
