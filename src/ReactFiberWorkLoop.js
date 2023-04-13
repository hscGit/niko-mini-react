import {
    updateClassComponent,
    updateFragmentComponent,
    updateFunctionComponent,
    updateHostComponent,
    updateHostTextComponent
} from "./ReactFiberReconciler";
import {
    ClassComponent,
    Fragment,
    FunctionComponent,
    HostComponent,
    HostText
} from "./ReactWorkTags";
import {
    scheduleCallback
} from "./schedule";
import {
    Placement,
    Update,
    updateNode
} from "./utils";

let workInProgress = null; // 当前正在工作中的
let workInProgressRoot = null;

// 初次渲染和更新
export function scheduleUpdateOnFiber(fiber) {
    workInProgress = fiber;
    workInProgressRoot = fiber;

    // 任务调度
    scheduleCallback(workLoop);
}

function performUnitOfWork() {
    const {
        tag
    } = workInProgress;
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
        if (next.sibling) {
            workInProgress = next.sibling;
            return;
        }
        next = next.return;
    }
    workInProgress = null;
}
/*
 * 浏览器requestIdleCallback()方法实现调度
 * function workLoop(IdleDeadline) {
 *     while (workInProgress && IdleDeadline.timeRemaining() > 0) {
 *         performUnitOfWork()
 *     }
 * 
 *     if (!workInProgress && workInProgressRoot) {
 *         commitRoot()
 *     }
 * }
 * 
 * requestIdleCallback(workLoop);
 */

function workLoop() {
    while (workInProgress) {
        performUnitOfWork()
    }

    if (!workInProgress && workInProgressRoot) {
        commitRoot()
    }
}

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
    const parentNode = getParentStateNode(workInProgress.return);
    const {
        flags,
        stateNode,
        deletions
    } = workInProgress;
    if (flags & Placement && stateNode) {
        const before = getHostSibling(workInProgress.sibling);
        insertOrAppendPlacementNode(stateNode, before, parentNode);
    }

    if (flags & Update && stateNode) {
        // 更新
        updateNode(stateNode, workInProgress.alternate.props, workInProgress.props);
    }

    if (deletions) {
        commtDeletions(stateNode || parentNode, deletions);
    }

    // 2.提交子节点
    commitWorker(workInProgress.child);
    // 3.提交兄弟节点
    commitWorker(workInProgress.sibling);
}

function getParentStateNode(parentFiber) {
    let tem = parentFiber;
    while (tem) {
        if (tem.stateNode) {
            return tem.stateNode;
        }
        tem = tem.return;
    }
}

function commtDeletions(parentNode, deletions) {
    for (let i = 0; i < deletions.length; i++) {
        parentNode.removeChild(getStateNode(deletions[i]));
    }
}

function getStateNode(fiber) {
    let tem = fiber;
    while (!tem) {
        tem = tem.child;
    }
    return tem.stateNode;
}

function getHostSibling(sibling) {
    while (sibling) {
        if (sibling.stateNode && !(sibling.flags & Placement)) {
            return sibling.stateNode;
        }
        sibling = sibling.sibling;
    }
    return null;
}

function insertOrAppendPlacementNode(stateNode, before, parentNode) {
    if (before) {
        parentNode.insertBefore(stateNode, before);
    } else {
        parentNode.appendChild(stateNode);
    }
}