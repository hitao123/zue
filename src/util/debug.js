/**
 * Created by huahaitao on 18/1/24.
 *
 */
// 这两种写法没什么区别 ，apply 第二个参数为什么是 console

// exports.warn = function() {
//  console.warn.apply(console, arguments);
// }

export const warn = function() {
  console.warn.apply(console, arguments);
}