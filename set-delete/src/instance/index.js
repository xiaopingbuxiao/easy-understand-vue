
import { Observer } from '../observer/index'
import { stateMixin } from './state'
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


export default vue

