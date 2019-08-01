

import { Observer } from './Observer'
import { Watcher } from './Watcher'




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










