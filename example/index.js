/**
 * created by Billow 2018/2/5
 */
import Zue from '../src/index';

const app = new Zue({
  el: '#app',
  data: {
    name: 'hht',
    age: 24
  }
});

window.app = app;
