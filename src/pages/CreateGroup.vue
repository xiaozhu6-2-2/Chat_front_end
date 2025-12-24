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

          <!-- 群头像 -->
          <v-file-input
            v-model="avatarFile"
            accept="image/*"
            class="mb-4"
            hint="支持 jpg、png 格式，大小不超过 2MB"
            label="群头像（可选）"
            persistent-hint
            prepend-inner-icon="mdi-camera"
            show-size
            variant="outlined"
          />

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
  import { reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useGroup } from '../composables/useGroup'

  const router = useRouter()
  const { createGroup: createGroupAPI } = useGroup()

  // 表单状态
  const form = ref()
  const formValid = ref(false)
  const creating = ref(false)
  const avatarFile = ref<File[]>([])

  // 群组数据
  const groupData = reactive<CreateGroupParams>({
    group_name: '',
    avatar: '',
    group_intro: '',
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

  // 重置表单
  function resetForm () {
    form.value?.reset()
    avatarFile.value = []
    Object.assign(groupData, {
      group_name: '',
      group_intro: '',
    })
  }

  // 创建群聊
  async function handleCreateGroup () {
    if (!form.value?.validate()) {
      return
    }

    creating.value = true
    try {
      // 处理头像上传（如果有）
      let avatarUrl = ''
      if (avatarFile.value.length > 0) {
        // TODO: 实现头像上传逻辑
        // 这里应该调用上传API，获取头像URL
        console.log('头像上传功能待实现')
      }

      const params: CreateGroupParams = {
        group_name: groupData.group_name,
        group_intro: groupData.group_intro || undefined,
        avatar: avatarUrl || undefined,
      }

      const group = await createGroupAPI(params)
      if (group) {
        // 创建成功，返回联系人列表
        router.push('/contact')
      }
    } catch (error) {
      console.error('创建群聊失败:', error)
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
</style>
