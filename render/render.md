## 渲染器
一步一步实现一个渲染器。文章整理来源于 [渲染器](http://hcysun.me/vue-design/zh/)

### 1、vnode 的展示
* 基本标签 `vnode` 渲染
```js
function render(vnode, container) {
  mountElement(vnode, container)
}

function mountElement() {
  const el = document.createElement(vnode.tag)
  container.appendChild(el)
}
```
* 组件标签 `vnode` 渲染。    
```js
const componentVnode = {
  tag: MyComponent
}
```
修改 `render` 函数如下，即可实现组件渲染。
```js
function render(vnode, container) {
  mountElement(vnode, container)
  if (typeof vnode.tag === 'string') {
    mountElement(vnode, container)
  } else {
    mountComponent(vnode, container)
  }
}
```
通过判断 `vnode.tag` 是否是字符串来区分 `html` 标签还是组件。















