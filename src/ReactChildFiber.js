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
    // 上一次记录newFiber的oldFiber的最大index
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
            // 暂存oldFiber
            nextOldFiber = oldFiber;
            // 终止循环
            oldFiber = null;
        } else {
            nextOldFiber = oldFiber.sibling;
        }

        // 创建fiber
        const newFiber = createFiber(newChild, returnFiber);

        // 比较新老fiber
        const same = sameNode(newFiber, oldFiber);

        // 判断新老fiber是否相等
        if (!same) {
            // 不相同，终止循环
            if (oldFiber === null) {
                // 终止循环前将缓存的oldFiber取出
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

        // 判断时否移动位置和记录最远距离
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
        return;
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

            // 判断时否移动位置和记录最远距离
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
    // 4.1 将剩下的oldFer单链表构建哈希表
    const existingChildren = mapRemainingChildren(oldFiber);
    // 4.2 遍历新节点，通过新节点的key去哈希表中查找节点，找到就复用并删除哈希表中对应的节点
    for (; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        if (newChild === null) {
            continue;
        }
        // 创建fiber
        const newFiber = createFiber(newChild, returnFiber);

        // 查找哈希表中是否存在可复用的oldFiber
        const matchedFiber = existingChildren.get(newFiber.key || newFiber.index);

        if (matchedFiber) {
            // 存在，就复用
            Object.assign(newFiber, {
                stateNode: matchedFiber.stateNode,
                alternate: matchedFiber,
                flags: Update
            })

            // 删除哈希表中的已经复用的oldFiber
            existingChildren.delete(newFiber.key || newFiber.index);
        }

        // 判断时否移动位置和记录最远距离
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
    // *5 哈希表中还有，遍历哈希表并删除所有
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
    let existChild = currentFirstChild;
    // 循环链表
    while (existChild) {
        // 将链表中的fiber插入哈希表
        existChildren.set(existChild.key || existChild.index, existChild);
        existChild = existChild.sibling;
    }
    return existChildren;
}