import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

// 当前正在工作的fiber
let currentlyRenderingFiber = null;
// 当前正在工作的hook
let workInProgressHook = null;

export function renderWithHooks(workInProgress) {
    currentlyRenderingFiber = workInProgress;
    currentlyRenderingFiber.memoizedState = null;
    workInProgressHook = null;
}

function updateWorkInProgressHook() {
    let hook;

    // 获取old fiber
    const current = currentlyRenderingFiber.alternate;
    // 判断old fiber是否存在，如果存在则是 更新阶段 ，否则是 初次渲染
    if (current) {
        /* 
         * 更新阶段
        */
        // 不需要创建hook来形成链表，直接取old fiber中的链表
        currentlyRenderingFiber.memoizedState = current.memoizedState;
        // 判断当前工作的hook是否存在
        if (workInProgressHook) {
            // 存在，不是第一个hook
            // 负值给hook返回
            // 并当前工作中的hook指向当前工作中的hook的下一个hook(next)
            workInProgressHook = hook = workInProgressHook.next;
        } else {
            // 不存在，是第一个hook
            // 负值给hook返回
            // 并当前工作中的hook指向当前工作中的fiber的第一个hook
            workInProgressHook = hook = currentlyRenderingFiber.memoizedState;
        }
    } else {
        /*
         * 初次渲染
        */
        // 创建一个hook并负值给hook返回
        hook = {
            memoizedState: null,
            next: null
        }
        // 判断当前工作的hook存不存在
        if (workInProgressHook) {
            // 不是第一个hook
            // 1. 将创建的hook存储到当前正在工作的hook的next中，形成单链表
            // 2. 当前工作的hook指向当前工作hook的下一个hook(next)
            workInProgressHook = workInProgressHook.next = hook;
        } else {
            // 是第一个hook
            // 1. 将创建的hook存到当前fiber的memoizedState中
            // 2. 当前工作的hook指向第一个hook
            workInProgressHook = currentlyRenderingFiber.memoizedState = hook;
        }
    }

    return hook;
}

export function useReducer(reducer, initalState) {
    // 获取当前的hook
    const hook = updateWorkInProgressHook();

    // 判断是否存在old fiber，不存在为初次渲染，否则为更新
    if (!currentlyRenderingFiber.alternate) {
        // 不存在，初次渲染，将initialState存到hook中
        hook.memoizedState = initalState;
    }

    const dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, hook, reducer);

    return [hook.memoizedState, dispatch];
}

function dispatchReducerAction(fiber, hook, reducer, action) {
    // 修改状态
    hook.memoizedState = reducer ? reducer(hook.memoizedState) : action;
    fiber.alternate = { ...fiber };
    fiber.sibling = null;
    scheduleUpdateOnFiber(fiber);
}

export function useState(initalState) {
    return useReducer(null, initalState);
}