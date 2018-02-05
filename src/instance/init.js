/**
 * created by huahaitao 2018/2/4
 */

function _init(options) {
  // 初始化数据
  this.$options = options;
  this.$el = document.querySelector(options.el);
  this.$template = this.$el.cloneNode(true);
  this.$data = options.data || {};

  // 挂载
  this.$mount();
}

export default _init;
