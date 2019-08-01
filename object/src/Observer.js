
import { Dep } from './Dep'


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


