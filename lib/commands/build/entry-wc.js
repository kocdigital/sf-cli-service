import './setPublicPath'
import Vue from 'vue'
import defineComponent from '@sf/web-component-wrapper';

// runtime shared by every component chunk
import 'css-loader/dist/runtime/api.js'
import 'vue-style-loader/lib/addStylesShadow'
import 'vue-loader/lib/runtime/componentNormalizer'


  import examplePage from '~root/src/views/ExamplePage/ExamplePage.vue?shadow'
  defineComponent(Vue, examplePage);