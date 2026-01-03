<template>
  <v-list class="transparent" density="compact">
    <v-list-item
      v-for="feature in displayFeatures"
      :key="feature.text"
      class="text-white"
      :prepend-icon="feature.icon"
    >
      <v-list-item-title class="text-body-2">
        {{ feature.text }}
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  // 定义功能项接口
  interface FeatureItem {
    icon: string
    text: string
  }

  // Props 定义
  interface Props {
    features?: FeatureItem[]
  }

  const props = withDefaults(defineProps<Props>(), {
    features: () => [],
  })

  // 默认功能列表
  const defaultFeatures: FeatureItem[] = [
    { icon: 'mdi-flash', text: '轻量快捷聊天' },
    { icon: 'mdi-rocket-launch', text: '极速消息传递' },
    { icon: 'mdi-group', text: '多人群组聊天' },
    { icon: 'mdi-cloud', text: '云端消息同步' },
  ]

  // 计算属性：显示的功能列表
  const displayFeatures = computed(() => {
    return props.features.length > 0 ? props.features : defaultFeatures
  })
</script>

<style scoped>
/* 特色功能列表组件样式 */
</style>
