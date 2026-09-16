import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import RegisterView from './views/RegisterView.vue';
import WheelView from './views/WheelView.vue';
import RosterView from './views/RosterView.vue';
import StatsView from './views/StatsView.vue';
import SettingsView from './views/SettingsView.vue';
import NotFoundView from './views/NotFoundView.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/team/:id', name: 'wheel', component: WheelView },
  { path: '/team/:id/roster', name: 'roster', component: RosterView },
  { path: '/team/:id/stats', name: 'stats', component: StatsView },
  { path: '/team/:id/settings', name: 'settings', component: SettingsView },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
