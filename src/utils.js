// ! flags
export const NoFlags = /*                      */ 0b00000000000000000000;

// 新增、插入
export const Placement = /*                    */ 0b0000000000000000000010; // 2
// 更新
export const Update = /*                       */ 0b0000000000000000000100; // 4
// 删除
export const Deletion = /*                     */ 0b0000000000000000001000; // 8

export function isStr(s) {
  return typeof s === "string";
}

export function isStringOrNumber(s) {
  return typeof s === "string" || typeof s === "number";
}

export function isFn(fn) {
  return typeof fn === "function";
}

export function isArray(arr) {
  return Array.isArray(arr);
}

export function updateNode(node, nextVal) {
  Object.keys(nextVal).forEach(key => {
    if (key === 'children') {
      if (isStringOrNumber(nextVal[key])) {
        node.textContent = nextVal[key];
      }
    } else {
      node[key] = nextVal[key];
    }
  })
}