<template>
  <v-dialog v-model="modelValue" max-width="400">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-tag" />
        设置好友标签
      </v-card-title>

      <v-card-text>
        <p class="mb-4 text-body-2">
          为好友设置标签，方便您分类管理
        </p>

        <v-text-field
          v-model="currentTag"
          clearable
          counter="10"
          label="标签名称"
          placeholder="输入标签名称"
          :rules="tagRules"
          variant="outlined"
        />

        <v-btn
          v-if="currentTag && !recentTags.includes(currentTag)"
          class="mb-3"
          color="primary"
          size="small"
          variant="text"
          @click="saveTag"
        >
          <v-icon class="mr-1" icon="mdi-plus" />
          保存为新标签
        </v-btn>

        <div v-if="recentTags.length > 0" class="mt-3">
          <p class="text-caption text-grey-darken-1 mb-2">最近使用的标签：</p>
          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="tag in recentTags"
              :key="tag"
              clickable
              :color="getTagColor(tag)"
              size="small"
              variant="tonal"
              @click="selectTag(tag)"
            >
              {{ tag }}
            </v-chip>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!selectedTag && !currentTag"
          @click="confirmTag"
        >
          确定
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '@/service/messageTypes'
  import { computed, ref, watch } from 'vue'

  // Props & Emits
  interface Props {
    modelValue: boolean
    friend: FriendWithUserInfo
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'tag-updated', friendId: string, tag: string | null): void
  }>()

  // Data
  const currentTag = ref('')
  const selectedTag = ref('')
  const recentTags = ref<string[]>(['同事', '家人', '同学', '朋友'])

  // Tag validation rules
  const tagRules = [
    (v: string) => !v || v.length <= 10 || '标签长度不能超过10个字符',
    (v: string) => !v || /^[\u4E00-\u9FA5a-zA-Z0-9\s]+$/.test(v) || '标签只能包含中文、英文、数字和空格',
  ]

  // Computed
  const modelValue = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  })

  // Methods
  function getTagColor (tag: string): string {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'purple', 'indigo', 'teal']
    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  function selectTag (tag: string) {
    selectedTag.value = tag
    currentTag.value = tag
  }

  function saveTag () {
    if (currentTag.value && !recentTags.value.includes(currentTag.value)) {
      recentTags.value.unshift(currentTag.value)
      // 最多保存10个最近标签
      if (recentTags.value.length > 10) {
        recentTags.value = recentTags.value.slice(0, 10)
      }
      selectedTag.value = currentTag.value
    }
  }

  function confirmTag () {
    const finalTag = selectedTag.value || currentTag.value
    emit('tag-updated', props.friend.fid, finalTag || null)
    closeDialog()
  }

  function closeDialog () {
    modelValue.value = false
    // 重置状态
    currentTag.value = ''
    selectedTag.value = ''
  }

  // Watch dialog opening to set initial tag
  watch(() => props.modelValue, newValue => {
    if (newValue) {
      currentTag.value = props.friend.tag || ''
      selectedTag.value = props.friend.tag || ''
    }
  })
</script>

<style scoped>
.v-chip {
  transition: all 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-1px);
}
</style>
