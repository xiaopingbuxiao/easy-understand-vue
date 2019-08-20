# $watch 的实现

vm.$watch其实就是对Watcher的封装。核心代码在 instance/state.js 中。

代码如下：
```javascript
/* instance/state.js */
export function stateMixin(vue) {
  vue.prototype.$watch = function (expOrFn, cb, options) {
    const vm = this
    const options = options || {}
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn() {
      watcher.teardown()
    }
  }
}
```
代码非常简单。调用$watch 时返回一个执行 new Watcher 操作，传入 vm实例，监视的属性或者函数，以及属性变化时调用的回调函数。最后一个参数是一个对象，可以包含 deep 或 immediate两个属性。当传入 immediate 为true时，立即调用回调函数。传入 deep 为 true 时，实现深度监听。

同时返回一个unwatchFn 函数，调用时执行 watcehr上的teardown 函数。取消观察数据。此外$watch 的第一个参数可以是函数，因此需要先对 Watcher 进行更改如下
```javascript
export class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.cb = cb
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)    
    }
    this.value = this.get()
  }
  // ....
}
```
同时我们还需要在watcher中记录自己都订阅了谁，也就是 watcher实例被哪些 Dep 所收集。只有先收集起来，取消订阅的时候才能通过循环自己的列表来通知Dep将自己从 Dep中的依赖列表中移除掉
```javascript
export class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.cb = cb
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)    
    }
    this.value = this.get()
    this.deps = []
    this.depIds = new Set()
  }
  addDep(dep) {
    const id = dep.id
    if (!this.depIds.has(id)) {
      this.depIds.add(id)
      this.deps.push(dep)
      dep.addSub(this)
    }
  }
 //.....
}
```
同时修改 Dep 如下
```javascript
export class Dep {
  constructor() {
    this.id = uid++   // 新增
    this.subs = []  
  }
  depend() {
    if (Dep.target) {
      // this.addSub(Dep.target)
      Dep.target.addDep(this) // 更改
    }
  }
  //....
}
```
此时就实现了在 Dep中记录了数据变化时需要通知的watcher。同时在watcher中记录了会被哪些Dep所通知。

此时的更改主要是针对 $watch 的第一个参数时函数时，因为当第一个参数时表达式时，Watcher 中收集的数据只会是一个(也就是说只会被一个数据的变化通知)。但是当第一个参数时一个函数时，它可能时被多个数据变化时通知(即Watcher中的deep会是多个)

实现了 watcher 中收集 Dep 之后，就可以实现将 Dep中的Watcher移除的操作了。即当数据变化时，不需要在通知某一个Watcher了，将Watcher从Dep中移除即可。具体实现如下
```javascript
export class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.cb = cb
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn) 
    }
    this.value = this.get()
    this.deps = []
    this.depIds = new Set()
  }
  /* 新增将Watcher从Dep中移除的操作 */
  teardowm() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].removeSub(this)
    }
  }
  //....
}
```
## deep参数实现原理
deep的作用就是在对象的属性或数组的子属性发生变化时，能够触发对对象的监听。因此不仅需要在该属性的Dep中收集依赖，还需要在子属性的Dep中收集依赖(即当前的watcher需要被子属性的Dep所收集)

代码如下：
```javascript
export class Watcher {
  constructor(vm, expOrFn, cb, options) {
    this.vm = vm
    // this.expOrFn = expOrFn
    if (options) {
      this.deep = !!options.deep
    } else {
      this.depIds = false
    }
    this.cb = cb
    this.deps = []
    this.depIds = new Set()
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)    
    }
    this.value = this.get()
  }
  addDep(dep) {
    const id = dep.id
    if (!this.depIds.has(id)) {
      this.depIds.add(id)
      this.deps.push(dep)
      dep.addSub(this)
    }
  }
  teardowm() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].removeSub(this)
    }
  }
  get() {
    Dep.target = this
    // let value = this.vm.data[this.expOrFn]
    let value = this.getter.call(this.vm, this.vm.data)
    if (this.deep) {
      traverse(value)
    }
    Dep.target = null
    return value
  }
  update() {
    this.run()
  }
  run() {
    const value = this.get()
    const oldValue = this.value
    this.value = value
    this.cb.call(this.vm, value, oldValue)
  }
}
const seenObjects = new Set()

export function traverse(val) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function isObject(obj) {
  return obj !== null && typeof obj === 'object'
}

function _traverse(val, seen) {
  // console.log(seen, val, 111)
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val)) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
```
新增了 traverse 函数。这个地方有一个重点就是，一定要在 Dep.target = null之前调用 traverse 函数。因为只要这样才能保证此时的 watcher时正确的。

traverse 的作用递归调用当前值所有子属性。触发子属性的get操作。一旦触发了子属性的get操作，就可以将当前的watcher收集到子属性的Dep中。这样就做到了当子属性发生变化时，可以通知到当前的watcher，从而实现深度监听。





