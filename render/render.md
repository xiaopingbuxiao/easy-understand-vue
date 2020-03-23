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
class MyComponent {
  /* render函数返回的vnode */
  render() {
    return {
      tag: 'div'
    }
  }
}
```

修改 `render` 函数如下，即可实现组件渲染。
```js
function render(vnode, container) {
  if (typeof vnode.tag === 'string') {
    mountElement(vnode, container)
  } else {
    mountComponent(vnode, container)
  }
}
function mountComponent(vnode, container) {
  const instance = new vnode.tag()
  instance.$vnode = instance.render()
  console.log(instance.$vnode)
  mountElement(instance.$vnode, container)
}
```
通过判断 `vnode.tag` 是否是字符串来区分 `html` 标签还是组件。



**总结：** 其实上面的两个状态分别代表了**函数式组件**和**有状态组件**。     
区别：      
1、函数式组件：
* 一个纯函数
* 没有自身状态，只接收外部数据
* 产出 VNode 的方式：单纯的函数调用
2、有状态组件：   
* 是一个类，可实例化
* 可以有自身状态
* 产出 `VNode` 的方式：需要实例化，然后调用其 `render` 函数


[demo](https://codesandbox.io/s/dark-glade-lz6uk)









### 2、vode 的设计
