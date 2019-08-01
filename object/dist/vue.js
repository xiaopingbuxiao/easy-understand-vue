(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.vue = factory());
}(this, function () { 'use strict';

  /* 源码 observer/Dep.js */
  class Dep {
    constructor() {
      this.subs = [];
    }
    addSub(sub) {
      this.subs.push(sub);
    }
    removeSub(sub) {
      remove(this.subs, sub);
    }

    depend() {
      if (Dep.target) {
        this.addSub(Dep.target);
      }
    }
    notify() {
      const subs = this.subs.slice();
      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update();
      }
    }
  }
  Dep.target = null;
  /* 源码  shared/util.js */
  function remove(arr, item) {
    if (arr.length) {
      const index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1)
      }
    }
  }

  class Observer {
    constructor(value) {
      this.value = value;
      if (!Array.isArray(value)) {
        this.walk(value);
      }
    }
    walk(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        defineReactive(obj, keys[i], obj[keys[i]]);
      }
    }
  }


  function defineReactive(data, key, value) {
    if (typeof value === 'object') {
      new Observer(value);
    }
    let dep = new Dep();
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: true,
      set(newValue) {
        if (newValue === value) {
          return
        }
        console.log(`${key}的值被设置为${newValue}`);
        value = newValue;
        dep.notify();
      },
      get() {
        dep.depend();
        return value
      }
    });
  }

  class Watcher {
    constructor(vm, expOrFn, cb) {
      this.vm = vm;
      this.expOrFn = expOrFn;        // 不考虑watch一个函数时
      this.cb = cb;
      this.getter = parsePath(expOrFn);    // 用来读取 a.b.c
      this.value = this.get();
    }
    get() {
      Dep.target = this;
      // let value = this.vm.data[this.expOrFn]
      let value = this.getter.call(this.vm, this.vm.data);
      Dep.target = null;
      return value
    }
    update() {
      this.run();
    }
    run() {
      const value = this.get();
      const oldValue = this.value;
      this.cb.call(this.vm, value, oldValue);
    }
  }


  /* 源码 util/lang.js */
  const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
  const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
  function parsePath(path) {
    if (bailRE.test(path)) {
      return
    }
    const segments = path.split('.');
    return function (obj) {
      for (let i = 0; i < segments.length; i++) {
        if (!obj) return
        obj = obj[segments[i]];
      }
      return obj
    }
  }

  class vue {
    constructor(data, el, exp) {
      this.data = data;
      new Observer(data);
      let watch = new Watcher(this, exp, function (value, oldvalue) {
        el.innerHTML = value;
      });
      el.innerHTML = watch.value;
    }
  }

  return vue;

}));
