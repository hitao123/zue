# Dep + Watcher 机制详解

## 📚 概述

这是 Vue2 响应式系统的核心机制，实现了**自动的依赖收集和派发更新**。

### 三个核心角色

```
┌─────────────────────────────────────────────────────────┐
│                    响应式系统架构                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Observer (数据劫持)                                     │
│      ↓                                                   │
│  为每个属性创建 Dep (依赖管理器)                         │
│      ↓                                                   │
│  Watcher (观察者) 读取数据时触发依赖收集                │
│      ↓                                                   │
│  数据变化时，Dep 通知所有 Watcher 更新                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Dep（Dependency）- 依赖管理器

### 核心职责

每个响应式属性都有一个 Dep 实例，负责：
1. **收集**依赖该属性的 Watcher
2. **通知**所有 Watcher 进行更新

### 关键代码

```javascript
class Dep {
  constructor() {
    this.id = uid++;
    this.subs = []; // 订阅者列表（Watcher 数组）
  }

  // 依赖收集
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  // 派发更新
  notify() {
    this.subs.forEach(watcher => {
      watcher.update();
    });
  }
}
```

### Dep.target 全局变量

这是整个机制最巧妙的设计！

```javascript
Dep.target = null;  // 全局唯一，指向当前正在执行的 Watcher
```

**作用：**
- 在 Watcher 执行期间，`Dep.target` 指向该 Watcher
- 当属性被读取时，通过 `Dep.target` 知道是哪个 Watcher 在使用该属性
- 从而建立属性和 Watcher 的依赖关系

---

## 👁️ Watcher（观察者）

### 核心职责

1. **依赖收集阶段**：读取数据，收集依赖
2. **派发更新阶段**：数据变化时执行回调

### 完整流程

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

---

## 🔄 完整工作流程

### 场景：监听 `data.name` 属性

```javascript
const data = { name: 'Henry' };
Observer.create(data);

const watcher = new Watcher(data, 
  function() { return this.name; },  // getter
  function(newVal, oldVal) {          // callback
    console.log(`name 从 ${oldVal} 变为 ${newVal}`);
  }
);
```

### 步骤详解

#### 1️⃣ 初始化阶段

```
Watcher 构造函数执行
    ↓
调用 this.get()
    ↓
pushTarget(watcher)  → Dep.target = watcher
    ↓
执行 getter: return this.name
    ↓
触发 data.name 的 get 拦截器
    ↓
dep.depend() → watcher.addDep(dep)
    ↓
dep.subs.push(watcher)  ✅ 依赖收集完成！
    ↓
popTarget()  → Dep.target = null
```

**此时的依赖关系：**
```
data.name 的 Dep
    ↓
subs: [watcher]
```

#### 2️⃣ 更新阶段

```
data.name = 'Tom'
    ↓
触发 data.name 的 set 拦截器
    ↓
dep.notify()
    ↓
遍历 dep.subs，调用 watcher.update()
    ↓
watcher.run() → 重新执行 getter
    ↓
调用回调 cb(newVal, oldVal)
    ↓
✅ 视图更新！
```

---

## 🌟 核心设计亮点

### 1. Dep.target 的巧妙设计

**问题：** 如何知道属性被哪个 Watcher 使用？

**解决：** 通过全局变量 `Dep.target`

```javascript
// 属性的 getter 中
get: function() {
  if (Dep.target) {  // ← 检查是否有 Watcher 正在执行
    dep.depend();     // ← 收集依赖
  }
  return val;
}
```

### 2. 栈结构支持嵌套 Watcher

```javascript
const targetStack = [];

function pushTarget(target) {
  targetStack.push(target);
  Dep.target = target;
}

function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}
```

**为什么需要栈？**

场景：计算属性依赖另一个计算属性

```javascript
computed: {
  fullName() {
    return this.firstName + ' ' + this.lastName;
  },
  greeting() {
    return 'Hello ' + this.fullName;  // ← 嵌套依赖
  }
}
```

执行流程：
```
greetingWatcher 入栈  → Dep.target = greetingWatcher
    ↓
读取 fullName → 触发 fullNameWatcher
    ↓
fullNameWatcher 入栈  → Dep.target = fullNameWatcher
    ↓
读取 firstName, lastName（收集到 fullNameWatcher）
    ↓
fullNameWatcher 出栈  → Dep.target = greetingWatcher
    ↓
继续执行（收集到 greetingWatcher）
    ↓
greetingWatcher 出栈  → Dep.target = null
```

### 3. 双向收集

```javascript
// Watcher 记录依赖的 Dep
watcher.deps = [dep1, dep2, dep3];

// Dep 记录订阅的 Watcher
dep.subs = [watcher1, watcher2];
```

**好处：**
- Watcher 可以清理不再需要的依赖
- Dep 可以通知所有订阅者

### 4. 依赖去重

```javascript
addDep(dep) {
  const id = dep.id;
  if (!this.newDepIds.has(id)) {  // ← 使用 Set 去重
    this.newDepIds.add(id);
    this.newDeps.push(dep);
    dep.addSub(this);
  }
}
```

避免同一个属性被多次收集。

---

## 📊 实际应用场景

### 场景 1：渲染 Watcher

```javascript
// Vue 组件渲染时
new Watcher(vm, function() {
  // 渲染函数，访问 data.name, data.age
  return `<div>${this.name}, ${this.age}</div>`;
}, function() {
  // 任何依赖的数据变化，都会重新渲染
  vm._update();
});
```

### 场景 2：计算属性 Watcher

```javascript
// computed: { fullName() { return this.firstName + ' ' + this.lastName; } }
new Watcher(vm, function() {
  return this.firstName + ' ' + this.lastName;
}, function(newVal) {
  vm.fullName = newVal;
});
```

### 场景 3：用户 Watcher (watch)

```javascript
// watch: { name(newVal, oldVal) { console.log(newVal); } }
new Watcher(vm, 'name', function(newVal, oldVal) {
  console.log(newVal);
});
```

---

## 🔬 深入理解：依赖收集的时机

### 问题：为什么要在 Watcher 创建时立即执行一次？

```javascript
constructor() {
  // ...
  this.value = this.get();  // ← 立即执行
}
```

**原因：**
1. **建立初始依赖关系**：第一次执行 getter 时，才知道依赖哪些属性
2. **获取初始值**：用于后续对比（oldValue vs newValue）
3. **触发依赖收集**：执行期间访问的所有响应式属性都会被收集

### 示例

```javascript
const watcher = new Watcher(data,
  function() {
    // 访问了 name 和 age，自动收集这两个依赖
    return this.name + this.age;
  },
  callback
);

// 创建后：
// data.name 的 Dep.subs 包含 watcher
// data.age 的 Dep.subs 包含 watcher
```

---

## ⚡ 性能优化：cleanupDeps

### 为什么需要清理依赖？

**场景：条件渲染**

```javascript
new Watcher(vm, function() {
  if (this.showDetail) {
    return this.detail;  // 依赖 detail
  } else {
    return this.summary; // 依赖 summary
  }
}, callback);
```

**问题：**
- 当 `showDetail = true` 时，依赖 `detail`
- 当 `showDetail = false` 时，依赖 `summary`
- 如果不清理，两个属性都会保留依赖关系！

**解决：**

```javascript
cleanupDeps() {
  // 移除旧的、不再需要的依赖
  let i = this.deps.length;
  while (i--) {
    const dep = this.deps[i];
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this);  // ← 从 Dep 中移除自己
    }
  }
  
  // 交换新旧依赖列表
  let tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps.length = 0;
}
```

---

## 🎯 与原有 Observer 的整合

### 修改 Observer.convert

```javascript
Observer.prototype.convert = function(key, val) {
  const dep = new Dep();  // ← 为每个属性创建 Dep
  
  Object.defineProperty(this.value, key, {
    get: function() {
      if (Dep.target) {
        dep.depend();  // ← 依赖收集
      }
      return val;
    },
    set: function(newVal) {
      val = newVal;
      dep.notify();  // ← 派发更新
    }
  });
};
```

### 向下兼容

保留原有的事件机制（`on/emit/notify`），两种方式可以共存：

```javascript
get: function() {
  // 新机制：Dep + Watcher
  if (Dep.target) {
    dep.depend();
  }
  
  // 旧机制：事件系统（向下兼容）
  if (Observer.emitGet) {
    ob.notify('get', key);
  }
  
  return val;
}
```

---

## 🧪 测试示例输出

运行 `dep-watcher-demo.js` 的输出：

```
========== Dep + Watcher 示例 ==========

步骤1: 创建响应式数据
响应式数据创建完成

步骤2: 创建 Watcher 监听 name 属性
[Dep] pushTarget: 1
  -> 正在读取 data.name
[Observer] 收集依赖: name, Watcher: 1
[Dep] popTarget: 1, 当前 target: null
[Watcher 1] 创建完成，初始值: Henry

测试1: 修改 name 属性（只触发 Watcher 1）
[Observer] 属性变化: name, 旧值: Henry, 新值: Tom
[Dep 1] 通知 1 个订阅者更新
[Watcher 1] 收到更新通知
  ✅ Watcher 1 回调执行！name 从 "Henry" 变为 "Tom"
```

---

## 📖 总结

### Dep.target 的本质

> **Dep.target 是一个全局"上下文标记"，表示"当前谁在读取数据"**

- 类似于 React Hooks 的全局 currentFiber
- 类似于异步追踪中的 traceId

### 核心流程

```
1. Watcher 执行前：Dep.target = watcher
2. 读取属性：触发 getter → dep.depend() → 收集依赖
3. Watcher 执行后：Dep.target = null
4. 修改属性：触发 setter → dep.notify() → 更新视图
```

### 设计精髓

1. **自动化**：无需手动管理依赖，自动收集和清理
2. **精确**：只通知真正依赖该属性的 Watcher
3. **高效**：去重、懒执行、批量更新
4. **可嵌套**：支持计算属性等复杂场景

这就是 Vue2 响应式系统的核心魔法！🎩✨
