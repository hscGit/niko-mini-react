// ! flags
export const NoFlags = /*                      */ 0b00000000000000000000;

// 新增、插入
export const Placement = /*                    */ 0b0000000000000000000010; // 2
// 更新
export const Update = /*                       */ 0b0000000000000000000100; // 4
// 删除
export const Deletion = /*                     */ 0b0000000000000000001000; // 8

//*******************************************************************************************

// ! HookFlags
export const HookLayout = /*    */ 0b010;
export const HookPassive = /*   */ 0b100;

//*******************************************************************************************


export function isStr(s) {
  return typeof s === "string";
}

export function isStringOrNumber(s) {
  return typeof s === "string" || typeof s === "number";
}

export function isFn(fn) {
  return typeof fn === "function";
}

export function isUndefined(s) {
  return typeof s === "undefined";
}


export function isArray(arr) {
  return Array.isArray(arr);
}

export function updateNode(node, preVal, nextVal) {
  Object.keys(preVal).forEach(key => {
    if (key === 'children') {
      if (isStringOrNumber(preVal[key])) {
        node.textContent = '';
      }
    } else if (key.startsWith('on')) {
      const eventName = key.slice(2).toLocaleLowerCase();
      node.removeEventListener(eventName, preVal[key]);
    } else {
      if (!(key in nextVal)) {
        node[key] = '';
      }
    }
  })

  Object.keys(nextVal).forEach(key => {
    if (key === 'children') {
      if (isStringOrNumber(nextVal[key])) {
        node.textContent = nextVal[key] + '';
      }
    } else if (key.startsWith('on')) {
      const eventName = key.slice(2).toLocaleLowerCase();
      node.addEventListener(eventName, nextVal[key]);
    } else {
      node[key] = nextVal[key];
    }
  })
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