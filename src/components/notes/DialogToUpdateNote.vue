<template>
  <span>
    <v-tooltip top>
      <template v-slot:activator="{ on, attrs }">
        <v-icon
          :small="small"
          :color="color"
          v-bind="attrs"
          v-on="on"
          class="mx-2"
          @click.stop="dialog = true"
        >
          {{ icon }}
        </v-icon>
      </template>

      <span> {{ tooltipText || _notes.editNoteTooltip }} </span>
    </v-tooltip>

    <!-- <v-dialog v-model="dialog" max-width="960">
      <v-card flat class="homefone pa-4">
        <v-toolbar flat dense class="transparent ma-0 pa-0" height="48">
          <v-spacer />
          <v-icon large @click="dialog = false">
            $close
          </v-icon>
        </v-toolbar> -->

        <UpdateNote :dialog.sync="local" />

      <!-- </v-card>
    </v-dialog> -->
  </span>
</template>

<script>

import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'DialogToUpdateNote',

  components: {
    // ButtonFabTooltipImage: () => import('@/components/ButtonFabTooltipImage.vue'),
    UpdateNote: () => import('@/components/notes/UpdateNote.vue')
  },

  props: {
    note: { type: Object, required: true },
    icon: { default: '$editNote' },
    color: { default: 'buttons' },
    fab: { default: false },
    small: { default: false },
    large: { default: false },
    tooltipText: { required: false }
  },

  data: () => ({
    dialog: false
  }),

  computed: {
    ...mapGetters('language', ['_notes']),
    local: {
      get () {
        return this.dialog
      },
      set (val) {
        console.log('DIALOG TO UPDATE NOTE COMPONENT: local = ', val)
        this.dialog = val
      }
    }
  },

  watch: {
    dialog (val) {
      console.log('DIALOG TO UPDATE NOTE COMPONENT: dialog = ', val)
      val ? this.setCurrentNote(this.note) : this.resetCurrentNote()
    }
  },

  methods: {
    ...mapActions('notes', ['setCurrentNote', 'resetCurrentNote'])
  }
}
</script>
