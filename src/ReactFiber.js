import { ClassComponent, Fragment, FunctionComponent, HostComponent, HostText } from "./ReactWorkTags";
import { Placement, isFn, isStr, isUndefined } from "./utils";

export function createFiber(vnode, returnFiber) {
    const fiber = {
        // 类型
        type: vnode.type,
        key: vnode.key,
        // 属性
        props: vnode.props,
        // 不同类型的组件，stateNode也不同
        // 原生标签为dom节点
        // 类组件为class实例
        stateNode: null,
        // 第一个字节点
        child: null,
        // 下一个兄弟节点
        sibling: null,
        // 父节点
        return: returnFiber,
        flags: Placement,
        // 记录节点在当前层级下的位置
        index: null,
    }

    const { type } = vnode;

    if (isStr(type)) {
        fiber.tag = HostComponent;
    } else if (isFn(type)) {
        // todo 类组件的继承于构造函数Component，tag与函数组件的tag相同
        // 通过isReactComponent区分
        fiber.tag = type.prototype.isReactComponent ? ClassComponent : FunctionComponent;
    } else if (isUndefined(type)) {
        fiber.tag = HostText;
        fiber.props = { children: vnode };
    } else {
        fiber.tag = Fragment;
    }

    return fiber;
}