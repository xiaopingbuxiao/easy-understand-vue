# vm.$set 和 vm.$delete


vue中是使用的 defineProperty 来实现的对于对象已有属性变化的监听。对于新增属性是检测不到的。同时对于直接访问数组下标方式改变数组时也是检测不到的。因此vue是实现了一个 $set的API。来实现对新增属性的监听。具体的实现原理如下。

## vm.$set
### 对于Array的处理
```javascript
export function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
}
function isValidArrayIndex (val) {
  var n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}
```
上面的代码中，通过将通过小标改变数组的逻辑，改为了接用 Array.prototype.splice 方法，触发数组拦截器的监听，自动帮助我们把新增的 val 转换成响应式数据

### 对于 key 已经存在于 target 的情况
```javascript
export function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
}
```
这种情况数据已经时响应式的了，因此不需要处理。直接设置，修改数组的操作时会被 vue 所检测到的。

### 对于新增属性的处理

```javascript
export function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = target.__ob__
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}
```
对于新增属性的处理。先检测 target 是不是响应式数据。如果不是响应式数据，证明 vue 中根本就不需要监听这个数据，因此时无所谓的，直接设置即可。但是如果时响应式的。 需要调用 defineReactive 将新增的属性也变成响应式的，同时通知依赖 数据变化，触发更新操作。

## vm.$delete

同 vm.$set 一样。对于 delete 关键字删除数据属性的操作，vue 也是监听不到的。因此也增加了一个 $delete 的API。实现原理和 vm.$set 总体上是一样的。

```javascript
export function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = target.__ob__
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key)
}
```

具体逻辑如下:
* 如果是数组，接用数组的 splice 来触发数组拦截器，从而通知依赖更新。
* 如果该属性根本就不存在，不处理。
* 如果不是响应式数据，不处理。
* 如果是相应数据，执行一次删除属性，同时通知依赖数据变化通知。


vm.$set和 vm.$delete 同 vm.$watch 一样，都是在 instance/state.js 中将它们改在vue的原型上。如下:
```javascript
import { Watcher } from '../observer/watcher'
import { set, del } from '../observer/index'

export function stateMixin(vue) {
  //....
  Vue.prototype.$set = set
  Vue.prototype.$delete = del
}
```

## 代理data
我们写的 demo中 访问数据是通过 vm.data 来访问的。而在使用 Vue.js 的时候可以直接使用 this.xx 访问数据。其实这是因为 vue对于data做了代理。具体如下:
```javascript
function vue(data) {
  this.data = data
  new Observer(data)
  Object.keys(data).forEach((key) => {
    proxy(this, `data`, key)
  })
}
stateMixin(vue)

var sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: function (params) { },
  set: function (params) { }
};
function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key]
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}
```
至此，vue的数组响应原理已经完毕。完整代码 [vue数据绑定原理](https://github.com/xiaopingbuxiao/easy-understand-vue)