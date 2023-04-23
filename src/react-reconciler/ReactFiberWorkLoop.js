import {
  ContextProvider,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { scheduleCallback } from "../schedule";
import { Placement, Update } from "../shared/utils";
import { createFiberFromElement } from "./ReactFiber";
import { beginWork, updateNode } from "./ReactFiberBeginWork";
import { NormalPriority } from "../schedule/SchedulerPriorities";
import { HookHasEffect, HookLayout, HookPassive } from "./ReactFiberEffectTags";
import { Passive } from "./ReactFiberFlags";
import { popProvider } from "./ReactNewContext";

let workInProgress = null; // 当前正在工作中的
let workInProgressRoot = null;

export function updateContainer(element, root) {
  root.current.child = createFiberFromElement(element, root.current);
  root.current.child.flags = Placement;
  scheduleUpdateOnFiber(root, root.current);
}

// 初次渲染和更新
export function scheduleUpdateOnFiber(root, fiber) {
  workInProgressRoot = root;
  workInProgress = fiber;

  // 任务调度
  scheduleCallback(workLoop, NormalPriority);
}

// 处理当前fiber，更新workInProgress
function performUnitOfWork(unitOfWork) {
  // oldFiber
  const current = unitOfWork.alternate;
  /*
   * 深度优先遍历
   */

  let next = beginWork(current, unitOfWork); // 处理fiber，返回子节点
  // 判断子节点存不存在
  if (next === null) {
    // 不存在，则则找兄弟节点或父节点的兄弟节点
    completeUnitOfWork(unitOfWork);
  } else {
    // 存在
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    if (completedWork.tag === ContextProvider) {
      const context = completedWork.type._context;
      popProvider(context);
    }
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    const returnFiber = completedWork.return;
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork);
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
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }

  if (!workInProgress && workInProgressRoot) {
    commitRoot();
  }
}

// 提交
function commitRoot() {
  commitMutationEffects(workInProgressRoot.current.child, workInProgressRoot);

  const root = workInProgressRoot.current.child;
  scheduleCallback(() => {
    flushPassiveEffect(root);
  }, NormalPriority);

  workInProgress = null;
  workInProgressRoot = null;
}

function flushPassiveEffect(finishedWork) {
  recursivelyTraversePassiveMountEffects(finishedWork);
  commitPassiveMountEffects(finishedWork);
}

function recursivelyTraversePassiveMountEffects(parentFiber) {
  let child = parentFiber.child;

  while (child !== null) {
    commitPassiveMountEffects(child);
    child = child.sibling;
  }
}

function commitPassiveMountEffects(finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
      if (finishedWork.flags & Passive) {
        commitHookEffects(finishedWork, HookPassive);
      }
      finishedWork.flags &= ~Passive;
      break;

    default:
      break;
  }
}

function commitMutationEffects(finishedWork, root) {
  recursivelyTraverseMutationEffects(root, finishedWork);
  commitReconciliationEffects(finishedWork);
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
  let child = parentFiber.child;

  while (child !== null) {
    commitMutationEffects(child, root);
    child = child.sibling;
  }
}

function commitReconciliationEffects(finishedWork) {
  const flags = finishedWork.flags;
  if (flags & Placement) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }

  if (flags & Update) {
    switch (finishedWork.tag) {
      case HostComponent:
        if (finishedWork.stateNode) {
          updateNode(
            finishedWork.stateNode,
            finishedWork.alternate.pendingProps,
            finishedWork.pendingProps
          );
        }
        break;

      case FunctionComponent:
        commitHookEffects(finishedWork, HookLayout);
        break;

      default:
        break;
    }

    finishedWork.flags &= ~Update;
  }

  if (finishedWork.deletions) {
    const parentFiber = isHostParent(finishedWork)
      ? finishedWork
      : getParentStateFiber(finishedWork);
    const parent = parentFiber.stateNode;
    commtDeletions(finishedWork.deletions, parent);
    finishedWork.deletions = null;
  }
}

function commitHookEffects(finishedWork, hookFlags) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & hookFlags) === hookFlags) {
        const create = effect.create;
        effect.destory = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

// 在dom上把子节点插入到父节点
function commitPlacement(finishedWork) {
  const parentFiber = getParentStateFiber(finishedWork);
  // 插入父dom节点
  if (
    finishedWork.stateNode &&
    (finishedWork.tag === HostText || finishedWork.tag === HostComponent)
  ) {
    let parent = parentFiber.stateNode;
    if (parent.containerInfo) {
      parent = parent.containerInfo;
    }
    const before = getHostSibling(finishedWork);
    insertOrAppendPlacementNode(finishedWork, before, parent);
  }
}

function getParentStateFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function commtDeletions(deletions, parent) {
  deletions.forEach((deletion) => {
    parent.removeChild(getStateNode(deletion));
  });
}

// 判断是否是原生节点
function isHost(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostText;
}

function getStateNode(fiber) {
  let node = fiber;
  while (1) {
    if (isHost(node) && node.stateNode) {
      return node.stateNode;
    }
    node = node.child;
  }
}

// 返回fiber的下一个兄弟节点
function getHostSibling(fiber) {
  let node = fiber;
  sibling: while (1) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    while (node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) {
        continue sibling;
      }
      if (node.child === null) {
        continue sibling;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNode(node, before, parentNode) {
  const { tag } = node;
  const isHost = tag === HostComponent || HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      parentNode.insertBefore(stateNode, before);
    } else {
      parentNode.appendChild(stateNode);
    }
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function invokeHooks(workInProgress) {
  const { updateEffectOfEffect, updateEffectOfLayout } = workInProgress;

  for (let i = 0; i < updateEffectOfLayout.length; i++) {
    const effect = updateEffectOfLayout[i];
    effect.create();
  }

  for (let i = 0; i < updateEffectOfEffect.length; i++) {
    const effect = updateEffectOfEffect[i];
    scheduleCallback(() => {
      effect.create();
    });
  }
}
