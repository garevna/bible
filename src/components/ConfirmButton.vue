<template>
  <v-menu v-model="open" location="end">
    <template #activator="{ props: menu }">
      <v-tooltip :text="text" location="top">
        <template #activator="{ props: tooltip }">
          <v-btn
            v-bind="{ ...menu, ...tooltip }"
            :icon="icon"
            size="small"
            variant="text"
            color="delete"
            class="delete-icon"
            @click.stop
          />
        </template>
      </v-tooltip>
    </template>

    <v-card color="homefone" elevation="4" class="pa-2">
      <v-btn color="delete" variant="tonal" size="small" prepend-icon="mdi-check" @click="confirm">
        {{ text || 'OK' }}
      </v-btn>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/** Destructive action that asks for a second click before it runs */
withDefaults(defineProps<{ icon?: string; text?: string }>(), { icon: '$delete', text: '' })

const emit = defineEmits<{ confirm: [] }>()

const open = ref(false)

function confirm() {
  open.value = false
  emit('confirm')
}
</script>
