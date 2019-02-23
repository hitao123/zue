/**
 * Created by huahaitao on 18/1/24.
 */

import { define } from '../util';
const objectAgumentations = {};

/**
 * 给对象添加'添加属性'方法
 * 为什么要写这个方法呢?
 * 因为如果没有这个方法, 你直接data.info = {name:'liangshaofeng'},
 * 这样虽然可以修改数据对象,但是却没法监听到这一改变,defineProperty只能监听已经存在的属性
 * 所以需要在添加新的属性的时候调用特殊的方法,下面的delete方法作用与此相同
 * TODO: 添加和删除动作是否需要进行事件传播
 */
define(objectAgumentations, '$add', function(key, val) {
  if (this.hasOwnProperty(key)) return;
  define(this, key, val, true);
  let ob = this.$observer;
  ob.observe(key, val);
  ob.convert(key, val);
});

define(objectAgumentations, '$delete', function(key) {
  if (!this.hasOwnProperty(key)) return;
  delete this[key];
});

export default objectAgumentations;
