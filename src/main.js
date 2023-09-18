import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import vuetify from './plugins/vuetify'

import { contentController } from '@/db/contentController'

import { initUser } from '@/helpers'

const { initFirebase } = require('@/firebase').default

Vue.config.productionTip = false

const instance = Object.assign(new Vue({ vuetify, render: h => h(App) }), {
  contentController,
  user: initUser(),
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight
})

window[Symbol.for('firebase-DB')] = initFirebase()

Object.assign(contentController, {
  $root: instance
})

instance.$mount('#app')
