import { peek, pop, push } from "./minHeap";

// 任务池
let taskQueue = [];

// 自增id
let taskIdCounter = 1;

// 创建通道
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = function () {
    workLoop();
}

export function scheduleCallback(callback) {
    // 获取当前时间
    const currentTime = getCurrentTime();

    // 延时时间
    const timeOut = -1;

    // 过期时间
    const expirtationTime = currentTime + timeOut;

    // 创建任务
    const newTask = {
        id: taskIdCounter ++,
        callback,
        expirtationTime,
        sortIndex: expirtationTime
    };

    // 插入任务池
    push(newTask, taskQueue);

    // 请求调度
    requestHostCallback()
}

function requestHostCallback() {
    port.postMessage(null);
}

function workLoop() {
    // 获取任务池中优先级最高的任务
    let currentTask = peek(taskQueue);
    // 循环任务中的任务并执行
    while (currentTask) {
        // 获取任务的callback
        const callback = currentTask.callback;
        // 置空当前任务的callback，防止重复调用
        currentTask.callback = null;
        // 执行callback
        callback();
        // 将当前任务在任务池中删除
        pop(taskQueue);
        // 再获取任务池中优先级最高的任务，循环继续
        currentTask = peek(taskQueue);
    }
}

export function getCurrentTime() {
    return performance.now();
}