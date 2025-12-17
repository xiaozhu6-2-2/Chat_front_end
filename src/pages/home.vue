<template>
  <div class="d-flex justify-center align-center opacity-20" style="height: 100%;">
    <v-img
      aspect-ratio="1/1"
      class="fixed-size-image"
      src="@/assets/echatlogo.png"
      :width="100"
    />
  </div>
</template>

<script lang="ts" setup>
//
</script>

<style scoped>
.fixed-size-image {
  flex: none !important; /* 防止图片在flex容器中拉伸 */
}
</style>
