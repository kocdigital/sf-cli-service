import './setPublicPath'
import defineComponent from '@sf/web-component-wrapper';
import Vue from 'vue'
import DashboardPage from '@/views/DashboardPage/DashboardPage.vue';
import ExamplePage from '@/views/ExamplePage/ExamplePage.vue';

defineComponent(Vue, DashboardPage);
defineComponent(Vue, ExamplePage);