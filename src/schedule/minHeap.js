/*
 * 最小堆实现
*/

// 获取最小堆堆顶元素
export function peek(heap) {
    return heap.length === 0 ? null : heap[0];
}

// 插入
// 1. 尾部插入
// 2. 向上调整
export function push(node, heap) {
    // push后的下标就是push前的长度
    let index = heap.length;
    // push
    heap.push(node);
    // 执行向上调整方法
    siftUp(heap, node, index);
}

// 删除
// 1. 将最后一个元素占据头部
// 2. 删除最后一个元素
// 3. 头部元素向下调整
export function pop(heap) {
    // 如果数组长度为0的话就不继续
    if (heap.length === 0) {
        return;
    }

    // 数组第一个元素
    const first = heap[0];
    // 数组最后一个元素
    const last = heap.pop();
    // 判断第一个元素与最后一个元素是否相等
    if (first !== last) {
        // 不相等，将最后一个元素覆盖到第一个元素
        heap[0] = last;
        // 执行向下调整方法
        siftDown(heap, last, 0);
    }
}

// 向上调整
function siftUp(heap, node, i) {
    // 存储当前下标
    let index = i;
    // index>0的原因：已经调整到数组第一个位置的时候不再需要调整
    while (index > 0) {
        // 获取二叉树头节点下标
        const prarentIndex = (index - 1) >> 1;
        // 获取二叉树头节点
        const parent = heap(prarentIndex);
        // 判断二叉树头节点下标是否比当前节点大
        if (compare(parent, node) > 0) {
            // parent > node
            // 交换位置
            heap[prarentIndex] = node;
            heap[index] = parent;
            // 当前节点下标变成头节点下标，循环继续
            index = prarentIndex;
        } else {
            // 已经符合最小堆，上面的祖先本身就是最小堆结构，因此停止调整
            return;
        }
    }
}

// 向下调整
function siftDown(heap, node, i) {
    // 存储当前下标
    let index = i;
    // 获取数组长度
    const len = heap.length;
    // 获取数组半长度，
    const halfLen = len >> 1;

    while (index < halfLen) {
        // 获取二叉树左子节点下标
        const leftIndex = (index + 1) * 2 - 1;
        // 获取二叉树右子节点下标
        const rightIndex = leftIndex + 1;
        // 获取二叉树左子节点
        const left = heap[leftIndex];
        // 获取二叉树右子节点
        const right = heap[rightIndex];

        // 比较左子节点与当前节点大小
        if (compare(node, left) > 0) {
            // left > node

            // 当右子节点存在时，比价右子节点与当前节点打下
            if (rightIndex < len && compare(left, right) > 0) {
                // left > right > node
                // 交换当前节点与右子节点的位置
                heap[rightIndex] = node;
                heap[index] = right;
                // 当前节点下标变成右子节点下标，循环继续
                index = rightIndex;
            } else {
                // 否则 右子节点不存在 或者 右子节点大于当前节点
                // right > left > node
                // 都将当前节点与左子节点交换位置
                heap[leftIndex] = node;
                heap[index] = left;
                // 当前节点下标变成左子节点下标，循环继续
                index = leftIndex;
            }
        } else if (rightIndex < len && compare(node, right) > 0) {
            // 否则 当右子节点存在 且 右子节点大于当前节点
            // right > node > left
            // 交换当前节点与右子节点的位置
            heap[rightIndex] = node;
            heap[index] = right;
            // 当前节点下标变成右子节点下标，循环继续
            index = rightIndex;
        } else {
            // node > left && node > right
            // 已经符合最小堆，上面的祖先本身就是最小堆结构，因此停止调整
            return;
        }
    }
}

function compare(a, b) {
    // return a - b;
    const diff = a.sortIndex - b.sortIndex;
    return diff !== 0 ? diff : a.id - b.id;
}

/*
 * 最小堆测试
*/

// let arr = [3, 9, 8, 6, 10, 15, 13];

// // push(11, arr);

// while (1) {
//     if (arr.length === 0) {
//         break;
//     }
//     console.log('a: ', peek(arr));
//     pop(arr);
// }