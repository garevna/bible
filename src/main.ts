import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import { createAppVuetify } from './plugins/vuetify'
import { loadTheme } from './theme'
import { listenForInstall } from './utils/install'

import './styles/main.css'

// colors and sizes come from public/theme.json (over src/theme/defaults.ts)
const colors = await loadTheme()

createApp(App).use(createPinia()).use(createAppVuetify(colors)).mount('#app')

registerSW({ immediate: true })
// the offer of the browser to install the app is kept for the button of the menu
listenForInstall()
