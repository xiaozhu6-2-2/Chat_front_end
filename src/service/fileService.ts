/**
 * 文件服务层
 * 处理文件上传、下载、预览等API调用
 * 与智能缓存策略配合使用
 */

import type {
  FileMetadata,
  FileUploadContext,
  UploadOptions,
  UploadResult,
} from '@/types/file'
import {
  FileDownloadError,
  FileError,
  FileUploadError,
} from '@/types/file'
import {
  createFileFormData,
  getFileType,
  validateFile,
} from '@/utils/fileUtils'
import { authApi } from './api'

/**
 * 文件服务类
 * 提供文件相关的API调用方法
 */
export class FileServiceClass {
  /**
   * 上传文件
   * @param file 文件对象
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadFile (
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      // 1. 基础验证
      this.validateFileBasic(file)

      // 2. 应用验证规则
      const validationRules = this.getValidationRules(options.fileType)
      validateFile(file, validationRules)

      // 3. 创建FormData
      const formData = createFileFormData(file, options)

      // 4. 发送上传请求
      const response = await authApi.post<UploadResult>('/file/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total && options.onProgress) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            // 使用防抖优化进度更新频率
            this.debouncedProgressUpdate(options.onProgress, progress)
          }
        },
        timeout: options.timeout || 5 * 60 * 1000, // 默认5分钟超时
      })

      return response.data
    } catch (error) {
      console.error('FileService.uploadFile:', error)
      throw new FileUploadError(
        this.formatUploadErrorMessage(error),
        error,
      )
    }
  }

  /**
   * 获取文件信息（预览）
   * @param fileId 文件ID
   * @returns 文件元数据
   */
  async getFileInfo (fileId: string): Promise<FileMetadata> {
    try {
      const response = await authApi.post<FileMetadata>('/file/preview', {
        file_id: fileId,
      })

      return response.data
    } catch (error) {
      console.error('FileService.getFileInfo:', error)
      throw new FileError('获取文件信息失败', error)
    }
  }

  /**
   * 下载文件
   * @param fileId 文件ID
   * @param onProgress 进度回调（可选）
   * @returns 文件Blob数据
   */
  async downloadFile (
    fileId: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    try {
      const response = await authApi.post('/file/download', {
        file_id: fileId,
      }, {
        responseType: 'blob',
        onDownloadProgress: progressEvent => {
          if (progressEvent.total && onProgress) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            this.debouncedProgressUpdate(onProgress, progress)
          }
        },
      })

      return response.data
    } catch (error) {
      console.error('FileService.downloadFile:', error)
      throw new FileDownloadError('文件下载失败', error)
    }
  }

  /**
   * 删除文件
   * @param fileId 文件ID
   * @returns 删除结果
   */
  async deleteFile (fileId: string): Promise<{ success: boolean }> {
    try {
      const response = await authApi.post('/file/delete', {
        file_id: fileId,
      })

      return response.data
    } catch (error) {
      console.error('FileService.deleteFile:', error)
      throw new FileError('文件删除失败', error)
    }
  }

  /**
   * 生成文件预览URL
   * @param fileId 文件ID
   * @param metadata 文件元数据
   * @returns 预览URL
   */
  generatePreviewUrl (fileId: string, metadata: FileMetadata): string {
    // 如果已有URL，直接返回
    if (metadata.url) {
      return metadata.url
    }

    // 根据文件类型生成预览URL
    const fileType = metadata.file_type.toLowerCase()

    // 图片文件使用原始URL
    if (fileType === 'image' || (metadata.mime_type && metadata.mime_type.startsWith('image/'))) {
      return `${import.meta.env.VITE_API_BASE_URL}/auth/file/preview/${fileId}`
    }

    // 其他文件类型的预览URL（如果有在线预览功能）
    if (['video', 'audio', 'pdf'].includes(fileType)) {
      return `${import.meta.env.VITE_API_BASE_URL}/auth/file/preview/${fileId}`
    }

    // 默认情况下返回空，需要下载才能查看
    return ''
  }

  /**
   * 检查文件是否支持在线预览
   * @param metadata 文件元数据
   * @returns 是否支持在线预览
   */
  canPreviewOnline (metadata: FileMetadata): boolean {
    const fileType = metadata.file_type.toLowerCase()
    const mimeType = metadata.mime_type?.toLowerCase()

    // 图片文件总是支持预览
    if (mimeType && mimeType.startsWith('image/')) {
      return true
    }

    // 支持在线预览的其他文件类型
    const previewableTypes = ['video', 'audio', 'pdf']
    return previewableTypes.includes(fileType)
  }

  /**
   * 获取文件下载URL
   * @param fileId 文件ID
   * @returns 下载URL
   */
  getDownloadUrl (fileId: string): string {
    return `${import.meta.env.VITE_API_BASE_URL}/auth/file/download`
  }

  /**
   * 创建缩略图（仅支持图片和视频）
   * @param file 文件对象
   * @param maxWidth 最大宽度
   * @param maxHeight 最大高度
   * @returns 缩略图Blob或null
   */
  async createThumbnail (
    file: File,
    maxWidth = 200,
    maxHeight = 200,
  ): Promise<Blob | null> {
    const fileType = getFileType(file)

    // 目前只支持图片缩略图
    if (fileType === 'image' || file.type.startsWith('image/')) {
      try {
        // 动态导入createImageThumbnail函数以避免循环依赖
        const { createImageThumbnail } = await import('@/utils/fileUtils')
        return await createImageThumbnail(file, maxWidth, maxHeight)
      } catch (error) {
        console.error('创建图片缩略图失败:', error)
        return null
      }
    }

    // TODO: 未来可以支持视频缩略图
    return null
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @param options 上传选项
   * @param onEachProgress 单个文件进度回调
   * @param onOverallProgress 总体进度回调
   * @returns 上传结果数组
   */
  async uploadFiles (
    files: File[],
    options: UploadOptions = {},
    onEachProgress?: (fileIndex: number, progress: number) => void,
    onOverallProgress?: (overallProgress: number) => void,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []
    const totalFiles = files.length

    for (const [i, file] of files.entries()) {
      try {
        const result = await this.uploadFile(file, {
          ...options,
          onProgress: progress => {
            onEachProgress?.(i, progress)

            // 计算总体进度
            const overallProgress = ((i + progress / 100) / totalFiles) * 100
            onOverallProgress?.(overallProgress)
          },
        })

        results.push(result)
      } catch (error) {
        console.error(`文件 ${file.name} 上传失败:`, error)
        // 继续上传其他文件，不中断整个批量操作
      }
    }

    return results
  }

  // ========== 私有方法 ==========

  /**
   * 基础文件验证
   * @param file 文件对象
   */
  private validateFileBasic (file: File): void {
    if (!file) {
      throw new FileUploadError('请选择要上传的文件')
    }

    if (file.size === 0) {
      throw new FileUploadError('文件大小不能为0')
    }

    if (file.size > 1024 * 1024 * 1024) { // 1GB
      throw new FileUploadError('文件大小不能超过1GB')
    }
  }

  /**
   * 根据文件类型获取验证规则
   * @param fileType 文件类型
   * @returns 验证规则
   */
  private getValidationRules (fileType?: string) {
    const maxSize = 100 * 1024 * 1024 // 默认100MB
    const allowedTypes = ['image', 'video', 'audio', 'document', 'archive']

    // 根据文件类型定制规则
    switch (fileType) {
      case 'image': {
        return {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['image'],
          allowedMimeTypes: ['image/*'],
        }
      }
      case 'video': {
        return {
          maxSize: 500 * 1024 * 1024, // 500MB
          allowedTypes: ['video'],
          allowedMimeTypes: ['video/*'],
        }
      }
      case 'audio': {
        return {
          maxSize: 50 * 1024 * 1024, // 50MB
          allowedTypes: ['audio'],
          allowedMimeTypes: ['audio/*'],
        }
      }
      default: {
        return {
          maxSize,
          allowedTypes,
        }
      }
    }
  }

  /**
   * 格式化上传错误信息
   * @param error 原始错误
   * @returns 格式化的错误信息
   */
  private formatUploadErrorMessage (error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message
    }

    if (error?.response?.status === 413) {
      return '文件大小超出限制'
    }

    if (error?.response?.status === 422) {
      return '文件类型不支持'
    }

    if (error?.response?.status === 401) {
      return '未授权，请重新登录'
    }

    if (error?.code === 'NETWORK_ERROR') {
      return '网络连接失败，请检查网络设置'
    }

    return '文件上传失败，请稍后重试'
  }

  /**
   * 防抖的进度更新函数
   */
  private debouncedProgressUpdate = (() => {
    const timers = new Map<(progress: number) => void, number>()

    return (callback: (progress: number) => void, progress: number) => {
      // 清除之前的定时器
      const existingTimer = timers.get(callback)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        callback(progress)
        timers.delete(callback)
      }, 100) // 100ms防抖

      timers.set(callback, timer)
    }
  })()
}

// 导出单例实例
export const FileService = new FileServiceClass()

// 导出便捷方法
export const uploadFile = FileService.uploadFile.bind(FileService)
export const getFileInfo = FileService.getFileInfo.bind(FileService)
export const downloadFile = FileService.downloadFile.bind(FileService)
export const deleteFile = FileService.deleteFile.bind(FileService)
export const generatePreviewUrl = FileService.generatePreviewUrl.bind(FileService)
