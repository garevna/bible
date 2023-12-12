<template>
  <span>
    <ButtonTooltip
      v-if="!dialog"
      :icon='icon'
      :fab="fab"
      :text="tooltipText"
      :small="small"
      :large="large"
      :clicked.sync="dialog"
    />
    <v-dialog v-model="dialog" max-width="960">
      <v-card flat class="homefone pa-4" v-if="dialog">
        <v-toolbar flat dense class="transparent ma-0 pa-0" height="48">
          <v-spacer />
          <v-icon large @click="dialog = false">
            $close
          </v-icon>
        </v-toolbar>

        <UpdateNote
          :note.sync="local"
          :dialog.sync="dialog"
        />

      </v-card>
    </v-dialog>
  </span>
</template>

<script>

import { menuItems } from '@/configs'

export default {
  name: 'AddNote',

  components: {
    ButtonTooltip: () => import('@/components/ButtonTooltip.vue'),
    UpdateNote: () => import('@/components/UpdateNote.vue')
  },

  props: {
    note: {
      type: Object,
      required: true
    },

    icon: {
      default: menuItems[3].icon
    },

    fab: {
      default: false
    },

    small: {
      default: false
    },

    large: {
      default: false
    },

    tooltipText: {
      default: menuItems[3].text
    }
  },

  data: () => ({
    dialog: false,
    topics: []
  }),

  computed: {
    local: {
      get () {
        return this.note
      },
      set (data) {
        console.log('EDIT NOTE:\n', data)
        const note = JSON.parse(JSON.stringify(data))
        this.$emit('update:note', note)
        this.$root.$emit('note-updated', note)
      }
    }
  },

  watch: {
    dialog (val) {
      console.log('DIALOG: ', val)
    }
  }
}
</script>
