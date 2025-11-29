<!-- components/GlobalLoading.vue -->
<template>
    <v-overlay
      :model-value="loadingStore.isLoading"
      class="align-center justify-center"
      persistent
      scrim="rgba(0, 0, 0, 0.7)"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          width="4"
        ></v-progress-circular>
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