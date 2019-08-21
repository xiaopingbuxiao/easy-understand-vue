(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.vue = factory());
}(this, function () { 'use strict';

  let uid = 0;
  /* 源码 observer/Dep.js */
  class Dep {
    constructor() {
      this.id = uid++;
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
        // this.addSub(Dep.target)
        Dep.target.addDep(this);
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

  const arrayProto = Array.prototype;
  const arrayMethods = Object.create(arrayProto);

  const methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
  ];

  methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    Object.defineProperty(arrayMethods, method, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function mutator(...args) {
        // 发送数组变化的通知
        let result = original.apply(this, args);
        const ob = this.__ob__;
        let inserted;
        switch (method) {
          case 'push':
          case 'unshift':
            inserted = args;
            break
          case 'splice':
            inserted = args.slice(2);
            break
        }
        if (inserted) ob.observeArray(inserted);
        ob.dep.notify();
        return result
      }
    });
  });

  const arrayKeys = Object.getOwnPropertyNames(arrayMethods);


  class Observer {
    constructor(value) {
      this.value = value;
      this.dep = new Dep();
      def(value, '__ob__', this);
      if (Array.isArray(value)) {
        if ('__proto__' in {}) {
          protoAugment(value, arrayMethods);
        } else {
          copyAugment(value, arrayMethods, arrayKeys);
        }
        this.observeArray(value);
      } else {
        this.walk(value);
      }
    }
    walk(obj) {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        defineReactive(obj, keys[i], obj[keys[i]]);
      }
    }
    observeArray(items) {
      for (let i = 0, l = items.length; i < l; i++) {
        observe(items[i]);
      }
    }
  }



  function defineReactive(data, key, value) {
    let childOb = observe(value);
    let dep = new Dep();
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: true,
      set(newValue) {
        if (newValue === value) {
          return
        }
        value = newValue;
        dep.notify();
      },
      get() {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
        }
        return value
      }
    });
  }

  function observe(value, asRootData) {
    if (!isObject(value)) {
      return
    }
    let ob;
    if ('__ob__' in value && value.__ob__ instanceof Observer) {
      ob = value.__ob__;
    } else {
      ob = new Observer(value);
    }
    return ob
  }

  function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    });
  }

  function protoAugment(target, src) {
    target.__proto__ = src;
  }

  function copyAugment(target, src, keys) {
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      def(target, key, src[key]);
    }
  }

  function isObject(obj) {
    return obj !== null && typeof obj === 'object'
  }





  function set(target, key, val) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val
    }
    if (key in target && !(key in Object.prototype)) {
      target[key] = val;
      return val
    }
    const ob = target.__ob__;
    if (!ob) {
      target[key] = val;
      return val
    }
    defineReactive(ob.value, key, val);
    ob.dep.notify();
    return val
  }


  function del(target, key) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.splice(key, 1);
      return
    }
    const ob = target.__ob__;
    if (!hasOwn(target, key)) {
      return
    }
    delete target[key];
    if (!ob) {
      return
    }
    ob.dep.notify();
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key)
  }

  class Watcher {
    constructor(vm, expOrFn, cb, options) {
      this.vm = vm;
      // this.expOrFn = expOrFn
      if (options) {
        this.deep = !!options.deep;
      } else {
        this.depIds = false;
      }
      this.cb = cb;
      this.deps = [];
      this.depIds = new Set();
      if (typeof expOrFn === 'function') {
        this.getter = expOrFn;
      } else {
        this.getter = parsePath(expOrFn);    // 用来读取 a.b.c
      }
      this.value = this.get();
    }
    addDep(dep) {
      const id = dep.id;
      if (!this.depIds.has(id)) {
        this.depIds.add(id);
        this.deps.push(dep);
        dep.addSub(this);
      }
    }
    teardown() {
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
    }
    get() {
      Dep.target = this;
      // let value = this.vm.data[this.expOrFn]
      let value = this.getter.call(this.vm, this.vm.data);
      if (this.deep) {
        traverse(value);
      }
      Dep.target = null;
      return value
    }
    update() {
      this.run();
    }
    run() {
      const value = this.get();
      const oldValue = this.value;
      this.value = value;
      this.cb.call(this.vm, value, oldValue);
    }
  }


  /* 源码observer/traverse.js */
  const seenObjects = new Set();

  function traverse(val) {
    _traverse(val, seenObjects);
    seenObjects.clear();
  }

  function isObject$1(obj) {
    return obj !== null && typeof obj === 'object'
  }

  function _traverse(val, seen) {
    // console.log(seen, val, 111)
    let i, keys;
    const isA = Array.isArray(val);
    if ((!isA && !isObject$1(val)) || Object.isFrozen(val)) {
      return
    }
    if (val.__ob__) {
      const depId = val.__ob__.dep.id;
      if (seen.has(depId)) {
        return
      }
      seen.add(depId);
    }
    if (isA) {
      i = val.length;
      while (i--) _traverse(val[i], seen);
    } else {
      keys = Object.keys(val);
      i = keys.length;
      while (i--) _traverse(val[keys[i]], seen);
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

  function stateMixin(vue) {
    vue.prototype.$watch = function (expOrFn, cb, options) {
      const vm = this;
      options = options || {};
      const watcher = new Watcher(vm, expOrFn, cb, options);
      if (options.immediate) {
        try {
          cb.call(vm, watcher.value);
        } catch (error) {
          handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`);
        }
      }
      return function unwatchFn() {
        watcher.teardown();
      }
    };
    vue.prototype.$set = set;
    vue.prototype.$delete = del;
  }

  function vue(data) {
    this.data = data;
    new Observer(data);
    Object.keys(data).forEach((key) => {
      proxy(this, `data`, key);
    });
  }
  stateMixin(vue);

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

  // import { Observer } from './observer/index'
  // import { Watcher } from './observer/watcher'




  // export default class vue {
  //   constructor(data, el, exp) {
  //     this.data = data
  //     new Observer(data)
  //     let watch = new Watcher(this, exp, function (value, oldvalue) {
  //       el.innerHTML = value
  //     })
  //     el.innerHTML = watch.value
  //   }
  // }

  return vue;

}));
