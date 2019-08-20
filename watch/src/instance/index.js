
import { Observer } from '../observer/index'
import { stateMixin } from './state'
function vue(data) {
  this.data = data
  new Observer(data)
}
stateMixin(vue)

export default vue

