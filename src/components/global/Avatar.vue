<template>
  <div>
    <v-avatar
      :class="[avatarClass, { 'avatar-clickable': clickable }]"
      :size="size"
      :variant="variant"
      @click="handleClick"
    >
      <v-img
        v-if="displayUrl && !imageError"
        :alt="alt"
        cover
        :src="displayUrl"
        @error="handleImageError"
      />
      <span v-else class="avatar-fallback-text">
        {{ fallbackText }}
      </span>
    </v-avatar>
    <v-badge
      v-if="showBadge"
      class="badge"
      :color="badgeColor"
      :content="badgeContent"
      :dot="badgeDot"
      :inline="badgeInline"
      :model-value="showBadge"
    />
  </div>
</template>

<script setup lang="ts">
  import type { AvatarProps } from '../../types/global'

  import { computed, onMounted, ref, watch } from 'vue'
  import { AvatarDefaults } from '../../types/global'
  import { useFile } from '../../composables/useFile'

  defineOptions({
    name: 'Avatar',
  })

  const props = withDefaults(defineProps<AvatarProps>(), AvatarDefaults)

  const emit = defineEmits<{
    click: [event: MouseEvent]
  }>()

  const imageError = ref(false)
  const displayUrl = ref<string>('')

  // 文件模块
  const { previewFile } = useFile()

  /**
   * 加载头像 URL
   * 如果 url 是 fileId，使用文件模块获取实际 URL
   * 如果 url 已经是完整 URL（如 http:// 或 blob:），直接使用
   * 如果 url 是本地资源路径（如 /src/assets/），直接使用
   */
  const loadAvatarUrl = async () => {
    if (!props.url) {
      displayUrl.value = ''
      return
    }

    imageError.value = false

    // 检查是否是完整的 URL（http://, https://, blob:, data:）
    if (/^(https?:|blob:|data:)/.test(props.url)) {
      displayUrl.value = props.url
      return
    }

    // 检查是否是本地资源路径（以 /src/assets/ 或 /assets/ 开头）
    if (props.url.startsWith('/src/assets/') || props.url.startsWith('/assets/') || props.url.startsWith('@/assets/')) {
      // 本地资源路径，直接使用（Vite 会处理）
      displayUrl.value = props.url
      return
    }

    // 否则假设是 fileId，使用文件模块加载
    try {
      const url = await previewFile(props.url)
      displayUrl.value = url || ''
    } catch (error) {
      // 如果加载失败，显示默认头像（使用名字首字母）
      displayUrl.value = ''
    }
  }

  // 监听 url 变化
  watch(() => props.url, () => {
    loadAvatarUrl()
  })

  // 组件挂载时加载
  onMounted(() => {
    loadAvatarUrl()
  })

  const fallbackText = computed(() => {
    if (props.name) {
      // 取名字的前1-2个字符作为头像显示
      return props.name.slice(0, 2).toUpperCase()
    }
  // return props.alt.slice(0, 2).toUpperCase()
  })

  function handleImageError () {
    imageError.value = true
  }

  function handleClick (event: MouseEvent) {
    if (props.clickable) {
      emit('click', event)
    }
  }
</script>

<style scoped>
.avatar-clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-clickable:hover {
  transform: scale(1.05);
}

.avatar-fallback-text {
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 继承原有的custom-avatar样式 - 统一为圆角 */
.custom-avatar {
  border-radius: 8px !important;
  overflow: hidden;
}

.profile-avatar{
  border-radius: 8px !important;
  overflow: hidden;
}

.badge{
  position: relative;
  top: -24px;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .avatar-clickable:hover {
    transform: none;
  }

  .avatar-clickable:active {
    transform: scale(0.95);
  }
}
</style>
