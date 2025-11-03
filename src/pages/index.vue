<template>
  <div class="d-flex justify-center align-center opacity-20" style="height: 100%;">
    <v-img
      :width="100"
      aspect-ratio="1/1"
      src="@/assets/echatlogo.png"
      class="fixed-size-image"
    ></v-img>
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