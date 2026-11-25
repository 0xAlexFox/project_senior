import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import '../shared/styles/tokens.css'
import '../shared/styles/base.css'
import '../shared/styles/workspace.css'
import '../shared/styles/components.css'

createApp(App).use(router).mount('#app')
