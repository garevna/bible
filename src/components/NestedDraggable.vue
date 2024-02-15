<template>
  <draggable
    :list="elements"
    v-bind="dragOptions"
    :move="checkMove"
    id="container"
    @end="endDrag($event)"
  >
    <div
      v-for="element in elements"
      :key="element._id"
      class="draggable-item"
      :id="element.type + '_' + element._id"
      @end="endDrag(element)"
    >
      <v-row v-if="show" class="my-1">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon color="buttons" v-bind="attrs" v-on="on">
              $drag
            </v-icon>
          </template>
          <span> {{ _nestedDraggable.dragTooltip }} </span>
        </v-tooltip>

        <v-spacer />

        <DialogToUpdateNote
          v-if="element.type === 'note'"
          :note.sync="element"
          icon="$editNote"
          :small="false"
          :tooltipText="_nestedDraggable.editNoteTooltip"
        />

        <v-tooltip
          v-else
          bottom
          color="warning"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-icon
              color="delete"
              class="delete-icon"
              v-bind="attrs"
              v-on="on"
              @click.stop="$emit('update:removed', element)"
            >
              {{ removeIcon }}
            </v-icon>
          </template>
          <span> {{ _nestedDraggable.removeFromNoteTooltip }} </span>
        </v-tooltip>
      </v-row>

      <p
        v-html="element.text || element.html"
        @click="element.type === 'verse' ? $root.$gotoVerse(element._id) : null"
      />

      <nested-draggable
        v-if="element.type === 'note'"
        class="ml-3 ml-sm-5 ml-md-12"
        :elements="element.verses || []"
        :id="element.type + '.' + element._id"
        :show="show"
        :removed.sync="nestedRemoved"
        @end="endDrag(element)"
      />

      <v-row v-if="show && element.type === 'note'" class="my-2 px-2">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon
              color="delete"
              class="delete-icon"
              v-bind="attrs"
              v-on="on"
              @click.stop="$emit('update:removed', element)"
            >
              {{ removeIcon }}
            </v-icon>
          </template>
          <span> {{ _nestedDraggable.removeFromTopicTooltip }} </span>
        </v-tooltip>

        <v-spacer />

        <v-chip
          small
          v-for="(keyword, index) of element.keywords"
          :key="index"
          color="#bbb"
          dark
          class="my-1 mr-1"
        >
          #{{ keyword }}
        </v-chip>
      </v-row>
    </div>
  </draggable>
</template>

<script>

import '@/sass/drag.css'
import '@/sass/delete.css'

import draggable from 'vuedraggable'

import { mapGetters, mapActions } from 'vuex'

const valid = {
  verse: ['container', 'note'],
  note: ['container']
}

export default {
  name: 'nested-draggable',

  components: {
    draggable,
    DialogToUpdateNote: () => import('@/components/notes/DialogToUpdateNote.vue')
  },

  props: {
    elements: { required: true, type: Array },
    static: { default: false },
    modified: { default: false },
    removed: { required: true },
    show: { default: true }
  },

  data: () => ({
    edit: null,
    nestedRemoved: null
  }),

  computed: {
    ...mapGetters('language', ['_nestedDraggable']),
    dragOptions () {
      return {
        animation: 200,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        touchStartThreshold: 32,
        group: 'notes',
        ghostClass: 'drop-placeholder',
        chosenClass: 'chosen-item',
        dragClass: 'dragging-item'
      }
    },

    removeIcon () {
      return this.static ? '$delete' : '$remove'
    }
  },

  watch: {
    nestedRemoved (elem) {
      if (!elem) return
      const base = this.elements.findIndex(item => item.refs && item.refs.includes(elem._id))
      this.elements[base].refs.removeById(elem._id)
      this.elements[base].verses.removeById(elem._id)
      const { _id, text, refs, keywords, topics } = this.elements[base]
      this.putNote({ _id, text, refs, keywords, topics })
      Object.assign(this, { nestedRemoved: null })
    }
  },

  methods: {
    ...mapActions('notes', ['putNote']),

    checkMove (event) {
      const {
        to: { id: target },
        draggedContext: {
          element: { type }
        }
      } = event

      const targetType = target.split('.')[0]

      return valid[type].includes(targetType)
    },

    endDrag (item) {
      this.$emit('update:modified', true)
    }
  }
}

</script>
