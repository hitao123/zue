/**
 * created by Billow 2018/2/12
 */

/**
 * @export
 * @param {Element} el
 * @param {Element} target
 */
export function before(el, target) {
  target.parentNode.insertBefore(el, target);
}
/**
 * @export
 * @param {Element} el
 * @param {Element} target
 */
export function after(el, target) {
  if (target.nextSibling) {
    before(el, target);
  } else {
    target.parentNode.appendChild(el);
  }
}
/**
 * @export
 * @param {Element} el
 */
export function remove(el) {
  el.parentNode.removeChild(el);
}
