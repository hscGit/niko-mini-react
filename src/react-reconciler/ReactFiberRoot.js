import { createFiber } from "./ReactFiber";
import { HostRoot } from "./ReactWorkTags";

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);

  root.current = createFiber(HostRoot, null, null, null);
  root.current.stateNode = root;

  return root;
}

export function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo;
  this.current = null;
  this.finishedWork = null;
  this.callbackNode = null;
}
