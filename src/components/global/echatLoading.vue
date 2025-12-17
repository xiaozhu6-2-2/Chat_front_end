<!-- components/GlobalLoading.vue -->
<template>
  <v-overlay
    class="align-center justify-center"
    :model-value="loadingStore.isLoading"
    persistent
    scrim="rgba(0, 0, 0, 0.7)"
  >
    <div class="text-center">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
        width="4"
      />
      <div class="mt-4 text-h6 white--text">
        {{ loadingStore.loadingMessage }}
      </div>
    </div>
  </v-overlay>
</template>

  <script setup lang="ts">
  import { useLoadingStore } from '@/stores/loadingStore'

  const loadingStore = useLoadingStore()
  </script>
