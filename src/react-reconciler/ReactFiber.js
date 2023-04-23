import { NoFlags } from "./ReactFiberFlags";
import {
  REACT_CONTEXT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PROVIDER_TYPE,
} from "../shared/ReactSymbols";

import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";

import { isFn, isStr } from "../shared/utils";

export function createFiber(tag, pendingProps, key, returnFiber) {
  return new FiberNode(tag, pendingProps, key, returnFiber);
}

function FiberNode(tag, pendingProps, key, returnFiber) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  // 类型
  this.type = null;
  // 不同类型的组件，stateNode也不同
  // 原生标签为dom节点
  // 类组件为class实例
  this.stateNode = null;

  // Fiber
  // 父节点
  this.return = returnFiber;
  // 第一个字节点
  this.child = null;
  // 下一个兄弟节点
  this.sibling = null;
  // 记录节点在当前层级下的位置
  this.index = 0;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  // 不同组件类型，memoizedState存储的内容也不同
  // 1. 函数组件中：存储hooks单链表中的第一个hook
  // 2. 类组件中：存储组件状态state
  this.memoizedState = null;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  // 记录old fiber，在更新时做对比
  this.alternate = null;

  // context
  this.dependencies = null;
}

// 根据type和props创建fiber
export function createFiberFromTypeAndProps(
  type,
  key,
  pendingProps,
  returnFiber
) {
  let fiberTag = IndeterminateComponent;

  if (isStr(type)) {
    fiberTag = HostComponent;
  } else if (isFn(type)) {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
    } else {
      fiberTag = FunctionComponent;
    }
  } else if (type === REACT_FRAGMENT_TYPE) {
    fiberTag = Fragment;
  } else if (type.$$typeof === REACT_PROVIDER_TYPE) {
    fiberTag = ContextProvider;
  } else if (type.$$typeof === REACT_CONTEXT_TYPE) {
    fiberTag = ContextConsumer;
  }

  const fiber = createFiber(fiberTag, pendingProps, key, returnFiber);
  fiber.elementType = type;
  fiber.type = type;

  return fiber;
}

// 根据reactElement创建fiber
export function createFiberFromElement(element, returnFiber) {
  const { type, key } = element;
  const pendingProps = element.props;
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    returnFiber
  );

  return fiber;
}

export function createFiberFormText(context, returnFiber) {
  const fiber = createFiber(HostText, context, null, returnFiber);
  return fiber;
}

function shouldConstruct(Component) {
  // todo 类组件的继承于构造函数Component，tag与函数组件的tag相同
  // 通过isReactComponent区分
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}
