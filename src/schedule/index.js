import { getCurrentTime, isFn } from "../shared/utils";
import { peek, pop, push } from "./SchedulerMinHeap";
import {
  NormalPriority,
  getTimeoutByPriorityLevel,
} from "./SchedulerPriorities";

/*
 * 任务池
 */
// 紧急任务池
let taskQueue = [];
// 延时任务池
let timerQueue = [];

// 是否存在调度
let isMessageLoopRunning = false;

// 当前执行的任务
let currentTask = null;

// 当前任务的优先级
let currentPriorityLevel = NormalPriority;

// 自增id
let taskIdCounter = 1;

// 存储当前倒计时
let taskTimeoutID = -1;

// 是否在倒计时
let isHostTimeoutScheduled = false;

// 是否在调度任务
let isHostCallbackScheduled = false;

// 当前执行任务的callback
let scheduledHostCallback = null;

let isPerformingWork = false;

let schedulePerformWorkUntilDeadline;

// 每次时间切片的开始时间
let startTime = -1;
// 时间切片间隔
let frameInterval = 5;

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }
  return true;
}

export function scheduleCallback(callback, priorityLevel, options) {
  // 获取当前时间
  const currentTime = getCurrentTime();

  // 开始时间
  // 如果需要延时(delay)，开始时间 = 当前时间 + 延时时间
  // 否则开始时间 = 当前时间
  let startTime;
  if (typeof options === "object" && options !== null) {
    let delay = options.delay;
    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  // 等待时间: 不同任务的等待时间不同，根据权限获取延时时间
  const timeout = getTimeoutByPriorityLevel(priorityLevel);

  // 过期时间 = 开始时间 + 等待时间
  const expirtationTime = startTime + timeout;

  // * 创建任务
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirtationTime,
    sortIndex: -1,
  };

  /*
   * 插入任务池
   */
  // 如果开始时间大于当前时间，说明当前task需要需要延时，则放入timerQueue
  if (startTime > currentTime) {
    // 放入之前，设置sortIndex
    newTask.sortIndex = startTime;
    push(newTask, timerQueue);

    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 如果当前taskQueue中没有任务了，并且当前newTask为timerQueue中优先级最高的task
      if (isHostTimeoutScheduled) {
        // 由于当前newTask为timerQueue中优先级最高的task，如果当前存在倒计时，则取消
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // 设置倒计时，时间为延时时间
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    // 放入之前，设置sortIndex
    newTask.sortIndex = expirtationTime;
    push(newTask, taskQueue);

    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
}

// 在当前时间切片内循环执行任务
function workLoop(hasTimeRemaining, initalTime) {
  let currentTime = initalTime;
  addvanceTimers(currentTime);
  // 获取任务池中优先级最高的任务
  currentTask = peek(taskQueue);
  // 循环任务池中的任务并执行
  while (currentTask !== null) {
    const should = shouldYieldToHost();
    if (
      currentTask.expirtationTime > currentTime &&
      (!hasTimeRemaining || should)
    ) {
      // 当前任务还没过期，并且已经到达了时间切片,则结束
      break;
    }
    // 获取任务的callback
    const callback = currentTask.callback;
    currentPriorityLevel = currentTask.priorityLevel;
    if (isFn(callback)) {
      currentTask.callback = null;
      // 是否过期，过期时间是否小于当前时间
      const didUserCallbackTimeout = currentTask.expirtationTime <= currentTime;
      // 执行callback，返回continutionCallback
      const continutionCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (isFn(continutionCallback)) {
        // 如果continutionCallback是一个函数，说明任务没有执行完
        currentTask.callback = continutionCallback;
      } else {
        // 执行完了
        // 判断当前任务时否为堆顶任务
        if (currentTask === peek(taskQueue)) {
          // 是，则删除
          pop(taskQueue);
        }
      }
      addvanceTimers(currentTime);
    } else {
      // 不是函数，说明当前任务不是有效任务
      pop(taskQueue);
    }

    currentTask = peek(taskQueue);
  }

  // 判断是否还有其他任务
  if (currentTask !== null) {
    return true;
  } else {
    // 没用任务，则设置倒计时
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

// 取消当前倒计时
function cancelHostTimeout() {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

// 设置倒计时
function requestHostTimeout(callback, ms) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

// 倒计时结束后执行的任务
function handleTimeout(currentTime) {
  isHostTimeoutScheduled = false;

  addvanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    // 判断是否有任务
    if (peek(taskQueue) !== null) {
      // 有任务
      isHostCallbackScheduled = true;

      // 请求调度
      requestHostCallback(flushWork);
    } else {
      // taskQueue没有任务
      const firstTimer = peek(timerQueue);
      // 判断timerQueue中堆顶是否有任务
      if (firstTimer !== null) {
        // 如果存在，则设置倒计时
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

// 检查timerQueue中的任务，是否有任务到期，到期了就把 有效任务 放入taskQueue
function addvanceTimers(currentTime) {
  let timer = peek(timerQueue);

  while (timer !== null) {
    if (timer.callback === null) {
      // 如果当前任务的callback不存在，则为无效任务，直接删除
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // 判断开始时间是否小于当前时间
      // 如果小于当前时，说明任务已经到期，则把任务放入taskQueue中
      pop(timerQueue);
      timer.sortIndex = timer.expirtationTime;
      push(timer, taskQueue);
    } else {
      // 否则任务没有过期
      return;
    }
    timer = peek(timerQueue);
  }
}

// 调度入口
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    // 调度任务
    schedulePerformWorkUntilDeadline();
  }
}

// 执行调度
const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // 记录时间切片开始时间
    startTime = currentTime;
    // 是否有剩余时间
    const hasTimeRemaining = true;
    // 是否有更多的任务
    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
};

// 创建通道
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

schedulePerformWorkUntilDeadline = () => {
  port.postMessage(null);
};

function flushWork(hasTimeRemaining, initalTime) {
  isHostCallbackScheduled = false;

  // 判断当前是否有倒计时
  if (isHostTimeoutScheduled) {
    // 有，则取消
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  // 记录任务执行之前的当前任务的优先级
  let previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(hasTimeRemaining, initalTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}

// 取消任务
export function cancelCallback(task) {
  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  // 取消任务，不能直接删除，因为最小堆中只能删除堆顶元素
  task.callback = null;
}

// 获取当前任务优先级
export function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

// 暂停任务
function pauseExecution() {
  isSchedulerPaused = true;
}

// 继续被暂停的任务
function continueExecution() {
  isSchedulerPaused = false;
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback(flushWork);
  }
}

// 按照优先级执行事件函数
export function runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

// 执行下一个优先级的事件函数
function unstable_next(eventHandler) {
  var priorityLevel;
  switch (currentPriorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      // 降优先级
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      // 比normal低的话，那就是 LowPriority 或者 IdlePriority ，不能再降了，保持现状吧
      priorityLevel = currentPriorityLevel;
      break;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}
