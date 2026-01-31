# Zue

学习 Vue 内部实现原理 - Vue2 响应式系统完整实现

这是一个用于学习 Vue 内部实现原理的项目，完整实现了 **Vue2 的响应式系统**，包括：
- ✅ **Observer**（数据劫持）
- ✅ **Dep**（依赖管理器）
- ✅ **Watcher**（观察者）
- ✅ **依赖收集** 和 **派发更新**机制
- ✅ 简单的模板编译功能

---

## 📖 文档导航

| 文档 | 内容 | 适合场景 |
|------|------|---------|
| [README.md](./README.md) | 项目介绍、快速开始、核心架构 | 快速了解项目 |
| [DEP_WATCHER_ANALYSIS.md](./DEP_WATCHER_ANALYSIS.md) | Dep + Watcher 深度解析、设计精髓 | 深入理解原理 |
| [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md) | 完整流程图、数据状态变化 | 可视化学习 |
| [UPDATE_SUMMARY.md](./UPDATE_SUMMARY.md) | 更新总结、技术亮点、学习路径 | 了解项目演进 |

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行基本示例

```bash
npm run dev
```

打开浏览器访问示例页面。

### 运行 Dep + Watcher 演示

```bash
# 需要先构建项目
node example/dep-watcher-demo.js
```

### 快速体验

```javascript
import Observer from './src/observer/observer';
import Watcher from './src/observer/watcher';

// 1. 创建响应式数据
const data = { count: 0 };
Observer.create(data);

// 2. 创建 Watcher 监听变化
new Watcher(data, 
  function() { return this.count; },
  function(newVal, oldVal) {
    console.log(`count: ${oldVal} → ${newVal}`);
  }
);

// 3. 修改数据，自动触发回调
data.count = 10;  // 输出: count: 0 → 10
```

---

## 🏗️ 核心架构

### 1. Observer 观察者系统（核心）

#### `observer.js` - 响应式核心

这是整个项目的核心，实现了 Vue2 的响应式原理。

**关键特性：**

```javascript
function Observer(value, type) {
  this.value = value;
  this.id = ++uid;
  
  // 在对象上定义 $observer 属性（不可枚举，避免死循环）
  Object.defineProperty(value, '$observer', {
    value: this,              // this = 当前 Observer 实例
    enumerable: false         // 关键：避免遍历时触发死循环
  });
  
  // 根据类型处理数组或对象
  if (type === ARRAY) {
    value.__proto__ = arrayAugmentations;
    this.link(value);
  } else if (type === OBJECT) {
    value.__proto__ = objectAugmentations;
    this.walk(value);
  }
}
```

**核心方法：**

1. **`walk(obj)`** - 遍历对象所有属性，递归观察
2. **`convert(key, val)`** - 使用 `Object.defineProperty` 劫持 getter/setter
   ```javascript
   Object.defineProperty(this.value, key, {
     get: function() {
       if (Observer.emitGet) {
         ob.notify('get', key);
       }
       return val;
     },
     set: function(newVal) {
       if (newVal === val) return;
       val = newVal;
       ob.notify('set', key, newVal);  // 触发通知
     }
   });
   ```

3. **事件系统** - 发布订阅模式
   - `on(event, fn)` - 订阅事件
   - `off(event, fn)` - 取消订阅
   - `emit(event, path, val)` - 触发回调
   - `notify(event, path, val)` - **向上冒泡传播事件**

4. **事件冒泡机制** - 这是亮点！
   ```javascript
   Observer.prototype.notify = function(event, path, val) {
     this.emit(event, path, val);
     let parent = this.parent;
     if (!parent) return;
     
     // 递归向父级传播
     let ob = parent.ob;
     let key = parent.key;
     let parentPath = path ? `${key}.${path}` : key;
     ob.notify(event, parentPath, val);
   };
   ```
   当修改 `obj.a.b.c` 时，事件会从 `c` → `b` → `a` 依次向上冒泡。

---

### 2. 数组响应式处理

#### `array-augmentations.js`

Vue2 无法用 `Object.defineProperty` 监听数组索引变化，所以需要**重写数组方法**：

```javascript
const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

aryMethods.forEach(method => {
  let original = Array.prototype[method];
  arrayAugmentations[method] = function() {
    let result = original.apply(this, arguments);  // 调用原方法
    let ob = this.$observer;                        // 通过 $observer 获取 Observer 实例
    ob.notify('set', null, this.length);           // 手动触发通知
    return result;
  };
});
```

通过修改数组的 `__proto__`，拦截这 7 个会改变原数组的方法。

---

### 3. 对象动态属性处理

#### `object-augmentations.js`

由于 `Object.defineProperty` 只能监听已存在的属性，新增/删除属性需要特殊处理：

```javascript
// $add - 动态添加响应式属性
define(objectAgumentations, '$add', function(key, val) {
  if (this.hasOwnProperty(key)) return;
  define(this, key, val, true);
  let ob = this.$observer;
  ob.observe(key, val);  // 递归观察
  ob.convert(key, val);  // 添加 getter/setter
});

// $delete - 删除属性
define(objectAgumentations, '$delete', function(key) {
  if (!this.hasOwnProperty(key)) return;
  delete this[key];
});
```

这类似 Vue2 的 `Vue.set()` 和 `Vue.delete()` API。

---

### 4. 模板编译系统

#### `compile.js` + `text.js`

实现简单的模板解析和渲染：

**文本解析：**
```javascript
const reg = /\{?\{\{(.+?)\}\}\}?/g;
// 将 "姓名: {{ name }}" 解析为 tokens
// [{value: "姓名: "}, {tag: true, value: "name"}]
```

**编译流程：**
1. 克隆模板 DOM
2. 递归遍历节点
3. 解析 `{{ }}` 插值表达式
4. 替换为 `this.$data` 中的值

---

## 🔄 工作流程

```javascript
const app = new Zue({
  el: '#app',
  data: {
    name: 'hht',
    age: 24
  }
});
```

**执行流程：**

1. **初始化** (`_init`)
   - 保存配置 `$options`
   - 获取 DOM 元素 `$el`
   - 克隆模板 `$template`
   - 保存数据 `$data`

2. **挂载** (`$mount`)
   - 调用 `_compile()` 编译模板

3. **编译** (`_compile`)
   - 创建 `DocumentFragment`
   - 递归处理节点（元素/文本）
   - 解析 `{{ name }}` 并替换为 `this.$data.name`
   - 插入到 DOM

4. **响应式系统**
   - ✅ 已完整实现：Observer + Dep + Watcher
   - ✅ 支持依赖收集和自动更新
   - 📝 示例：[dep-watcher-demo.js](./example/dep-watcher-demo.js)

---

## 🎯 Dep + Watcher 机制（核心！）

### 5. Dep（依赖管理器）

#### `dep.js` - 依赖收集和派发更新

每个响应式属性都有一个 Dep 实例，负责管理依赖关系。

**核心代码：**

```javascript
class Dep {
  constructor() {
    this.id = uid++;
    this.subs = [];  // 订阅者列表（Watcher 数组）
  }

  // 依赖收集
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  // 派发更新
  notify() {
    this.subs.forEach(watcher => watcher.update());
  }
}

// 全局唯一的 Watcher 栈
Dep.target = null;  // 指向当前正在执行的 Watcher
```

**Dep.target 的作用：**
- 在 Watcher 执行期间，`Dep.target` 指向该 Watcher
- 当属性被读取时，通过 `Dep.target` 知道是哪个 Watcher 在使用
- 从而建立**属性 ↔ Watcher** 的依赖关系

---

### 6. Watcher（观察者）

#### `watcher.js` - 连接数据和回调

Watcher 是连接 Observer 和组件的桥梁，当数据变化时自动执行回调。

**核心流程：**

```javascript
class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm;
    this.cb = cb;
    this.deps = [];
    this.getter = expOrFn;
    
    // 立即执行一次，触发依赖收集
    this.value = this.get();
  }

  get() {
    // 1. 将自己设置为 Dep.target
    pushTarget(this);
    
    // 2. 执行 getter，触发属性的 get 拦截器
    const value = this.getter.call(this.vm, this.vm);
    
    // 3. 恢复上一个 Watcher
    popTarget();
    
    return value;
  }

  update() {
    // 收到更新通知，重新执行 getter
    const newValue = this.get();
    this.cb(newValue, this.value);
  }
}
```

**工作原理：**

```
1. Watcher 创建时执行 get()
   ↓
2. pushTarget(watcher) → Dep.target = watcher
   ↓
3. 执行 getter，读取 data.name
   ↓
4. 触发 name 的 get 拦截器
   ↓
5. dep.depend() → watcher.addDep(dep)
   ↓
6. 建立依赖关系 ✅
   ↓
7. popTarget() → Dep.target = null
```

---

### 完整示例

```javascript
import Observer from './observer/observer';
import Watcher from './observer/watcher';

// 1. 创建响应式数据
const data = { name: 'Henry', age: 25 };
Observer.create(data);

// 2. 创建 Watcher 监听 name
const watcher = new Watcher(
  data,
  function() {
    console.log('读取:', this.name);
    return this.name;
  },
  function(newVal, oldVal) {
    console.log(`name 从 "${oldVal}" 变为 "${newVal}"`);
  }
);

// 3. 修改数据，自动触发回调
data.name = 'Tom';
// 输出: name 从 "Henry" 变为 "Tom"
```

**依赖关系：**

```
data.name (响应式属性)
    ↓
  Dep 实例
    ↓
subs: [watcher]
    ↓
watcher.update()
    ↓
执行回调 ✅
```

---

## 💡 核心设计亮点

### 1. 递归观察

```javascript
Observer.prototype.observe = function(key, val) {
  let ob = Observer.create(val);  // 递归创建子 Observer
  if (!ob) return;
  ob.parent = { key, ob: this };  // 建立父子关系
};
```

对象嵌套时（如 `{a: {b: {c: 1}}}`），每层都创建独立的 Observer，并记录父级引用。

### 2. 事件路径追踪

当修改 `data.user.info.name` 时：
- 路径：`"user.info.name"`
- 事件从 `name` → `info` → `user` → 根对象逐层冒泡

### 3. 巧妙避免死循环

```javascript
Object.defineProperty(value, '$observer', {
  enumerable: false  // 关键！
});
```

如果 `enumerable: true`，遍历对象时会访问 `$observer`，触发 getter，导致无限递归。

### 4. 双向引用机制

```
┌─────────────────┐          ┌──────────────────┐
│   data 对象     │          │  Observer 实例   │
│  {              │          │  {               │
│    name: 'hht', │          │    value: data,  │
│    age: 24,     │◄─────────│    id: 1,        │
│    $observer ───┼─────────►│    parent: null, │
│  }              │          │    _cbs: {}      │
└─────────────────┘          │  }               │
                             └──────────────────┘
```

**作用：**
- 从数据对象找到其 Observer：`data.$observer`
- 从 Observer 找到数据对象：`observer.value`

---

## ⚠️ 与 Vue2 的差异

| 特性 | Zue 实现 | Vue2 实现 |
|------|---------|----------|
| 响应式 | ✅ Observer + Dep + Watcher | ✅ Observer + Dep + Watcher |
| 依赖收集 | ✅ Dep.target 机制 | ✅ Dep.target 机制 |
| 自动更新 | ✅ Watcher 自动触发 | ✅ Watcher 自动触发 |
| 数组监听 | ✅ 重写 7 个方法 | ✅ 同样方式 |
| 动态属性 | ✅ $add/$delete | ✅ Vue.set/Vue.delete |
| 异步更新 | ❌ 同步更新 | ✅ nextTick 队列 |
| 计算属性 | ❌ 未实现 | ✅ computed |
| 侦听器 | ✅ Watcher | ✅ watch API |
| 虚拟 DOM | ❌ 直接操作 DOM | ✅ VNode + diff |
| 模板编译 | ✅ 简单实现 | ✅ 完整编译器 |

**已实现（核心响应式系统）：**
- ✅ 数据劫持（Observer）
- ✅ 依赖管理（Dep）
- ✅ 观察者模式（Watcher）
- ✅ 依赖收集和派发更新
- ✅ 嵌套对象响应式
- ✅ 数组变更检测

**未实现（性能优化和高级特性）：**
- ❌ 异步更新队列（nextTick）
- ❌ 计算属性缓存
- ❌ 虚拟 DOM 和 diff 算法
- ❌ 完整的生命周期

---

## 📚 学习价值

这个项目完整实现了 Vue2 响应式系统的核心机制，非常适合深入理解：

### 核心原理

1. **`Object.defineProperty` 实现响应式**
   - 数据劫持的核心 API
   - getter 中依赖收集
   - setter 中派发更新

2. **Dep.target 机制**
   - 全局上下文标记
   - 自动依赖收集的关键
   - 支持嵌套 Watcher（栈结构）

3. **观察者模式的实际应用**
   - Dep（主题/被观察者）
   - Watcher（观察者）
   - 自动的订阅-发布机制

4. **数组变更检测**
   - 为什么不能用 defineProperty
   - 重写原型方法的实现
   - 7 个变更方法的拦截

5. **递归观察嵌套对象**
   - 深度遍历和响应式处理
   - 父子关系的建立
   - 事件冒泡机制

6. **依赖收集和清理**
   - 双向收集（Watcher ↔ Dep）
   - 依赖去重（Set 数据结构）
   - cleanupDeps 避免内存泄漏

---

## 🚀 后续学习建议

在当前基础上，可以继续实现以下功能：

### 1. 异步更新队列

```javascript
let queue = [];
let has = {};

function queueWatcher(watcher) {
  if (!has[watcher.id]) {
    queue.push(watcher);
    has[watcher.id] = true;
    nextTick(flushSchedulerQueue);
  }
}
```

**作用：**
- 多次修改只触发一次更新
- 提升性能

### 2. 计算属性

```javascript
class ComputedWatcher extends Watcher {
  constructor(vm, getter) {
    super(vm, getter, null, { lazy: true });
    this.dirty = true;  // 脏检查标记
  }

  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }
}
```

**特性：**
- 懒执行
- 缓存机制
- 依赖追踪

### 3. 虚拟 DOM 和 Diff 算法

```javascript
function patch(oldVNode, newVNode) {
  // 比较新旧节点
  // 最小化 DOM 操作
}
```

**优势：**
- 批量更新
- 减少重绘重排
- 跨平台渲染

### 4. 完整的生命周期

```javascript
beforeCreate → created → beforeMount → mounted
beforeUpdate → updated → beforeDestroy → destroyed
```

---

## 📖 使用示例

### 示例 1：基本使用（原有功能）

```javascript
// example/index.js
import Zue from '../src/index';

const app = new Zue({
  el: '#app',
  data: {
    name: 'hht',
    age: 24
  }
});

// 访问数据
console.log(app.$data.name);  // 'hht'

// 动态添加属性（需要使用 $add）
app.$data.$add('email', 'test@example.com');

// 数组操作会触发响应式
let arr = [1, 2, 3];
let observer = Observer.create(arr);
arr.push(4);  // 会触发 notify
```

### 示例 2：Dep + Watcher 完整演示

```javascript
// example/dep-watcher-demo.js
import Observer from '../src/observer/observer';
import Watcher from '../src/observer/watcher';

// 1. 创建响应式数据
const data = {
  name: 'Henry',
  age: 25,
  user: {
    firstName: 'Hua',
    lastName: 'Haitao'
  }
};

Observer.create(data);

// 2. 创建 Watcher 监听单个属性
const watcher1 = new Watcher(
  data,
  function() {
    return this.name;  // 读取 name，自动收集依赖
  },
  function(newVal, oldVal) {
    console.log(`name 从 "${oldVal}" 变为 "${newVal}"`);
  }
);

// 3. 创建 Watcher 监听嵌套属性
const watcher2 = new Watcher(
  data,
  'user.firstName',  // 支持字符串表达式
  function(newVal, oldVal) {
    console.log(`firstName 从 "${oldVal}" 变为 "${newVal}"`);
  }
);

// 4. 创建 Watcher 监听多个属性（模拟计算属性）
const watcher3 = new Watcher(
  data,
  function() {
    // 同时依赖 firstName 和 lastName
    return `${this.user.firstName} ${this.user.lastName}`;
  },
  function(newVal, oldVal) {
    console.log(`fullName 从 "${oldVal}" 变为 "${newVal}"`);
  }
);

// 5. 修改数据，自动触发更新
data.name = 'Tom';
// 输出: name 从 "Henry" 变为 "Tom"

data.user.firstName = 'Zhang';
// 输出: firstName 从 "Hua" 变为 "Zhang"
// 输出: fullName 从 "Hua Haitao" 变为 "Zhang Haitao"
```

**运行完整示例：**
```bash
node example/dep-watcher-demo.js
```

### 示例 3：模拟 Vue 的 watch 功能

```javascript
// 封装一个简单的 watch API
function watch(data, key, callback) {
  return new Watcher(data, key, callback);
}

const data = { count: 0 };
Observer.create(data);

// 监听 count 变化
watch(data, 'count', (newVal, oldVal) => {
  console.log(`count 变化: ${oldVal} -> ${newVal}`);
});

data.count++;  // count 变化: 0 -> 1
data.count++;  // count 变化: 1 -> 2
```

### 示例 4：模拟渲染 Watcher

```javascript
// 模拟组件渲染
function renderComponent(data, renderFn) {
  return new Watcher(data, 
    function() {
      return renderFn.call(this);
    },
    function() {
      console.log('组件重新渲染');
      // 实际场景中会调用 updateComponent
    }
  );
}

const data = { title: 'Hello', count: 0 };
Observer.create(data);

// 创建渲染 Watcher
const renderWatcher = renderComponent(data, function() {
  // 模拟渲染函数，访问多个属性
  return `<div>${this.title}: ${this.count}</div>`;
});

// 任何依赖的数据变化，都会触发重新渲染
data.title = 'Hi';     // 组件重新渲染
data.count = 10;       // 组件重新渲染
```

---

## 🛠️ 运行项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

---

## 📝 项目结构

```
zue-master/
├── src/
│   ├── observer/          # 响应式核心 ⭐
│   │   ├── observer.js           # Observer 主类（数据劫持）
│   │   ├── dep.js                # Dep 依赖管理器（NEW）
│   │   ├── watcher.js            # Watcher 观察者（NEW）
│   │   ├── array-augmentations.js    # 数组方法重写
│   │   └── object-augmentations.js   # 对象动态属性
│   ├── instance/          # 实例方法
│   │   ├── init.js              # 初始化
│   │   └── compile.js           # 模板编译
│   ├── api/               # API
│   │   └── lifecycle.js         # 生命周期
│   ├── parse/             # 解析器
│   │   └── text.js              # 文本解析
│   ├── util/              # 工具函数
│   │   ├── lang.js              # 语言工具
│   │   ├── dom.js               # DOM 操作
│   │   └── index.js             # 工具入口
│   └── index.js           # 入口文件
├── example/               # 示例
│   ├── index.html               # 基本示例
│   ├── index.js                 # 基本示例 JS
│   └── dep-watcher-demo.js      # Dep + Watcher 完整演示（NEW）
├── README.md              # 项目文档
├── DEP_WATCHER_ANALYSIS.md  # Dep + Watcher 深度解析（NEW）
├── package.json
└── webpack.config.js
```

**核心文件说明：**

| 文件 | 作用 | 关键概念 |
|------|------|---------|
| `observer.js` | 数据劫持，为属性添加 getter/setter | Object.defineProperty |
| `dep.js` | 管理依赖，收集和通知 Watcher | Dep.target、发布订阅 |
| `watcher.js` | 观察者，连接数据和回调 | 依赖收集、自动更新 |
| `array-augmentations.js` | 拦截数组变更方法 | 原型链劫持 |
| `object-augmentations.js` | 动态添加/删除属性 | $add、$delete |

---

## 📄 License

ISC
