import { createCursor, pop, push } from "./ReactFiberStack";

let currentlyRenderingFiber = null;
let lastContextDependency = null;
const valueCursor = createCursor(null);

export function prepareToReadContext(workInProgress) {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;

  const { dependencies } = workInProgress;
  if (dependencies) {
    if (dependencies.firstContext) {
      dependencies.firstContext = null;
    }
  }
}

export function pushProvider(context, nextValue) {
  push(valueCursor, context._currentValue);
  context._currentValue = nextValue;
}

export function popProvider(context) {
  const currentValue = valueCursor.current;
  pop(valueCursor);
  context._currentValue = currentValue;
}

export function readContent(context) {
  const value = context._currentValue;

  // const contextItem = {
  //   context,
  //   memoizeValue: value,
  //   next: null,
  // };

  // if (lastContextDependency) {
  //   lastContextDependency = lastContextDependency.next = contextItem;
  // } else {
  //   lastContextDependency = contextItem;
  //   currentlyRenderingFiber.dependencies = { firstContext: contextItem };
  // }

  return value;
}
