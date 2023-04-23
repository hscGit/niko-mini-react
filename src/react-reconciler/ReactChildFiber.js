import { createFiberFormText, createFiberFromElement } from "./ReactFiber";
import { Placement, Update, isArray, isStringOrNumber } from "../shared/utils";

// diff
// 1. 返回第一个子节点
// 2. 构建单链表
export function reconcileChildren(current, returnFiber, nextChildren) {
  //对象或者数组：统一处理，转为数组
  const newChildren = isArray(nextChildren) ? nextChildren : [nextChildren];
  let oldFiber = returnFiber.alternate?.child;
  let nextOldFiber = null;
  // 父组件是否为更新，true为更新，false为初次渲染
  const shouldTrackSideEffects = !!returnFiber.alternate;
  let i = 0;
  // 记录节点在oldfiber中下标最远的位置
  let lastPlacedIndex = 0;
  // 记录第一个子节点，并且函数执行结束时返回
  let resultingFirstChild = null;
  // 记录上一次创建的fiber
  let previousNewFiber = null;

  // *1. 从左往右遍历，比较新老节点，如果可以复用，则继续，否则停止
  for (; oldFiber && i < newChildren.length; i++) {
    const newChild = newChildren[i];
    if (newChild === null) {
      continue;
    }

    if (oldFiber.index > i) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    // 判断新老节点是否可以复用
    if (!sameNode(newChild, oldFiber)) {
      if (oldFiber == null) {
        oldFiber = nextOldFiber;
      }
      break;
    }

    let newFiber;
    if (isStringOrNumber(newChild)) {
      newFiber = createFiberFormText(newChild, returnFiber);
    } else {
      newFiber = createFiberFromElement(newChild, returnFiber);
    }

    lastPlacedIndex = placeChild(
      newFiber,
      lastPlacedIndex,
      i,
      shouldTrackSideEffects
    );

    // 复用
    Object.assign(newFiber, {
      stateNode: oldFiber.stateNode,
      alternate: oldFiber,
      flags: Update,
    });

    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  // *2. 新节点遍历完了，老节点还有，则删除剩余的老节点
  if (i === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }

  // *3. 新节点还有，老节点没了
  if (!oldFiber) {
    for (; i < newChildren.length; i++) {
      const newChild = newChildren[i];
      if (newChild === null) {
        continue;
      }

      let newFiber;
      if (isStringOrNumber(newChild)) {
        newFiber = createFiberFormText(newChild, returnFiber);
      } else {
        newFiber = createFiberFromElement(newChild, returnFiber);
      }
      newFiber.flags = Placement;

      lastPlacedIndex = placeChild(
        newFiber,
        lastPlacedIndex,
        i,
        shouldTrackSideEffects
      );

      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }

  // *4. 新老fiber都存在节点
  const existingChildren = mapRemainingChildren(oldFiber);

  for (; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    if (newChild === null) {
      continue;
    }

    let newFiber;
    if (isStringOrNumber(newChild)) {
      newFiber = createFiberFormText(newChild, returnFiber);
    } else {
      newFiber = createFiberFromElement(newChild, returnFiber);
    }

    const matchFiber = existingChildren.get(newFiber.key || newFiber.index);

    if (matchFiber) {
      Object.assign(newFiber, {
        stateNode: matchFiber.stateNode,
        alternate: matchFiber,
        flags: Update,
      });
      existingChildren.delete(matchFiber.key || matchFiber.index);
    } else {
      newFiber.flags = Placement;
    }

    lastPlacedIndex = placeChild(
      newFiber,
      lastPlacedIndex,
      i,
      shouldTrackSideEffects
    );

    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
  }

  // *5. 新节点遍历完了，判断哈希表是否还有节点，有则删除哈希表中的节点
  if (shouldTrackSideEffects) {
    existingChildren.forEach((child) => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}

// 节点复用
// 1. 同一层级
// 2. 类型相同
// 3. key相同
function sameNode(a, b) {
  return a && b && a.type === b.type && a.key === b.key;
}

// 需要删除的节点的fiber放在deletions数组中，commit阶段统一删除
function deleteChild(returnFiber, childtoDelete) {
  // 获取父fiber中的deletions
  const deletions = returnFiber.deletions;
  // 判断是否存在
  if (deletions) {
    // 存在，则把需要删除的节点fiber添加到数组中
    returnFiber.deletions.push(childtoDelete);
  } else {
    // 不存在，则创建数组并将需要删除的节点fiber添加到数组中
    returnFiber.deletions = [childtoDelete];
  }
}

function deleteRemainingChildren(returnFiber, currentFirstChild) {
  let childtoDelete = currentFirstChild;
  while (childtoDelete) {
    deleteChild(returnFiber, childtoDelete);
    childtoDelete = childtoDelete.sibling;
  }
}

// 初次渲染，只是记录下标
// 更新，检查是否需要移动
function placeChild(newFiber, lastPlacedIndex, i, shouldTrackSideEffects) {
  // 将新的下标负值给index
  newFiber.index = i;
  // * 判断父节点初次渲染，true为初次渲染，false为更新
  // * 父节点为初次渲染，则子节点也为初次渲染
  // * 父节点为更新，子节点可能为初次渲染或更新
  if (!shouldTrackSideEffects) {
    // 父节点为初次渲染
    return lastPlacedIndex;
  }

  // 父节点为更新
  // 获取当前子节点oldFiber
  const current = newFiber.alternate;
  // * 判断是否存在,存在则当前子节点为更新，不存在则当前子节点为初次渲染
  if (current) {
    // 存在，子节点为更新
    const oldIndex = current.index;
    // 当前节点的oldFer的index小于上次记录的最远位置时，说明当前节点发生了位置移动
    if (oldIndex < lastPlacedIndex) {
      // move
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    } else {
      return oldIndex;
    }
  } else {
    // 不存在，子节点为初次渲染
    newFiber.flags |= Placement;
    return lastPlacedIndex;
  }
}

function mapRemainingChildren(currentFirstChild) {
  // 创建哈希表
  const existChildren = new Map();
  let existingChild = currentFirstChild;
  // 循环链表
  while (existingChild) {
    // 将链表中的fiber插入哈希表
    existChildren.set(existingChild.key || existingChild.index, existingChild);
    existingChild = existingChild.sibling;
  }
  return existChildren;
}
