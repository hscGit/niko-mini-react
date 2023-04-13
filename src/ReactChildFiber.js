import { createFiber } from "./ReactFiber";
import { Placement, Update, isArray, isStringOrNumber } from "./utils";

// diff
export function reconcileChildren(returnFiber, children) {
    // children有很多种可能情况：
    // 数字或者字符串：不对比，直接替换
    if (isStringOrNumber(children)) {
        return;
    }

    //对象或者数组：统一处理，转为数组
    const newChildren = isArray(children) ? children : [children];

    // 获取old fiber上的子节点fiber
    let oldFiber = returnFiber.alternate?.child;
    // 下一个oldFiber ｜｜ 暂时缓存oldFiber
    let nextOldFiber = null;
    // 用于判断父fiber是更新还是初次渲染，更新true，初次渲染是false
    let shouldTrackSideEffects = !!returnFiber.alternate;

    // 记录上一次的newfiber
    let previousNewFiber = null;
    // 循环下标
    let i = 0;
    // 上一次遍历的节点在oldFiber中的位置
    let lastPlacedIndex = 0;

    // old 0 1 2 3 4
    // new 2 1 3 4

    // *1. 从左往右遍历，比较新老节点，如果有节点可以复用就继续，否则停止
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

        const newFiber = createFiber(newChild, returnFiber);

        const same = sameNode(newFiber, oldFiber);

        // 判断新老fiber是否相等
        if (!same) {
            if (oldFiber === null) {
                oldFiber = nextOldFiber;
            }
            break;
        }

        // 相同， 则复用
        Object.assign(newFiber, {
            stateNode: oldFiber.stateNode,
            alternate: oldFiber,
            flags: Update
        })

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, i, shouldTrackSideEffects);

        if (previousNewFiber === null) {
            // 将头节点挂在父节点的child上
            returnFiber.child = newFiber;
        } else {
            // 上次节点fiber的sibling是当前节点fiber
            previousNewFiber.sibling = newFiber;
        }

        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
    }

    // *2. 当标记完需更新的新节点后，老节点（可能有多个）还有，老节点要被删除
    if (i === newChildren.length) {
        deleteRemainingChildren(returnFiber, oldFiber);
    }

    // *3. 初次渲染 || 老节点没了，新节点还有
    if (!oldFiber) {
        // 0 1 2 3 4
        for (; i < newChildren.length; i++) {
            const newChild = newChildren[i];
            if (newChild === null) {
                continue;
            }
            // 创建fiber
            const newFiber = createFiber(newChild, returnFiber);

            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, i, shouldTrackSideEffects);

            if (previousNewFiber === null) {
                // 将头节点挂在父节点的child上
                returnFiber.child = newFiber;
            } else {
                // 上次节点fiber的sibling是当前节点fiber
                previousNewFiber.sibling = newFiber;
            }

            previousNewFiber = newFiber;
        }
    }

    // *4. 新老节点都还有
    // 4.1 将剩下的oldF单链表构建哈希表
    const existingChildren = mapRemainingChildren(oldFiber);
    // 4.2 遍历新节点，通过新节点的key去哈希表中查找节点，找到就复用并删除哈希表中对应的节点
    for (; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        if (newChild === null) {
            continue;
        }
        // 创建fiber
        const newFiber = createFiber(newChild, returnFiber);

        // oldFiber
        const matchFiber = existingChildren.get(newFiber.key || newFiber.index);

        if (matchFiber) {
            Object.assign(newFiber, {
                stateNode: matchFiber.stateNode,
                alternate: matchFiber,
                flags: Update
            })

            existingChildren.delete(newFiber.key || newFiber.index);
        }

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, i, shouldTrackSideEffects);

        if (previousNewFiber === null) {
            // 将头节点挂在父节点的child上
            returnFiber.child = newFiber;
        } else {
            // 上次节点fiber的sibling是当前节点fiber
            previousNewFiber.sibling = newFiber;
        }

        previousNewFiber = newFiber;
    }
    // *5 old哈希表中还有，遍历哈希表并删除所有
    if (shouldTrackSideEffects) {
        existingChildren.forEach(child => deleteChild(returnFiber, child));
    }
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
    const existChildren = new Map();
    let existChild = currentFirstChild;
    while (existChild) {
        existChildren.set(existChild.key || existChild.index, existChild);
        existChild = existChild.sibling;
    }
    return existChildren;
}