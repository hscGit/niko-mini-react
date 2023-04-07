import { updateClassComponent, updateFragmentComponent, updateFunctionComponent, updateHostComponent, updateHostTextComponent } from "./ReactFiberReconciler";
import { ClassComponent, Fragment, FunctionComponent, HostComponent, HostText } from "./ReactWorkTags";
import { Placement } from "./utils";

let workInProgress = null; // 当前正在工作中的
let workInProgressRoot = null;

// 初次渲染和更新
export function scheduleUpdateOnFiber(fiber) {
    workInProgress = fiber;
    workInProgressRoot = fiber;
}

function performUnitOfWork() {
    const { tag } = workInProgress;
    // todo    1.更新当前组件
    switch (tag) {
        case HostComponent:
            updateHostComponent(workInProgress);
            break;

        case FunctionComponent:
            updateFunctionComponent(workInProgress);
            break;

        case ClassComponent:
            updateClassComponent(workInProgress);
            break;

        case Fragment:
            updateFragmentComponent(workInProgress);
            break;

        case HostText:
            updateHostTextComponent(workInProgress);
            break;

        default:
            break;
    }

    // todo    2.深度优先遍历
    if (workInProgress.child) {
        workInProgress = workInProgress.child;
        return;
    }

    let next = workInProgress;

    while (next) {
        if (workInProgress.sibling) {
            workInProgress = next.sibling;
            return;
        }
        next = next.return;
    }
    workInProgress = null;
}

function workLoop(IdleDeadline) {
    while (workInProgress && IdleDeadline.timeRemaining() > 0) {
        performUnitOfWork()
    }

    if (!workInProgress && workInProgressRoot) {
        commitRoot()
    }
}

requestIdleCallback(workLoop);

// 提交
function commitRoot() {
    commitWorker(workInProgressRoot);
    workInProgressRoot = null;
}

function commitWorker(workInProgress) {
    if (!workInProgress) {
        return;
    }
    // 1.提交自己
    // parentNode是父DOM节点
    const parentNode = workInProgress.return.stateNode;
    const { flags, stateNode } = workInProgress;
    if (flags & Placement && stateNode) {
        parentNode.appendChild(stateNode);
    }
    // 2.提交子节点
    commitWorker(workInProgress.child);
    // 3.提交兄弟节点
    commitWorker(workInProgress.sibling);
}