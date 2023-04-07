import { createFiber } from "./ReactFiber";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

function ReactDomRoot(internalRoot) {
    this._internalRoot = internalRoot;
}

ReactDomRoot.prototype.render = function render(children) {
    const root = this._internalRoot;
    updateContainer(children, root);
}

function updateContainer(element, container) {
    const { containerInfo } = container;
    let fiber = createFiber(element, {
        type: containerInfo.nodeName.toLocaleLowerCase(),
        stateNode: containerInfo
    });
    scheduleUpdateOnFiber(fiber);
}

function createRoot(container) {
    const root = { containerInfo: container };
    return new ReactDomRoot(root);
}

export { createRoot };