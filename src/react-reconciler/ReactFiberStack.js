// 抽象出 stack

const valueStack = [];
let index = -1;

export function createCursor(defaultValue) {
  return { current: defaultValue };
}

function isEmpty() {
  return index === -1;
}

export function push(cursor, value) {
  index++;
  valueStack[value] = cursor.current;
  cursor.current = value;
}

export function pop(cursor) {
  if (index < 0) {
    return;
  }
  cursor.current = valueStack[index];
  valueStack[index] = null;
  index--;
}
