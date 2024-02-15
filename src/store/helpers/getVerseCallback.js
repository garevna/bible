const { gotoVerse } = require('@/store/helpers/gotoVerse')

export const getVerseCallback = _id => gotoVerse.bind(null, _id)
