
import { Watcher } from '../observer/watcher'
import { set, del } from '../observer/index'

export function stateMixin(vue) {
  vue.prototype.$watch = function (expOrFn, cb, options) {
    const vm = this
    options = options || {}
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
  vue.prototype.$set = set
  vue.prototype.$delete = del
}

