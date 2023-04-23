import { isStringOrNumber } from "../shared/utils";
import { reconcileChildren } from "./ReactChildFiber";
import { renderWithHooks } from "./ReactFiberHooks";
import {
  prepareToReadContext,
  pushProvider,
  readContent,
} from "./ReactNewContext";
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";

export function beginWork(current, workInProgress) {
  const { tag } = workInProgress;
  switch (tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);

    case HostComponent:
      return updateHostComponent(current, workInProgress);

    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress);

    case ClassComponent:
      return updateClassComponent(current, workInProgress);

    case HostText:
      return updateHostText(current, workInProgress);

    case Fragment:
      return updateFragment(current, workInProgress);

    case ContextProvider:
      return updateContextProvider(current, workInProgress);

    case ContextConsumer:
      return updateContextConsumer(current, workInProgress);
  }
}

function updateHostRoot(current, workInProgress) {
  return workInProgress.child;
}

// 更新原生组件
export function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  if (!workInProgress.stateNode) {
    workInProgress.stateNode = document.createElement(type);
    // 更新属性
    updateNode(workInProgress.stateNode, {}, workInProgress.pendingProps);
  }

  let nextChildren = workInProgress.pendingProps.children;

  const isDirectTextChild = shouldSetTextContent(
    type,
    workInProgress.pendingProps
  );

  if (isDirectTextChild) {
    nextChildren = null;
    return null;
  }
  workInProgress.child = reconcileChildren(
    current,
    workInProgress,
    nextChildren
  );
  return workInProgress.child;
}

// 更新函数组件
export function updateFunctionComponent(current, workInProgress) {
  // 处理函数组件中的hooks
  renderWithHooks(workInProgress);
  // 处理函数组件中的context
  prepareToReadContext(workInProgress);

  const { type, pendingProps } = workInProgress;

  const children = type(pendingProps);

  workInProgress.child = reconcileChildren(current, workInProgress, children);

  return workInProgress.child;
}

// 更新类组件
export function updateClassComponent(current, workInProgress) {
  const { type, pendingProps } = workInProgress;

  const context = type.contextType;
  prepareToReadContext(context);
  const newValue = readContent(context);

  const instance = new type(pendingProps);
  instance.context = newValue;
  workInProgress.stateNode = instance;
  const children = instance.render();

  workInProgress.child = reconcileChildren(current, workInProgress, children);

  return workInProgress.child;
}

// 更新Fragment组件
export function updateFragment(current, workInProgress) {
  workInProgress.child = reconcileChildren(
    current,
    workInProgress,
    workInProgress.pendingProps.children
  );
  return workInProgress.child;
}

// 更新文本组件
export function updateHostText(current, workInProgress) {
  if (!workInProgress.stateNode) {
    workInProgress.stateNode = document.createTextNode(
      workInProgress.pendingProps
    );
  }
  return null;
}

export function updateContextProvider(current, workInProgress) {
  const context = workInProgress.type._context;
  const newValue = workInProgress.pendingProps.value;

  pushProvider(context, newValue);

  workInProgress.child = reconcileChildren(
    current,
    workInProgress,
    workInProgress.pendingProps.children
  );

  return workInProgress.child;
}

export function updateContextConsumer(current, workInProgress) {
  const context = workInProgress.type;
  prepareToReadContext(context);
  const newValue = readContent(context);
  const children = workInProgress.pendingProps.children(newValue);

  workInProgress.child = reconcileChildren(current, workInProgress, children);

  return workInProgress.child;
}

function shouldSetTextContent(type, props) {
  return (
    type === "textarea" ||
    type === "noscript" ||
    typeof props.children === "string" ||
    typeof props.children === "number" ||
    (typeof props.dangerouslySetInnerHTML === "object" &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html != null)
  );
}

export function updateNode(node, preVal, nextVal) {
  Object.keys(preVal).forEach((key) => {
    if (key === "children") {
      if (isStringOrNumber(preVal[key])) {
        node.textContent = "";
      }
    } else if (key.startsWith("on")) {
      const eventName = key.slice(2).toLocaleLowerCase();
      node.removeEventListener(eventName, preVal[key]);
    } else {
      if (!(key in nextVal)) {
        node[key] = "";
      }
    }
  });

  Object.keys(nextVal).forEach((key) => {
    if (key === "children") {
      if (isStringOrNumber(nextVal[key])) {
        node.textContent = nextVal[key] + "";
      }
    } else if (key.startsWith("on")) {
      const eventName = key.slice(2).toLocaleLowerCase();
      node.addEventListener(eventName, nextVal[key]);
    } else {
      node[key] = nextVal[key];
    }
  });
}
