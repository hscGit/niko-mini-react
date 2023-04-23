import { createFiberRoot } from "../react-reconciler/ReactFiberRoot";
import { updateContainer } from "../react-reconciler/ReactFiberWorkLoop";

function ReactDomRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

ReactDomRoot.prototype.render = function render(children) {
  updateContainer(children, this._internalRoot);
};

function createRoot(container) {
  const root = createFiberRoot(container);

  return new ReactDomRoot(root);
}

export { createRoot };
