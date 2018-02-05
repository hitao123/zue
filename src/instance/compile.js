/**
 * created by huahaitao 2018/2/4
 */
// 节点类型 ELEMENT_NODE  TEXT_NODE
import textParser from '../parse/text';

let fragment, currentNodeList = [];

function _compile() {
  fragment = document.createDocumentFragment();
  currentNodeList.push(fragment);
  this._compileNode(this.$template);
  this.$el.parentNode.replaceChild(fragment, this.$el);
  this.$el = document.querySelector(this.$options.el);
}

function _compileElement(node) {
  let newNode = document.createElement(node.tagName);
  // 处理节点属性
  if (node.hasAttributes()) {
    let attrs = node.attributes;
    // Array.from(attrs).forEach((attr) => {})
    Array.prototype.slice.call(attrs).forEach((attr) => {
      newNode.setAttribute(attr.name, attr.value);
    });
  }
  let currentNode = currentNodeList[currentNodeList.length -1].appendChild(newNode);
  if (node.hasChildNodes()) {
    currentNodeList.push(currentNode);
    Array.prototype.slice.call(node.childNodes).forEach(this._compileNode, this);
  }
  currentNodeList.pop();
}

function _compileText(node) {
  let tokens = textParser(node.nodeValue);
  if (!tokens) return;

  tokens.forEach((token) => {
    if (token.tag) {
      // 指令节点
      let value = token.value;
      let el = document.createTextNode('');
    } else {
      // 普通文本节点
      let el = document.createTextNode('');

    }
    let property = value.replace(/[{}]/g, '');
    nodeValue = nodeValue.replace(value, this.$data[property]);
  }, this);

  currentNodeList[currentNodeList.length - 1].appendChild(document.createTextNode(nodeValue));
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
