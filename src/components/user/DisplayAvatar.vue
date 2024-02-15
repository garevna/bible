<template>
  <div
    class="image-container"
    :style="`width: ${size}px; height: ${size}px; align-items: ${alignImage}`"
  >
    <img ref="avatar" class="croped-centered-image" />
  </div>
</template>

<script>

export default {
  name: 'DisplayAvatar',

  props: ['avatar', 'size', 'alignImage'],

  watch: {
    avatar (data) {
      this.$refs.avatar.src = data
    }
  }
}
</script>

<style scoped>

.image-container {
  overflow: hidden;
  display: flex;
  align-items: baseline;
  border-radius: 50%;
}

.croped-centered-image {
  display: inline-block;
  width: 100%;
  height: 100%;
  -o-object-fit: cover;
  object-fit: cover;
  object-position: center center;
}
</style>
