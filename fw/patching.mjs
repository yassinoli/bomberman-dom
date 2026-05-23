import { diffDOM } from "./diffing.mjs";
import { ROOT, removeDomAttribute, extractElement, buildVirtualDomFromRoute, getNodeByPath, createRealNode, setDomAttribute, setEventListener, removeEventListener } from "./helpers.mjs";

/**
 * Updates the real DOM by comparing the current DOM tree
 * with a newly generated virtual DOM tree.
 *
 * The function:
 * 1. Extracts the current DOM structure
 * 2. Builds a new virtual DOM from the current route
 * 3. Calculates differences between both trees
 * 4. Applies only the necessary changes to the real DOM
 *
 * Supported operations:
 * - Text updates
 * - Attribute updates/removals
 * - Event listener updates/removals
 * - Node replacement
 * - Node insertion
 * - Node removal
 *
 * @param {Object} router - Current router state used to build the new virtual DOM
 */
export function patchDOM(router) {
  // Root application container
  const parent = ROOT;

  // Current DOM converted into a virtual structure
  const oldTree = extractElement(ROOT);

  // New virtual DOM generated from the active route
  const newTree = buildVirtualDomFromRoute(router);

  // Compute differences between old and new trees
  const diffs = diffDOM(oldTree, newTree);

  // Apply each diff operation to the real DOM
  diffs.forEach((diff) => {
    // Find the targeted DOM node using the diff path
    const target = getNodeByPath(parent, diff.path);

    switch (diff.type) {
      /**
       * Update text content
       */
      case "TEXT":
        if (target) {
          target.textContent = diff.newValue;
        }
        break;

      /**
       * Add or update an attribute
       */
      case "ATTRIBUTE":
        if (target) {
          setDomAttribute(target, diff.attribute, diff.newValue);
        }
        break;

      /**
       * Remove an attribute
       */
      case "REMOVE_ATTRIBUTE":
        if (target) {
          removeDomAttribute(target, diff.attribute);
        }
        break;

      /**
       * Add or update an event listener
       */
      case "EVENT":
        if (target) {
          setEventListener(target, diff.eventType, diff.newValue);
        }
        break;

      /**
       * Remove an event listener
       */
      case "REMOVE_EVENT":
        if (target) {
          removeEventListener(target, diff.eventType);
        }
        break;

      /**
       * Replace an entire DOM node
       */
      case "REPLACE":
        if (target && target.parentNode) {
          const newElement = createRealNode(diff.newValue);
          target.parentNode.replaceChild(newElement, target);
        }
        break;

      /**
       * Add a new child node
       */
      case "ADD": {
        // Get the parent path from the child path
        const parentPath = diff.path.replace(/\.children\[\d+\]$/, "");

        const parentNode = getNodeByPath(parent, parentPath);

        if (parentNode) {
          parentNode.appendChild(createRealNode(diff.newValue));
        }

        break;
      }

      /**
       * Remove a DOM node
       */
      case "REMOVE":
        if (target && target.parentNode) {
          target.parentNode.removeChild(target);
        }
        break;
    }
  });
}
