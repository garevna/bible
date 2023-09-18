export const schema = {
  topic: {
    _id: Date.now().toString(),
    title: '',
    refs: [],
    notes: [],
    keywords: []
  },

  keyword: {
    _id: '',
    refs: []
  },

  note: {
    _id: Date.now().toString(),
    refs: [],
    topics: [],
    keywords: []
  }
}
