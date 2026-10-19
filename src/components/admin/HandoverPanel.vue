<template>
  <div class="handover">
    <p class="label">{{ text.handoverTitle }}</p>

    <!-- handed over: waiting for the deputy, or the deputy has the duties -->
    <div v-if="handover" class="d-flex flex-wrap align-center ga-2">
      <v-chip
        :color="handover.status === 'accepted' ? 'primary' : 'calendar-orange'"
        variant="tonal"
        size="small"
      >
        {{
          format(handover.status === 'accepted' ? text.handoverActing : text.handoverPending, {
            name: nameOf(handover.toUid)
          })
        }}
        <template v-if="handover.until"
          >&nbsp;{{ format(text.handoverUntilDay, { day: dayText(handover.until) }) }}</template
        >
      </v-chip>
      <v-btn
        variant="text"
        color="secondary"
        size="small"
        class="text-none"
        prepend-icon="mdi-undo"
        :disabled="disabled"
        @click="emit('end')"
      >
        {{ handover.status === 'accepted' ? text.handoverEnd : text.handoverCancel }}
      </v-btn>
    </div>

    <!-- the leader (or an administrator) asks a deputy -->
    <template v-else>
      <p v-if="!deputies.length" class="hint">{{ text.handoverNoDeputies }}</p>
      <div v-else class="d-flex flex-wrap align-center ga-2">
        <v-select
          v-model="toUid"
          :items="deputies"
          item-title="name"
          item-value="uid"
          :label="text.handoverTo"
          density="compact"
          hide-details
          class="field"
        />
        <DateField
          v-model="until"
          :label="text.handoverUntil"
          clearable
          density="compact"
          hide-details
          class="field"
        />
        <v-btn
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-account-switch-outline"
          :disabled="disabled || !toUid"
          @click="emit('ask', toUid!, until)"
        >
          {{ text.handoverAsk }}
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import DateField from '@/components/DateField.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import type { Handover, MinistryRole } from '@/stores/worker'
import { fullDateFormat, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'

/**
 * The duties of the leader of a ministry: handed over to a deputy (who accepts them first), or given
 * back. For the leader in "My ministries", and for the administrators in the ministries.
 */
const props = defineProps<{
  roles: MinistryRole[]
  handover: Handover | null
  people: { uid: string; name: string }[]
  disabled?: boolean
}>()
const emit = defineEmits<{ ask: [toUid: string, until: string | null]; end: [] }>()

const user = useUserStore()
const { admin: text } = storeToRefs(useLanguageStore())

const toUid = ref<string | null>(null)
const until = ref<string | null>(null)

const nameOf = (uid: string) => props.people.find((person) => person.uid === uid)?.name ?? uid

/** the deputies of the leader (not a leader themselves) */
const deputies = computed(() => {
  const leaders = props.roles.filter((role) => role.lead).flatMap((role) => role.uids)
  const uids = [...new Set(props.roles.filter((role) => role.deputy).flatMap((role) => role.uids))]
  return uids.filter((uid) => !leaders.includes(uid)).map((uid) => ({ uid, name: nameOf(uid) }))
})

const dayText = (day: string) => fullDateFormat(new Date(`${day}T12:00:00`), localeOf(user.lang))
</script>

<style scoped>
.handover {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-weight: 600;
}

.hint {
  color: var(--app-text-muted);
  font-size: 13px;
}

.field {
  flex: 1 1 200px;
  max-width: 280px;
}
</style>
