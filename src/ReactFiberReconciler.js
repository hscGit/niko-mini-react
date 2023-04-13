import { reconcileChildren } from "./ReactChildFiber";
import { renderWithHooks } from "./hooks";
import { updateNode } from "./utils";

// 更新原生组件
export function updateHostComponent(workInProgress) {
    if (!workInProgress.stateNode) {
        workInProgress.stateNode = document.createElement(workInProgress.type);
        updateNode(workInProgress.stateNode, {}, workInProgress.props);
    }

    reconcileChildren(workInProgress, workInProgress.props.children);
}

// 更新函数组件
export function updateFunctionComponent(workInProgress) {
    // 处理函数组件中的hooks
    renderWithHooks(workInProgress);

    const { type, props } = workInProgress;

    const children = type(props);
    reconcileChildren(workInProgress, children);
}

// 更新类组件
export function updateClassComponent(workInProgress) {
    const { type, props } = workInProgress;
    const instance = new type(props);

    const children = instance.render();
    reconcileChildren(workInProgress, children);
}

// 更新Fragment组件
export function updateFragmentComponent(workInProgress) {
    reconcileChildren(workInProgress, workInProgress.props.children);
}

// 更新文本组件
export function updateHostTextComponent(workInProgress) {
    workInProgress.stateNode = document.createTextNode(workInProgress.props.children);
}