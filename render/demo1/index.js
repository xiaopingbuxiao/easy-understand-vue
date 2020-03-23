

class MyComponent {
  /* render函数返回的vnode */
  render() {
    return {
      tag: 'div'
    }
  }
}



function render(vnode, container) {
  if (typeof vnode.tag === 'string') {
    mountElement(vnode, container)
  } else {
    mountComponent(vnode, container)
  }
}

function mountElement(vnode, container) {
  const el = document.createElement(vnode.tag)
  container.appendChild(el)
}
/* 组件vnode */

const componentVnode = {
  tag: MyComponent
}

function mountComponent(vnode, container) {
  const instance = new vnode.tag()
  instance.$vnode = instance.render()
  console.log(instance.$vnode)
  mountElement(instance.$vnode, container)
}


/* 正常vnode */
const normalVnde = {
  tag: 'h1'
}

// render(componentVnode,document.querySelector('#app'))
render(componentVnode, document.querySelector('#app'))
render(normalVnde, document.querySelector('#app'))






