import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import vuetify from './plugins/vuetify'

import './styles/main.css'

createApp(App).use(createPinia()).use(vuetify).mount('#app')

registerSW({ immediate: true })
