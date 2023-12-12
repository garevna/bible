export function saveTopic () {
  this.items.forEach(item => {
    if (item.type === 'note') {
      const { _id, text, keywords, topics } = item
      const refs = item.verses.map(verse => verse._id)
      this.$root.contentController.putNote({ _id, text, refs, keywords, topics })
    }
  })

  Object.assign(this.topic, {
    order: this.items.map(item => item._id),
    refs: this.items
      .filter(item => item.type === 'verse')
      .map(item => item._id)
  })

  this.$root.contentController.putTopic(this.topic)
}
