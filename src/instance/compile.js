/**
 * created by huahaitao 2018/2/4
 */
// 节点类型 ELEMENT_NODE  TEXT_NODE
import textParser from '../parse/text';

function _compile() {
  this.fragment = document.createDocumentFragment();
  this._compileNode(this.$template);
  this.$el.innerHTML = '';
  this.fragment.childNodes.forEach((child) => {
    this.$el.appendChild(child.cloneNode(true));
  });
}
/**
 * 处理元素
 * @param {any} node
 */
function _compileElement(node) {
  this.currentNode = document.createElement(node.tagName);
  this.fragment.appendChild(this.currentNode);
  // 如果包含孩子节点
  if (node.hasChildNodes()) {
    Array.prototype.slice.call(node.childNodes).forEach(this._compileNode, this);
  }
}
/**
 * 处理文本节点
 * @param {any} node
 * @returns
 */
function _compileText(node) {
  let el;
  let tokens = textParser(node.nodeValue);
  if (!tokens) return;

  tokens.forEach((token) => {
    if (token.tag) {
      // 指令节点
      let property = token.value;
      el = document.createTextNode(this.$data[property]);
    } else {
      // 普通文本节点
      el = document.createTextNode(token.value);
    }
    this.currentNode.appendChild(el);
  }, this);
}

function _compileNode(node) {
  switch (node.nodeType) {
    // text
    case 1:
      this._compileElement(node);
      break;
    case 3:
      this._compileText(node);
      break;
  }
}

export {
  _compile,
  _compileElement,
  _compileText,
  _compileNode
};
