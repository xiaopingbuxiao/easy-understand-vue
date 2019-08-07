import { Dep } from "./dep";


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
    // let value = this.vm.data[this.expOrFn]
    let value = this.getter.call(this.vm, this.vm.data)
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




