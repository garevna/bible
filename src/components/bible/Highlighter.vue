<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <path :class="color" :d="markerPath" />
  </svg>
</template>

<script setup lang="ts">
export type HighlighterColor = 'magenta' | 'yellow' | 'cyan' | 'green'

defineProps<{ color: HighlighterColor }>()
</script>

<script lang="ts">
export const markerPath =
  'M4,17L6.75,14.25L6.72,14.23C6.14,13.64 6.14,12.69 6.72,12.11L11.46,7.37L15.7,11.61L10.96,16.35C10.39,16.93 9.46,16.93 8.87,16.37L8.24,17H4M15.91,2.91C16.5,2.33 17.45,2.33 18.03,2.91L20.16,5.03C20.74,5.62 20.74,6.57 20.16,7.16L16.86,10.45L12.62,6.21L15.91,2.91Z'

/** Background applied to the highlighted text */
export const highlightColors: Record<HighlighterColor, string> = {
  magenta: '#f0f7',
  cyan: '#0ff5',
  yellow: '#ff07',
  green: '#0907'
}

/** stroke / fill of the cursor image (url-encoded) */
const cursorStyles: Record<HighlighterColor, string> = {
  magenta: 'stroke: %23f0f; fill: %23f0f7;',
  cyan: 'stroke: %2309b; fill: %230ff8;',
  yellow: 'stroke: %23fa0; fill: %23fa07;',
  green: 'stroke: %23090; fill: %230907;'
}

export const cursorFor = (color: HighlighterColor, template: string) =>
  template.split('•••').join(cursorStyles[color])
</script>

<style scoped>
path {
  cursor: pointer;
}

.magenta {
  stroke: #f0f;
  fill: #f0f8;
}

.yellow {
  stroke: #fa0;
  fill: #ff08;
}

.cyan {
  stroke: #09b;
  fill: #0ff5;
}

.green {
  stroke: #090;
  fill: #0907;
}
</style>
