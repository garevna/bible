import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import vuetify from './plugins/vuetify'

import { contentController } from '@/db/contentController'

import { initUser, gotoVerse, getVerseNode } from '@/helpers'

const { initFirebase } = require('@/firebase').default

Vue.config.productionTip = false

/* eslint-disable no-extend-native */

Array.prototype.removeById = function (id) {
  const index = ['string', 'number'].includes(typeof this[0])
    ? this.indexOf(id)
    : this.findIndex(item => item._id === id)
  index !== -1 && this.splice(index, 1)
}

const instance = Object.assign(new Vue({ vuetify, render: h => h(App) }), {
  contentController,
  user: initUser(),
  gotoVerse,
  getVerseNode,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight
})

window[Symbol.for('firebase-DB')] = initFirebase()

Object.assign(contentController, {
  $root: instance
})

instance.$mount('#app')
