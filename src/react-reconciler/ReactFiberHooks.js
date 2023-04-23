import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import { isFn } from "../shared/utils";
import { HostRoot } from "./ReactWorkTags";
import { HookHasEffect, HookLayout, HookPassive } from "./ReactFiberEffectTags";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import { readContent } from "./ReactNewContext";

// 当前正在工作的fiber
let currentlyRenderingFiber = null;
// 当前正在工作的hook
let workInProgressHook = null;
// old hook
let currentHook = null;

export function renderWithHooks(workInProgress) {
  currentlyRenderingFiber = workInProgress;
  currentlyRenderingFiber.updateQueue = null;
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
      currentHook = currentHook.next;
    } else {
      // 不存在，是第一个hook
      // 负值给hook返回
      // 并当前工作中的hook指向当前工作中的fiber的第一个hook
      workInProgressHook = hook = currentlyRenderingFiber.memoizedState;
      currentHook = current.memoizedState;
    }
  } else {
    /*
     * 初次渲染
     */
    // 初次渲染不存在old hook
    currentHook = null;

    // 创建一个hook并负值给hook返回
    hook = {
      memoizedState: null,
      next: null,
    };
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

  const dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    hook,
    reducer
  );

  return [hook.memoizedState, dispatch];
}

function dispatchReducerAction(fiber, hook, reducer, action) {
  // 修改状态
  hook.memoizedState = reducer ? reducer(hook.memoizedState) : action;
  fiber.alternate = { ...fiber };
  fiber.sibling = null;
  const root = gerRootForUpdateFiber(fiber);
  scheduleUpdateOnFiber(root, fiber);
}

function gerRootForUpdateFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}

export function useState(initalState) {
  return useReducer(null, isFn(initalState) ? initalState() : initalState);
}

function pushEffect(tag, create, deps) {
  const effect = { tag, create, deps, next: null };

  // 单向循环链表
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;

  if (componentUpdateQueue === null) {
    componentUpdateQueue = { lastEffect: null };
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    const firstEffect = lastEffect.next;
    lastEffect.next = effect;
    effect.next = firstEffect;
    componentUpdateQueue.lastEffect = effect;
  }
  return effect;
}

function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  if (currentHook) {
    const prevEffect = currentHook.memoizedState;
    if (deps) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(deps, prevDeps)) {
        return;
      }
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(HookHasEffect | hookFlags, create, nextDeps);
}

export function useEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

export function useLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

export function useMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }

  const nextValue = nextCreate();

  hook.memoizedState = [nextValue, nextDeps];

  return nextValue;
}

export function useCallback(callback, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }

  hook.memoizedState = [callback, nextDeps];

  return callback;
}

export function useRef(initialValue) {
  const hook = updateWorkInProgressHook();

  if (!currentHook) {
    const ref = { current: initialValue };

    hook.memoizedState = ref;
  }

  return hook.memoizedState;
}

export function useContext(context) {
  return readContent(context);
}

export function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    return false;
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // 浅比较
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
