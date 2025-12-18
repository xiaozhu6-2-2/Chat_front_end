<template>
  <div>
    <v-avatar
      :class="[avatarClass, { 'avatar-clickable': clickable }]"
      :size="size"
      :variant="variant"
      @click="handleClick"
    >
      <v-img
        v-if="avatarUrl && !imageError"
        :alt="alt"
        cover
        :src="avatarUrl"
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

  import { computed, ref } from 'vue'
  import { AvatarDefaults } from '../../types/global'

  defineOptions({
    name: 'Avatar',
  })

  const props = withDefaults(defineProps<AvatarProps>(), AvatarDefaults)

  const emit = defineEmits<{
    click: [event: MouseEvent]
  }>()

  const imageError = ref(false)

  const avatarUrl = computed(() => {
    return imageError.value ? '' : props.url
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
