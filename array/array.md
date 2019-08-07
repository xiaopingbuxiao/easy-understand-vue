# 如何实现对数组变化的监听

vue中对与对象变化的监听是使用的 defineProperty，通过设置对象属性的setter/getter，从而实现了在获取属性时收集需要通知的依赖，在设置属性时通知需要更新的依赖，来实现对对象属性变化时的监听。具体可以查看 [如何实现对对象变化的监听](https://xiaopingbuxiao.com/vue/object.html)

但是对于数组是没有 defineProperty的，因此这种方法就行不通。而vue 中对与数组变化的监听是通过拦截数组的方法来实现的。具体如下。

## 拦截器

拦截器其实就是一个和Array.prototype 一样的 Object。实现了数组身上的所有方法。只是对于能够引起数组变化的方法进行了处理。

Array的原型上可以改变数组内容的方法一共有 7个，分别为 push,pop,shift,unshift,splice,sort,reverse 。我们处理数组的方法如下:

```javascript
const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto)
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  Object.defineProperty(arrayMethods, method, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function mutator(...args) {
      // 发送数组变化的通知
      return original.apply(this, args)
    }
  })
})
```
此时的 arrayMethods 实现了Array.prototype 上的所有属性，同时我们可以在 mutator 函数中添加自己的逻辑，比如发送数组变化的通知。

## 拦截器的使用
上面已经实现了一个数组的拦截器，需要使用它覆盖Array.prototype ，但是这样会污染全局的 Array。因此可以只针对那些需要监听变化的数组生效。即只覆盖响应式数组中的数组。

因此此时需要更改 Observer。 js是基于原型链查找的语言。因此可以通知直接覆盖__proto__ 来进行拦截。对于不支持__proto__的浏览器，vue直接粗暴的 arrayMethods上的方法设置到数组身上。如下:

```javascript
export class Observer {
  constructor(value) {
    this.value = value
    if (Array.isArray(value)) {
      if (__proto__ in {}) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
    } else {
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

function protoAugment(target, src) {
  target.__proto__ = src
}

function copyAugment(target, src, keys) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}
function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

```
## 数组依赖收集
上面的代码，只是让数组实现了一种能力，即数组发送变化时通知依赖(Watcher)。首先需要收集依赖。对于对象中的依赖收集在defineReactive 函数中，每一个key对应一个 Dep。
即在getter中收集依赖。

对于数组，其实我们也是在getter中收集的。如下
```javascript
{
  arr:[1,2,3]
}
```
如果想要获取arr 需要通过  this.arr 来获取，同样的会触发getter。但是对于数组的依赖收集位置是和对象不同。vue中将数组的依赖放在 Observer 上
```javascript
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()      //新增
    if (Array.isArray(value)) {
      if ('__proto__' in {}) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
    } else {
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
```
更改defineReactive 如下
```javascript
function defineReactive(data, key, value) {
  let childOb = observe(value)   
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
      if (childOb) {
        childOb.dep.depend()
      }
      return value
    }
  })
}

export function observe(value, asRootData) {
  let ob;
  if ('__ob__' in value && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else {
    ob = new Observer(value)
  }
  return ob
}
```
上面代码新增了 observe 函数，尝试获取响应式数据，如果获取不到就创建。

## 拦截器中获取 Observer 实例

由于 Array的拦截器是基于原型的封装，因此此时的this 可以获取到当前操作的数组。
而需要通知的依赖存在 Observer 实例上，所以需要在this 中可以获取到 Observer实例。
如下：

```javascript
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if ('__proto__' in {}) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
    } else {
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
```
同时数组中获取 Observer 实例，并且在数组变化是发送通知

```javascript
const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  Object.defineProperty(arrayMethods, method, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function mutator(...args) {
      // 发送数组变化的通知
      let result = original.apply(this, args)
      const ob = this.__ob__
      ob.dep.depend()
      return result
    }
  })
})
```
## 监视数组中元素变化

如果数组中的元素是对象，我们也需要监视他的变化。因此我们在处理数组时，不仅仅需要处理数组本身，还要处理数组中的元素。

更改 Observer类如下:

```javascript
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if ('__proto__' in {}) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)    //新增
    } else {
      this.walk(value)
    }
  }
  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }
  //新增
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
```
## 监视新增数组元素变化
当数组中新增元素时，我们首先需要将新增的元素处理为响应式数据。具体如下

```javascript
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  Object.defineProperty(arrayMethods, method, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function mutator(...args) {
      // 发送数组变化的通知
      let result = original.apply(this, args)
      const ob = this.__ob__
      //新增
      let inserted;   
      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args
          break
        case 'splice':
          inserted = args.slice(2)
          break
      }
      if (inserted) ob.observeArray(inserted)
      ob.dep.depend()
      return result
    }
  })
})
```
同样创建 vue的函数如下
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
调用如下；可以发现1s后代码h1 标签变化。
```javascript
let el1 = document.querySelector('h1')
let obj = { arr: [1, 2, 3] }
let vm = new vue(obj, el1, 'arr')
setTimeout(() => {
  obj.arr.push(3)
}, 1000);
```



