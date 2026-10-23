<template>
  <div class="transfer" :class="{ 'transfer--stacked': stacked }">
    <!-- the options on the left -->
    <div class="column">
      <p class="label">{{ leftLabel ?? text.available }} ({{ left.length }})</p>
      <v-text-field
        v-if="searchable && items.length > 8"
        v-model="search"
        :placeholder="text.search"
        prepend-inner-icon="$search"
        density="compact"
        hide-details
        clearable
        class="mb-1"
      />
      <v-list density="compact" class="items" :aria-label="leftLabel ?? text.available">
        <v-list-item
          v-for="item of shownLeft"
          :key="item.value"
          :title="item.title"
          :subtitle="item.subtitle"
          :active="chosen?.side === 'left' && chosen.value === item.value"
          color="secondary"
          :disabled="disabled || item.disabled"
          @click="choose('left', item.value)"
        />
        <p v-if="!left.length" class="empty">{{ emptyLeft ?? text.nothing }}</p>
      </v-list>
    </div>

    <!-- one arrow at a time: the one of the side an item is chosen on -->
    <div class="arrows">
      <v-btn
        :icon="stacked ? 'mdi-arrow-down-bold-circle-outline' : 'mdi-arrow-right-bold-circle-outline'"
        variant="text"
        color="secondary"
        :aria-label="rightAction ?? text.moveRight"
        :title="rightAction ?? text.moveRight"
        :disabled="disabled || chosen?.side !== 'left'"
        @click="move('right')"
      />
      <v-btn
        :icon="stacked ? 'mdi-arrow-up-bold-circle-outline' : 'mdi-arrow-left-bold-circle-outline'"
        variant="text"
        color="secondary"
        :aria-label="leftAction ?? text.moveLeft"
        :title="leftAction ?? text.moveLeft"
        :disabled="disabled || chosen?.side !== 'right' || !removable(chosen.value)"
        @click="move('left')"
      />
    </div>

    <!-- the chosen ones on the right -->
    <div class="column">
      <p class="label">
        {{ rightLabel }} ({{ right.length }}<template v-if="limit"> / {{ limit }}</template
        >)
      </p>
      <v-list density="compact" class="items" :aria-label="rightLabel">
        <v-list-item
          v-for="item of right"
          :key="item.value"
          :title="item.title"
          :subtitle="item.subtitle"
          :active="chosen?.side === 'right' && chosen.value === item.value"
          color="secondary"
          :disabled="disabled"
          @click="choose('right', item.value)"
        >
          <template v-if="$slots.append" #append>
            <slot name="append" :item="item" />
          </template>
        </v-list-item>
        <p v-if="!right.length" class="empty">{{ emptyRight ?? text.nothing }}</p>
      </v-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import { useLanguageStore } from '@/stores/language'

export interface TransferItem {
  value: string
  title: string
  subtitle?: string
  /** not to be chosen (the subtitle says why) */
  disabled?: boolean
}

/**
 * Choosing several of a list: the options on the left, the chosen ones on the right. An item is chosen
 * by a click on one side only; the arrow of that side moves it (the other arrow stays off). On a phone
 * the lists are one above the other. v-model: the values on the right; move: the value moved and where
 * (for the lists that move by a request, as the people of an event).
 */
const props = withDefaults(
  defineProps<{
    items: TransferItem[]
    leftLabel?: string
    rightLabel: string
    emptyLeft?: string
    emptyRight?: string
    /** how many may be chosen (shown with the number) */
    limit?: number
    searchable?: boolean
    disabled?: boolean
    /** an item on the right that may not go back (e.g. a person who answered) */
    keep?: (value: string) => boolean
    /** the words of the arrows, when they say more than "add" and "remove" */
    rightAction?: string
    leftAction?: string
  }>(),
  {
    leftLabel: undefined,
    emptyLeft: undefined,
    emptyRight: undefined,
    limit: undefined,
    searchable: true,
    keep: undefined,
    rightAction: undefined,
    leftAction: undefined
  }
)
const model = defineModel<string[]>({ default: () => [] })
const emit = defineEmits<{ move: [value: string, to: 'left' | 'right'] }>()

const { common: text } = storeToRefs(useLanguageStore())
const { smAndDown: stacked } = useDisplay()

const chosen = ref<{ side: 'left' | 'right'; value: string } | null>(null)
const search = ref('')

const left = computed(() => props.items.filter((item) => !model.value.includes(item.value)))
const right = computed(() =>
  model.value.map((value) => props.items.find((item) => item.value === value) ?? { value, title: value })
)
const shownLeft = computed(() => {
  const words = (search.value ?? '').trim().toLowerCase()
  return words
    ? left.value.filter((item) => `${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(words))
    : left.value
})

const removable = (value: string) => !props.keep?.(value)

/** a click chooses on one side; a click on the chosen one lets it go */
function choose(side: 'left' | 'right', value: string) {
  chosen.value = chosen.value?.side === side && chosen.value.value === value ? null : { side, value }
}

function move(to: 'left' | 'right') {
  const value = chosen.value?.value
  if (!value) return
  model.value = to === 'right' ? [...model.value, value] : model.value.filter((item) => item !== value)
  emit('move', value, to)
  chosen.value = null
}
</script>

<style scoped>
.transfer {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.transfer--stacked {
  flex-direction: column;
}

.column {
  flex: 1 1 0;
  min-width: 0;
}

.items {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  min-height: 120px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--app-surface);
}

.arrows {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.transfer--stacked .arrows {
  flex-direction: row;
  justify-content: center;
}

.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  padding: 8px 16px;
  margin: 0;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0 0 4px;
}
</style>
