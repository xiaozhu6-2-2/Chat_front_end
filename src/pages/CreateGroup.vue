<template>
  <v-container class="pa-4 pa-5" fluid>
    <v-card variant="elevated">
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-account-group" />
        创建群聊
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="formValid">
          <!-- 群名称 -->
          <v-text-field
            v-model="groupData.group_name"
            class="mb-4"
            counter="20"
            label="群名称"
            prepend-inner-icon="mdi-account-group"
            :rules="nameRules"
            variant="outlined"
          />

          <!-- 群头像预览和上传 -->
          <div class="mb-4">
            <div class="avatar-upload-container">
              <!-- 头像预览 -->
              <div class="avatar-preview">
                <Avatar
                  v-if="previewAvatarUrl"
                  :name="groupData.group_name || '群聊'"
                  :size="100"
                  :url="previewAvatarUrl"
                />
                <v-icon v-else icon="mdi-account-group" size="80" />
              </div>

              <!-- 上传按钮和文件输入 -->
              <div class="avatar-upload-controls">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-upload"
                  variant="outlined"
                  @click="triggerFileInput"
                >
                  {{ avatarFile ? '更换头像' : '上传头像' }}
                </v-btn>
                <v-btn
                  v-if="avatarFile || previewAvatarUrl"
                  class="ml-2"
                  color="error"
                  prepend-icon="mdi-delete"
                  variant="text"
                  @click="removeAvatar"
                >
                  移除
                </v-btn>
                <input
                  ref="fileInput"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  class="d-none"
                  type="file"
                  @change="handleFileChange"
                />
              </div>
            </div>
            <div class="text-caption text-grey mt-2">
              支持 jpg、png、gif、webp 格式，大小不超过 2MB
            </div>
          </div>

          <!-- 群介绍 -->
          <v-textarea
            v-model="groupData.group_intro"
            class="mb-4"
            counter="100"
            hint="让其他人了解这个群聊的目的"
            label="群介绍（可选）"
            persistent-hint
            prepend-inner-icon="mdi-text"
            rows="3"
            :rules="introRules"
            variant="outlined"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="outlined" @click="resetForm">重置</v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid"
          :loading="creating"
          @click="handleCreateGroup"
        >
          创建群聊
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import type { CreateGroupParams } from '../types/group'
  import { computed, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import Avatar from '../components/global/Avatar.vue'
  import { useGroup } from '../composables/useGroup'
  import { useFile } from '../composables/useFile'

  const router = useRouter()
  const { createGroup: createGroupAPI } = useGroup()
  const { uploadFile } = useFile()

  // 表单状态
  const form = ref()
  const formValid = ref(false)
  const creating = ref(false)
  const fileInput = ref<HTMLInputElement>()
  const avatarFile = ref<File | null>(null)
  const uploadedAvatarFileId = ref<string>('')

  // 群组数据
  const groupData = reactive<CreateGroupParams>({
    group_name: '',
    avatar: '',
    group_intro: '',
  })

  // 头像预览URL
  const previewAvatarUrl = computed(() => {
    if (uploadedAvatarFileId.value) {
      // 使用上传后的文件ID生成预览URL
      return `${import.meta.env.VITE_API_BASE_URL}/auth/file/preview/${uploadedAvatarFileId.value}`
    }
    if (avatarFile.value) {
      // 使用本地文件预览
      return URL.createObjectURL(avatarFile.value)
    }
    return ''
  })

  // 验证规则
  const nameRules = [
    (v: string) => !!v || '请输入群名称',
    (v: string) => (v && v.length >= 2) || '群名称至少需要2个字符',
    (v: string) => (v && v.length <= 20) || '群名称不能超过20个字符',
  ]

  const introRules = [
    (v: string) => !v || v.length <= 100 || '群介绍不能超过100个字符',
  ]

  // 触发文件选择
  function triggerFileInput () {
    fileInput.value?.click()
  }

  // 处理文件选择
  function handleFileChange (event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
      return
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      // 显示错误提示（可以在这里添加 snackbar）
      console.error('不支持的文件类型')
      return
    }

    // 验证文件大小（2MB）
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      console.error('文件大小超过2MB')
      return
    }

    // 保存文件引用
    avatarFile.value = file
    // 清空之前上传的文件ID
    uploadedAvatarFileId.value = ''
  }

  // 移除头像
  function removeAvatar () {
    avatarFile.value = null
    uploadedAvatarFileId.value = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  // 重置表单
  function resetForm () {
    form.value?.reset()
    removeAvatar()
    Object.assign(groupData, {
      group_name: '',
      group_intro: '',
      avatar: '',
    })
  }

  // 创建群聊
  async function handleCreateGroup () {
    if (!form.value?.validate()) {
      return
    }

    creating.value = true
    try {
      // 1. 如果有新选择的头像文件，先上传
      let avatarFileId = ''
      if (avatarFile.value && !uploadedAvatarFileId.value) {
        const uploadResult = await uploadFile(avatarFile.value, {
          fileType: 'image',
          fileName: `group_avatar_${Date.now()}`,
        })
        avatarFileId = uploadResult.file_id
        uploadedAvatarFileId.value = avatarFileId
      } else if (uploadedAvatarFileId.value) {
        avatarFileId = uploadedAvatarFileId.value
      }

      // 2. 创建群聊
      const params: CreateGroupParams = {
        group_name: groupData.group_name,
        group_intro: groupData.group_intro || undefined,
        avatar: avatarFileId || undefined,
      }

      const group = await createGroupAPI(params)
      if (group) {
        // 创建成功，返回联系人列表
        router.push('/contact')
      }
    } catch (error) {
      console.error('创建群聊失败:', error)
      // 这里可以显示错误提示
    } finally {
      creating.value = false
    }
  }
</script>

<style scoped>
.v-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.v-card {
  width: 100%;
  max-width: 600px;
  margin: 20px;
}

.avatar-upload-container {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.avatar-preview {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f5f5f5;
}

.avatar-upload-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
