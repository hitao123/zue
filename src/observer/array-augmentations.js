/**
 * Created by huahaitao on 18/1/24.
 * 定义一个对象,它的属性中有push等经过改写的数组方法
 */

const aryMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]; // 这几个方法会改变原来数组
const arrayAugmentations = [];

aryMethods.forEach(method => {
  let original = Array.prototype[method];
  arrayAugmentations[method] = function() {
    let result = original.apply(this, arguments);
    let ob = this.$observer;
    ob.notify('set', null, this.length);
    return result;
  };
});

export default arrayAugmentations;
