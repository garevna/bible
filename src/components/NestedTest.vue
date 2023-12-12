<template>
  <section>
    <draggable
      v-model="list"
      :group="{ name: 'items', pull: canDrag, put: canDrop }"
    >
      <div
        class="div"
        v-for="(item, index) in list"
        :key="index"
      >
        {{ item.name }}
        <draggable
          v-model="item.children"
        >
          <div
            class="div"
            v-for="(child, childIndex) in item.children"
            :key="childIndex"
          >
            {{ child.name }}
          </div>
        </draggable>
      </div>
    </draggable>
  </section>
</template>

<script>

import draggable from 'vuedraggable'

export default {
  components: {
    draggable,
  },
  data() {
    return {
      list: [
        { name: 'Item 1', children: [] },
        { name: 'Item 2', children: [{ name: 'Item 2.1' }, { name: 'Item 2.2' }] },
        { name: 'Item 3', children: [] },
        {
          name: 'Item 4',
          children: [
            { name: 'Item 4.1' },
            { name: 'Item 4.2' }
          ]
        }
      ]
    }
  },
  methods: {
    canDrag(evt) {
      // Определите условие, когда элемент можно перетаскивать
      // return evt.draggedContext.element.children
      return true
    },
    canDrop(evt) {
      // Определите условие, когда элемент можно бросить
      console.log(evt)
      // return evt.toContext.element.children
      return true

    }
  }
}
</script>

<style scoped>

div {
  border: solid 1px #bbb;
  border-radius: 4px;
  padding: 8px 46px;
}

div.div {
  cursor: grab;
  border-color: #774;
}
</style>
