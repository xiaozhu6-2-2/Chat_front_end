# File模块使用说明

## 概述

File模块为echat_web聊天应用提供了完整的文件处理功能，采用"只缓存图片，其余文件只缓存预览"的智能缓存策略。本文档详细介绍如何在项目中使用File模块的各项功能。

---

## 一、快速开始

### 1.1 基础导入

```typescript
// 导入文件处理组合函数
import { useFile } from '@/composables/useFile'

// 导入文件状态管理（如果需要直接访问缓存）
import { useFileStore } from '@/stores/fileStore'

// 导入文件工具函数（如果需要额外工具）
import {
  getFileType,
  formatFileSize,
  validateFile
} from '@/utils/fileUtils'

// 导入类型定义（如果需要类型支持）
import type { FileType, UploadOptions, FileMetadata } from '@/types/file'
```

### 1.2 初始化使用

```typescript
// 在Vue组件中使用
export default defineComponent({
  setup() {
    const fileModule = useFile()

    return {
      // 导出需要在模板中使用的方法
      uploadFile: fileModule.uploadFile,
      downloadFile: fileModule.downloadFile,
      formatFileSize: fileModule.formatFileSize
    }
  }
})
```

---

## 二、核心功能使用

### 2.1 文件上传

#### 单文件上传

```typescript
import { useFile } from '@/composables/useFile'

const { uploadFile } = useFile()

// 基础上传
const handleUpload = async (file: File) => {
  try {
    const result = await uploadFile(file)
    console.log('上传成功:', result.file_id)
    console.log('文件名:', result.display_name)
  } catch (error) {
    console.error('上传失败:', error)
  }
}

// 带选项的上传
const handleAdvancedUpload = async (file: File) => {
  try {
    const result = await uploadFile(file, {
      fileName: '自定义文件名',
      fileType: 'image',
      context: {
        type: 'chat',
        relatedId: 'chat_12345'
      },
      onProgress: (progress) => {
        console.log(`上传进度: ${progress}%`)
        // 更新进度条
        uploadProgress.value = progress
      },
      timeout: 10 * 60 * 1000 // 10分钟超时
    })

    console.log('上传完成:', result)
  } catch (error) {
    console.error('上传失败:', error)
  }
}
```

#### 批量文件上传

```typescript
import { useFile } from '@/composables/useFile'

const { uploadFiles } = useFile()

const handleBatchUpload = async (files: File[]) => {
  try {
    const results = await uploadFiles(
      files,
      {
        fileType: 'document',
        context: { type: 'announcement' }
      },
      // 单个文件进度回调
      (fileIndex, progress) => {
        console.log(`文件 ${fileIndex + 1} 进度: ${progress}%`)
      },
      // 总体进度回调
      (overallProgress) => {
        console.log(`总体进度: ${overallProgress}%`)
        overallProgress.value = overallProgress
      }
    )

    console.log(`成功上传 ${results.length} 个文件`)
    return results
  } catch (error) {
    console.error('批量上传失败:', error)
  }
}
```

### 2.2 文件下载

```typescript
import { useFile } from '@/composables/useFile'

const { downloadFile } = useFile()

// 下载文件
const handleDownload = async (fileId: string, fileName?: string) => {
  try {
    await downloadFile(fileId, fileName)
    console.log('文件下载完成')
  } catch (error) {
    console.error('下载失败:', error)
  }
}
```

### 2.3 文件预览

```typescript
import { useFile } from '@/composables/useFile'

const { previewFile, getFilePreviewInfo } = useFile()

// 获取预览URL
const handlePreview = async (fileId: string) => {
  try {
    const previewUrl = await previewFile(fileId)

    if (previewUrl) {
      // 图片文件直接显示
      if (previewUrl.startsWith('blob:')) {
        // 本地缓存的图片
        imageUrl.value = previewUrl
      } else {
        // 在线预览URL
        previewFrameUrl.value = previewUrl
      }
    } else {
      console.log('该文件不支持预览')
    }
  } catch (error) {
    console.error('预览失败:', error)
  }
}

// 获取详细预览信息
const handleGetPreviewInfo = async (fileId: string) => {
  try {
    const info = await getFilePreviewInfo(fileId)

    console.log('文件信息:', {
      name: info.fileName,
      size: formatFileSize(info.fileSize),
      type: info.fileType,
      canPreview: info.canPreview,
      needDownload: info.needDownload
    })

    // 根据文件类型处理预览逻辑
    if (info.canPreview && !info.needDownload) {
      // 在线预览
      previewUrl.value = info.previewUrl
    } else if (info.fileType === 'image') {
      // 图片预览
      imageUrl.value = await previewFile(fileId)
    } else {
      // 需要下载或显示文件信息
      showFileInfo.value = true
    }

    return info
  } catch (error) {
    console.error('获取预览信息失败:', error)
  }
}
```

### 2.4 文件管理

```typescript
import { useFile } from '@/composables/useFile'

const { deleteFile, clearCache, getCacheStats } = useFile()

// 删除文件
const handleDeleteFile = async (fileId: string) => {
  try {
    await deleteFile(fileId)
    console.log('文件删除成功')
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 获取缓存统计
const handleGetCacheStats = () => {
  const stats = getCacheStats()

  console.log('缓存统计:', {
    imageCache: {
      count: stats.imageCache.count,
      size: formatFileSize(stats.imageCache.size),
      usage: stats.imageCache.sizeUsage
    },
    previewCache: {
      count: stats.previewCache.count,
      usage: stats.previewCache.usage
    },
    tasks: {
      activeUploads: stats.tasks.activeUploads,
      activeDownloads: stats.tasks.activeDownloads
    }
  })
}

// 清空缓存
const handleClearCache = () => {
  clearCache()
  console.log('缓存已清空')
}
```

---

## 三、文件类型判断

### 3.1 基础类型判断

```typescript
import { useFile } from '@/composables/useFile'

const { isImage, isVideo, isAudio, getFileTypeFromMimeType } = useFile()

// 检查文件类型
const checkFileType = (mimeType: string) => {
  if (isImage(mimeType)) {
    console.log('这是一个图片文件')
  } else if (isVideo(mimeType)) {
    console.log('这是一个视频文件')
  } else if (isAudio(mimeType)) {
    console.log('这是一个音频文件')
  }

  const fileType = getFileTypeFromMimeType(mimeType)
  console.log('文件类型:', fileType)
}
```

### 3.2 高级文件处理

```typescript
import { getFileType, shouldCacheFully } from '@/utils/fileUtils'

// 处理文件选择
const handleFileSelect = (files: FileList | null) => {
  if (!files) return

  Array.from(files).forEach(file => {
    const fileType = getFileType(file)
    const shouldCache = shouldCacheFully(file)

    console.log(`文件: ${file.name}`)
    console.log(`类型: ${fileType}`)
    console.log(`大小: ${formatFileSize(file.size)}`)
    console.log(`完整缓存: ${shouldCache ? '是' : '否'}`)

    // 根据文件类型进行不同处理
    switch (fileType) {
      case 'image':
        // 图片处理逻辑
        handleImageFile(file)
        break
      case 'video':
        // 视频处理逻辑
        handleVideoFile(file)
        break
      case 'audio':
        // 音频处理逻辑
        handleAudioFile(file)
        break
      default:
        // 其他文件类型
        handleOtherFile(file)
    }
  })
}
```

---

## 四、状态监听和响应式

### 4.1 监听上传任务

```typescript
import { useFile } from '@/composables/useFile'
import { computed } from 'vue'

export default defineComponent({
  setup() {
    const fileModule = useFile()

    // 监听活跃的上传任务
    const activeUploads = computed(() => fileModule.activeUploadTasks)
    const uploadTasks = computed(() => Array.from(fileModule.uploadTasks.values()))

    // 上传进度统计
    const uploadProgress = computed(() => {
      const tasks = uploadTasks.value
      if (tasks.length === 0) return 0

      const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0)
      return Math.round(totalProgress / tasks.length)
    })

    return {
      activeUploads,
      uploadTasks,
      uploadProgress
    }
  }
})
```

### 4.2 监听缓存状态

```typescript
import { useFileStore } from '@/stores/fileStore'
import { computed } from 'vue'

export default defineComponent({
  setup() {
    const fileStore = useFileStore()

    // 缓存统计
    const cacheStats = computed(() => fileStore.getCacheStats())

    // 图片缓存信息
    const imageCacheInfo = computed(() => ({
      count: fileStore.imageCacheCount,
      size: fileStore.currentImageCacheSize,
      usagePercent: (fileStore.currentImageCacheSize / 50 * 1024 * 1024 * 100).toFixed(1)
    }))

    return {
      cacheStats,
      imageCacheInfo
    }
  }
})
```

---

## 五、错误处理

### 5.1 基础错误处理

```typescript
import { useFile } from '@/composables/useFile'
import { FileUploadError, FileDownloadError } from '@/types/file'

const { uploadFile, downloadFile } = useFile()

// 上传错误处理
const handleUploadWithErrorHandling = async (file: File) => {
  try {
    const result = await uploadFile(file)
    console.log('上传成功:', result)
  } catch (error) {
    if (error instanceof FileUploadError) {
      // 处理上传特定错误
      switch (error.message) {
        case '文件大小超出限制':
          console.error('文件太大，请选择较小的文件')
          break
        case '不支持的文件类型':
          console.error('文件类型不支持')
          break
        case '未授权，请重新登录':
          // 跳转到登录页
          router.push('/login')
          break
        default:
          console.error('上传失败:', error.message)
      }
    } else {
      // 处理其他类型的错误
      console.error('未知错误:', error)
    }
  }
}
```

### 5.2 文件验证错误

```typescript
import { validateFile, FileValidationError } from '@/utils/fileUtils'

const validateFileBeforeUpload = (file: File): boolean => {
  try {
    validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image', 'document'],
      allowedMimeTypes: ['image/*', 'application/pdf']
    })

    console.log('文件验证通过')
    return true
  } catch (error) {
    if (error instanceof FileValidationError) {
      console.error('文件验证失败:', error.message)
      // 显示用户友好的错误信息
      alert(error.message)
    }
    return false
  }
}
```

---

## 六、实际应用示例

### 6.1 聊天文件消息组件

```vue
<template>
  <div class="file-message">
    <div v-if="previewInfo" class="file-info">
      <div class="file-header">
        <v-icon :color="getFileIconColor(previewInfo.fileType)">
          {{ getFileIcon(previewInfo.fileType) }}
        </v-icon>
        <span class="file-name">{{ previewInfo.fileName }}</span>
      </div>

      <div class="file-details">
        <span class="file-size">{{ formatFileSize(previewInfo.fileSize) }}</span>
        <span class="file-type">{{ getFileTypeLabel(previewInfo.fileType) }}</span>
      </div>

      <!-- 图片预览 -->
      <div v-if="previewInfo.fileType === 'image' && previewUrl" class="image-preview">
        <img :src="previewUrl" :alt="previewInfo.fileName" @click="openFullPreview" />
      </div>

      <!-- 操作按钮 -->
      <div class="file-actions">
        <v-btn
          v-if="previewInfo.canPreview"
          small
          @click="handlePreview"
        >
          预览
        </v-btn>
        <v-btn small @click="handleDownload">
          下载
        </v-btn>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploadProgress > 0" class="upload-progress">
      <v-progress-linear :value="uploadProgress" height="4" />
      <span class="progress-text">{{ uploadProgress }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFile } from '@/composables/useFile'
import type { FilePreviewInfo } from '@/types/file'

interface Props {
  fileId: string
}

const props = defineProps<Props>()

const fileModule = useFile()
const { formatFileSize, getFileTypeFromMimeType } = fileModule

const previewInfo = ref<FilePreviewInfo | null>(null)
const previewUrl = ref<string>('')
const uploadProgress = ref(0)

// 加载文件信息
const loadFileInfo = async () => {
  try {
    previewInfo.value = await fileModule.getFilePreviewInfo(props.fileId)

    if (previewInfo.value?.canPreview) {
      previewUrl.value = await fileModule.previewFile(props.fileId)
    }
  } catch (error) {
    console.error('加载文件信息失败:', error)
  }
}

// 预览文件
const handlePreview = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  } else if (previewInfo.value?.fileId) {
    fileModule.previewFile(previewInfo.value.fileId)
  }
}

// 下载文件
const handleDownload = async () => {
  try {
    await fileModule.downloadFile(props.fileId, previewInfo.value?.fileName)
  } catch (error) {
    console.error('下载失败:', error)
  }
}

// 获取文件图标
const getFileIcon = (fileType: string) => {
  const iconMap: Record<string, string> = {
    image: 'mdi-image',
    video: 'mdi-video',
    audio: 'mdi-music-note',
    document: 'mdi-file-document',
    archive: 'mdi-folder-zip',
    code: 'mdi-code-tags',
    unknown: 'mdi-file'
  }
  return iconMap[fileType] || iconMap.unknown
}

// 获取文件图标颜色
const getFileIconColor = (fileType: string) => {
  const colorMap: Record<string, string> = {
    image: 'blue',
    video: 'purple',
    audio: 'green',
    document: 'red',
    archive: 'orange',
    code: 'cyan',
    unknown: 'grey'
  }
  return colorMap[fileType] || colorMap.unknown
}

// 获取文件类型标签
const getFileTypeLabel = (fileType: string) => {
  const labelMap: Record<string, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
    document: '文档',
    archive: '压缩包',
    code: '代码',
    unknown: '文件'
  }
  return labelMap[fileType] || labelMap.unknown
}

onMounted(() => {
  loadFileInfo()
})
</script>
```

### 6.2 文件上传组件

```vue
<template>
  <div class="file-uploader">
    <input
      ref="fileInput"
      type="file"
      :multiple="allowMultiple"
      :accept="acceptTypes"
      @change="handleFileSelect"
    />

    <v-btn @click="triggerFileSelect" :loading="isUploading">
      <v-icon>mdi-upload</v-icon>
      选择文件
    </v-btn>

    <!-- 文件列表 -->
    <div v-if="files.length > 0" class="file-list">
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-info">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>

        <!-- 进度条 -->
        <v-progress-linear
          v-if="uploadProgress[index] > 0"
          :value="uploadProgress[index]"
          height="4"
        />

        <!-- 操作按钮 -->
        <div class="file-actions">
          <v-btn small icon @click="removeFile(index)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 上传按钮 -->
    <v-btn
      v-if="files.length > 0"
      color="primary"
      @click="handleUpload"
      :loading="isUploading"
    >
      上传 ({{ files.length }})
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFile } from '@/composables/useFile'

interface Props {
  allowMultiple?: boolean
  acceptTypes?: string
  maxFileSize?: number
  uploadOptions?: any
}

const props = withDefaults(defineProps<Props>(), {
  allowMultiple: false,
  acceptTypes: '*/*'
})

const emit = defineEmits<{
  uploadSuccess: [results: any[]]
  uploadError: [error: any]
}>()

const fileModule = useFile()
const { formatFileSize } = fileModule

const fileInput = ref<HTMLInputElement>()
const files = ref<File[]>([])
const uploadProgress = ref<number[]>([])
const isUploading = ref(false)

// 触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const selectedFiles = Array.from(target.files || [])

  if (props.allowMultiple) {
    files.value.push(...selectedFiles)
  } else {
    files.value = selectedFiles.slice(0, 1)
  }

  // 初始化进度
  uploadProgress.value = new Array(files.value.length).fill(0)
}

// 移除文件
const removeFile = (index: number) => {
  files.value.splice(index, 1)
  uploadProgress.value.splice(index, 1)
}

// 处理上传
const handleUpload = async () => {
  if (files.value.length === 0) return

  isUploading.value = true

  try {
    const results = await fileModule.uploadFiles(
      files.value,
      {
        ...props.uploadOptions,
        onProgress: (fileIndex: number, progress: number) => {
          uploadProgress.value[fileIndex] = progress
        }
      }
    )

    emit('uploadSuccess', results)

    // 清空文件列表
    files.value = []
    uploadProgress.value = []

    console.log(`成功上传 ${results.length} 个文件`)
  } catch (error) {
    emit('uploadError', error)
    console.error('上传失败:', error)
  } finally {
    isUploading.value = false
  }
}
</script>
```

---

## 七、最佳实践

### 7.1 性能优化建议

1. **合理设置缓存限制**
```typescript
// 根据应用需求调整缓存配置
import { useFileStore } from '@/stores/fileStore'

const fileStore = useFileStore()

// 为移动设备设置较小的缓存
fileStore.updateConfig({
  imageCache: {
    maxSize: 20 * 1024 * 1024, // 20MB
    maxFiles: 30,
    maxFileSize: 5 * 1024 * 1024  // 5MB
  }
})
```

2. **及时清理缓存**
```typescript
// 在应用卸载时清理缓存
import { onUnmounted } from 'vue'

export default defineComponent({
  setup() {
    const fileModule = useFile()

    onUnmounted(() => {
      // 可选：清理缓存释放内存
      // fileModule.clearCache()
    })

    return {}
  }
})
```

### 7.2 错误处理最佳实践

```typescript
// 统一的错误处理函数
const handleFileError = (error: any, operation: string) => {
  console.error(`${operation}失败:`, error)

  // 根据错误类型显示不同的用户提示
  if (error.message?.includes('网络')) {
    showErrorMessage('网络连接失败，请检查网络设置')
  } else if (error.message?.includes('权限')) {
    showErrorMessage('没有权限执行此操作')
  } else if (error.message?.includes('大小')) {
    showErrorMessage('文件大小超出限制')
  } else {
    showErrorMessage(`${operation}失败，请稍后重试`)
  }
}
```

### 7.3 类型安全使用

```typescript
// 使用TypeScript确保类型安全
import type { FileType, UploadOptions, FileMetadata } from '@/types/file'

const processUploadResult = (result: FileMetadata) => {
  // TypeScript会提供完整的类型提示
  console.log(`文件ID: ${result.file_id}`)
  console.log(`文件名: ${result.display_name}`)
  console.log(`文件大小: ${result.file_size}`)
  console.log(`MIME类型: ${result.mime_type}`)
  console.log(`文件类型: ${result.file_type}`)
}
```

---

## 八、常见问题

### Q: 如何处理大文件上传？

A: File模块会自动处理大文件上传，但建议：

1. 设置合适的超时时间：
```typescript
await uploadFile(file, {
  timeout: 10 * 60 * 1000 // 10分钟
})
```

2. 实现进度显示：
```typescript
await uploadFile(file, {
  onProgress: (progress) => {
    updateProgressBar(progress)
  }
})
```

### Q: 如何自定义缓存策略？

A: 可以通过FileStore修改配置：
```typescript
import { useFileStore } from '@/stores/fileStore'

const fileStore = useFileStore()

fileStore.updateConfig({
  imageCache: {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 100,
    maxFileSize: 20 * 1024 * 1024 // 20MB
  },
  previewCache: {
    maxFiles: 500
  }
})
```

### Q: 如何处理文件预览失败？

A: File模块提供了完善的错误处理，建议：
```typescript
const handlePreview = async (fileId: string) => {
  try {
    const previewUrl = await previewFile(fileId)
    if (previewUrl) {
      // 显示预览
      showPreview(previewUrl)
    } else {
      // 显示下载选项
      showDownloadOption(fileId)
    }
  } catch (error) {
    // 显示错误信息或下载选项
    showErrorMessage('预览失败，可以尝试下载文件')
    showDownloadOption(fileId)
  }
}
```

---

## 总结

File模块提供了完整的文件处理能力，包括：

✅ **智能缓存策略**：自动优化内存使用
✅ **丰富的API**：支持上传、下载、预览等操作
✅ **类型安全**：完整的TypeScript支持
✅ **错误处理**：完善的错误处理机制
✅ **性能优化**：LRU缓存、防抖更新等优化
✅ **易于使用**：简单的API设计，易于集成

通过本使用说明，您应该能够快速在项目中集成和使用File模块的各项功能。如有其他问题，请参考类型定义或源码注释。