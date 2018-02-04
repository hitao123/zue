/**
 * created by huahaitao 2018/2/4
 */
// [1], ...[n] 括号中的分组捕获
// index 匹配到的字符位于原始字符串的基于0的索引值
// lastIndex 下一次匹配开始的位置
// '<div>{{ user.age }}1212 <p>{{ user.name }}</p></div>'
const reg = /\{?\{\{(.+?)\}\}\}?/g;

export default function parse(str) {
  if (str.trim() === '' || !reg.test(str)) return null;
  let tokens = [];
  let match, value, index, lastIndex = 0;
  reg.lastIndex = 0; // 这里将匹配开始位置
  while (match = reg.exec(str)) {
    index = match.index;
    if (index > lastIndex) {
      tokens.push({
        value: str.slice(lastIndex, index)
      });
    }
    value = match[1];
    tokens.push({
      tag: true,
      value: value.trim()
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < str.length - 1) {
    tokens.push({
      value: value.trim()
    });
  }
  return tokens;
}
