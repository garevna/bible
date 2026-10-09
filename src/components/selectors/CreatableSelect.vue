<template>
  <v-autocomplete
    v-model="selected"
    v-model:search="search"
    v-model:menu="menu"
    :items="items"
    :item-title="itemTitle"
    :item-value="itemValue"
    :return-object="returnObject"
    :label="label"
    :prepend-inner-icon="icon"
    variant="outlined"
    density="compact"
    clearable
    hide-details
    @keydown.enter.prevent="pending && create()"
  >
    <template #append-inner>
      <v-tooltip v-if="pending" :text="createText(pending)" location="top">
        <template #activator="{ props: tooltip }">
          <v-btn
            v-bind="tooltip"
            icon="mdi-plus"
            size="x-small"
            color="buttons"
            variant="flat"
            :aria-label="createText(pending)"
            @click.stop="create"
          />
        </template>
      </v-tooltip>
    </template>

    <template #no-data>
      <v-list-item v-if="pending" prepend-icon="mdi-plus" :title="createText(pending)" @click="create" />
      <v-list-item v-else :title="noDataText" disabled />
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts" generic="T">
import { computed, nextTick, ref, watch } from 'vue'

/**
 * Autocomplete that can also create the typed value.
 * `pending` is the typed text that matches no item exactly: the "+" button, the list item,
 * Enter, or the parent (e.g. its OK button) can create it.
 */
const props = withDefaults(
  defineProps<{
    items: T[]
    itemTitle?: string
    itemValue?: string
    returnObject?: boolean
    label: string
    noDataText: string
    icon: string
    /** 'Add keyword «love»' */
    createText: (name: string) => string
    /** title of an item, to find an exact match */
    titleOf: (item: T) => string
    /** false: only existing items can be chosen (e.g. for filters) */
    creatable?: boolean
  }>(),
  { itemTitle: undefined, itemValue: undefined, returnObject: false, creatable: true }
)

const emit = defineEmits<{ search: [text: string]; create: [name: string] }>()

const selected = defineModel<T | null>({ default: null })
const pending = defineModel<string>('pending', { default: '' })

const search = ref('')
const menu = ref(false)

const typed = computed(() => search.value?.trim() ?? '')

const exists = (name: string) =>
  !props.creatable || props.items.some((item) => props.titleOf(item).toLowerCase() === name.toLowerCase())

watch(search, (value) => {
  const text = value?.trim() ?? ''
  // the autocomplete clears the search on blur: keep what was typed until something is chosen
  if (text) pending.value = exists(text) ? '' : text
  text && emit('search', text)
})

watch(
  () => props.items,
  () => typed.value && (pending.value = exists(typed.value) ? '' : typed.value)
)

watch(selected, (value) => value && (pending.value = ''))

async function create() {
  const name = pending.value
  if (!name) return
  emit('create', name)
  pending.value = ''
  ;(document.activeElement as HTMLElement | null)?.blur()
  await nextTick()
  menu.value = false
}
</script>
