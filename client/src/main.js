import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { applyCssVars } from './theme.js';
import './style.css';

applyCssVars();
createApp(App).use(router).mount('#app');
