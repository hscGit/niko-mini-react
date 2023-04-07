import { createFiber } from "./ReactFiber";
import { isArray, isStringOrNumber, updateNode } from "./utils";

// 更新原生组件
export function updateHostComponent(workInProgress) {
    if (!workInProgress.stateNode) {
        workInProgress.stateNode = document.createElement(workInProgress.type);
        updateNode(workInProgress.stateNode, workInProgress.props);
    }

    reconcileChildren(workInProgress, workInProgress.props.children);
}

// 更新函数组件
export function updateFunctionComponent(params) {
    
}

// 更新类组件
export function updateClassComponent(params) {
    
}

// 更新Fragment组件
export function updateFragmentComponent(params) {
    
}

// 更新文本组件
export function updateHostTextComponent(params) {
    
}

// diff
function reconcileChildren(workInProgress, children) {
    // children有很多种可能情况：
    // 数字或者字符串：不对比，直接替换
    if (isStringOrNumber(children)) {
        return;
    }

    //对象或者数组：统一处理，转为数组
    const newChildren = isArray(children) ? children : [children];

    // 记录上一次的fiber
    let previousNewFiber = null;
    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        if (newChild === null) {
            continue;
        }
        // 创建fiber
        const newFiber = createFiber(newChild, workInProgress);
        if (previousNewFiber === null) {
            // 将头节点挂在父节点的child上
            workInProgress.child = newFiber;
        } else {
            // 上次节点fiber的sibling是当前节点fiber
            previousNewFiber.sibling = newFiber;
        }

        previousNewFiber = newFiber;
    }
}