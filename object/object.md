
# 如何实现对对象变换的监听

## Object.defineProperty
监听对象的改变可以使用 defineReactive 或者es6的proxy。但是proxy在浏览器中的兼容性一般。因此在 vue中是使用 defineReactive 来实现的。如下：
```javascript
/* 源码 observer/index.js */
function defineReactive(data, key, value) {
  Object.defineProperty(data, key, {
    set(newValue) {
      if (newValue === value) {
        return
      }
      console.log(`${key}的值被设置为${newValue}`)
      value = newValue
    },
    get() {
      return value
    }
  })
}

let obj = { name: 'hello' }
defineReactive(obj, 'name')
obj.name = 'xiaopingbuxiao' //name的值被设置为xiaopingbuxiao
console.log(obj.name) //xiaopingbuxiao
```
## 依赖的收集 Dep
在上面，我们已经实现了监听对象的的变化。但是并没有实际的作用。如果想要实现，如果想要做到数据变化时，对应的使用数据的dom 变化，首先要把使用数据的地方收集起来。因此需要创建Dep类，来进行依赖的收集。

通过上面对对象属性的监听，我们很容易想到，依赖的收集可以在get中。而改变属性的值的时候，来触发依赖。从而进行dom 的更新(即在set中触发依赖)；

```javascript
/* 源码 observer/Dep.js */
export class Dep {
  constructor() {
    this.subs = []
  }
  addSub(sub) {
    this.subs.push(sub)
  }
  removeSub(sub) {
    remove(this.subs, sub)
  }

  depend() {
    if (Dep.target) {
      this.addSub(Dep.target)
    }
  }
  notify() {
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}
Dep.target = null
/* 源码  shared/util.js */
function remove(arr, item) {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}
```
更改 defineReactive 函数如下
```javascript
function defineReactive(data, key, value) {
  let dep = new Dep()
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    set(newValue) {
      if (newValue === value) {
        return
      }
      console.log(`${key}的值被设置为${newValue}`)
      value = newValue
      dep.notify()
    },
    get() {
      dep.depend()
      return value
    }
  })
}
```
上面的代码中我们收集了依赖 Dep.target。其实Dep.target就是当数据更新时，需要通知的地方。使用数据的地方有很多。因此我们需要实现一个类来统一的管理使用数据的地方。在 vue中这个类被称为watcher。

```javascript

import { Dep } from "./Dep";

/* 源码  observer/watcher.js*/
export class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.expOrFn = expOrFn        // 不考虑watch一个函数时
    this.cb = cb
    this.getter = parsePath(expOrFn)    // 用来读取 a.b.c
    this.value = this.get()
  }
  get() {
    Dep.target = this
    //此处从this.vm 上获取值是因为vue中对vm的data进行了代理。此处相当于  this.getter.call(this.vm,this.vm.data)
    let value = this.getter.call(this.vm, this.vm)  
    Dep.target = null
    return value
  }
  update() {
    this.run()
  }
  run() {
    const value = this.get()
    const oldValue = this.value
    this.cb.call(this.vm, value, oldValue)
  }
}
/* 源码 util/lang.js */
const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)
function parsePath(path) {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
```
上面的代码中 当我们调用 this.get() 时，获取了属性的值，因此会触发对象属性的get操作，并将当前的 watcher实例收集到了dep 中。

## Observer 来递归实现监听对象的key
在上面我们已经实现了对对象中某一个属性的监听。但是我们希望对对象中的所有属性(包括子属性是一个对象时)的监听。因此我们创建一个Observer 类，来实现递归处理。将所有属性都转换为getter/setter形式。


更改 defineReactive 函数 和新增Observer 如下：
```javascript
export class Observer {
  constructor(value) {
    this.value = value
    if (!Array.isArray(value)) {
      this.walk(value)
    }
  }
  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }
}
function defineReactive(data, key, value) {
  console.log(data, key)
  if (typeof value === 'object') {
    new Observer(value)
  }
  let dep = new Dep()
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    set(newValue) {
      if (newValue === value) {
        return
      }
      console.log(`${key}的值被设置为${newValue}`)
      value = newValue
      dep.notify()
    },
    get() {
      dep.depend()
      return value
    }
  })
}
```
同时创建 自己的vue如下
```javascript
export default class vue {
  constructor(data, el, exp) {
    this.data = data
    new Observer(data)
    let watch = new Watcher(this, exp, function (value, oldvalue) {
      el.innerHTML = value
    })
    el.innerHTML = watch.value
  }
}
```
调用如下
```javascript
let el1 = document.querySelector('h1')
let el2 = document.querySelector('h2')
let obj1 = { name: 'hello' }
let obj2 = { deep: { age: 18 } }
let vm = new vue(obj1, el1, 'name')
let vm1 = new vue(obj2, el2, 'deep.age')
setTimeout(() => {
  obj1.name = 'xiaopingbuxiao'
  obj2.deep.age = 19
}, 1000);
```
可以看到，页面中h1 和 h2 在1s之后改变。此时已经实现对对象的监听。vue中对于监听Object的改变此原理。但是对于对象的新增属性是监听不到。因此vue中才会有一个 vm.$set 的API。这个留在回来处理。





























