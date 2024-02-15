import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import store from './store'
import vuetify from './plugins/vuetify'

import { gotoVerse } from '@/store/helpers/gotoVerse'

Vue.config.productionTip = false

/* eslint-disable no-extend-native */
/* eslint-disable no-eval */

Object.assign(Array.prototype, {
  isEqual (array) {
    return JSON.stringify(this) === JSON.stringify(array)
  },

  removeById (id) {
    const index = ['string', 'number'].includes(typeof this[0])
      ? this.indexOf(id)
      : this.findIndex(item => item._id === id)
    index !== -1 && this.splice(index, 1)
  },

  pushUnique (item) {
    const id = typeof item === 'string' ? item : item._id
    const index = this.findIndex(item => item._id === id)
    index === -1 && this.push(item)
  },

  partSearch (part) {
    const search = part.toLowerCase()
    return this.find(item => item.toLowerCase().indexOf(search) !== -1)
  }
})

Number.prototype.format = function () {
  return this.toString().padStart(3, '0')
}

const instance = Object.assign(new Vue({
  store,
  vuetify,
  render: h => h(App)
}))

// Object.prototype.getClone = function () {
//   try {
//     return JSON.parse(JSON.stringify(this))
//   } catch (err) {
//     console.warn(err, '\n', this)
//   }
// }
// console.log(Object.prototype)
// console.log({ name: 'Test', age: 40 }.getClone())

Object.assign(instance, {
  $gotoVerse: gotoVerse,

  $clone (obj) {
    return JSON.parse(JSON.stringify(obj))
  }
})

instance.$mount('#app')
