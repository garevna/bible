function refresh () {
  const tmp = JSON.parse(JSON.stringify(this.items))

  const order = this.topic.order
    .filter(id => tmp.map(item => item._id).includes(id))

  Object.assign(this.topic, { order })
  this.items = order.map(id => tmp.find(item => item._id === id))
  this.$nextTick(() => Object.assign(this, { ready: ++this.ready }))
}

export async function getTopicData () {
  const [notes, verses] = [
    await this.$root.contentController.getNotes({ topic: this.topic._id }),
    this.topic.refs.length ? await this.$root.contentController.getVersesByRefs(this.topic.refs) : []
  ]

  for (const note of notes) {
    const noteVerses = note.refs && note.refs.length
      ? await this.$root.contentController.getVersesByRefs(note.refs)
      : []

    Object.assign(note, {
      type: 'note',
      verses: noteVerses.map(verse => ({
        _id: verse._id,
        type: 'verse',
        link: this.getVerseLink(verse),
        text: this.getVerseText(verse)
      }))
    })
  }

  verses.forEach(verse => Object.assign(verse, {
    type: 'verse',
    link: this.getVerseLink(verse),
    text: this.getVerseText(verse)
  }))

  this.items = notes.concat(verses)

  this.buildOrder(this.items)

  refresh.call(this)
}
