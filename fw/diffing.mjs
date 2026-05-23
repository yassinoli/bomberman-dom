/**
 * Compares two virtual DOM nodes and returns a list
 * of differences required to transform the old tree
 * into the new tree.
 *
 * The diffing process handles:
 * - Node additions
 * - Node removals
 * - Node replacements
 * - Text updates
 * - Attribute updates/removals
 * - Event listener updates/removals
 * - Recursive children comparison
 *
 * Each diff object contains:
 * - type       → the kind of change
 * - path       → location of the node in the tree
 * - oldValue   → previous value (when applicable)
 * - newValue   → updated value (when applicable)
 *
 * @param {Object|null} oldNode - Existing virtual DOM node
 * @param {Object|null} newNode - New virtual DOM node
 * @param {string} path - Current traversal path in the tree
 *
 * @returns {Array<Object>} Array of diff operations
 */
export function diffDOM(oldNode, newNode, path = "root") {
  // Stores all detected changes
  const diffs = [];

  /**
   * NODE REMOVED
   * If the new node does not exist,
   * the old node should be removed.
   */
  if (!newNode) {
    diffs.push({
      type: "REMOVE",
      path,
      oldValue: oldNode,
    });

    return diffs;
  }

  /**
   * NODE ADDED
   * If the old node does not exist,
   * the new node should be inserted.
   */
  if (!oldNode) {
    diffs.push({
      type: "ADD",
      path,
      newValue: newNode,
    });

    return diffs;
  }

  /**
   * NODE REPLACEMENT
   * Replace the entire node if the tag names differ.
   */
  if (oldNode.tagName !== newNode.tagName) {
    diffs.push({
      type: "REPLACE",
      path,
      oldValue: oldNode,
      newValue: newNode,
    });

    return diffs;
  }

  /**
   * TEXT NODE COMPARISON
   * Only compare text content for text nodes.
   */
  if (oldNode.tagName === "text") {
    if (oldNode.content !== newNode.content) {
      diffs.push({
        type: "TEXT",
        path,
        oldValue: oldNode.content,
        newValue: newNode.content,
      });
    }

    return diffs;
  }

  // Extract attributes safely
  const oldAttrs = oldNode.attributes || {};
  const newAttrs = newNode.attributes || {};

  /**
   * CHANGED OR ADDED ATTRIBUTES
   */
  for (const key in newAttrs) {
    /**
     * EVENT HANDLER DETECTION
     * Example:
     * onclick -> click
     */
    if (key.startsWith("on") && typeof newAttrs[key] === "function") {
      diffs.push({
        type: "EVENT",
        path,
        eventType: key.slice(2).toLowerCase(),
        newValue: newAttrs[key],
      });

      continue;
    }

    // Attribute value changed
    if (oldAttrs[key] !== newAttrs[key]) {
      diffs.push({
        type: "ATTRIBUTE",
        path,
        attribute: key,
        oldValue: oldAttrs[key],
        newValue: newAttrs[key],
      });
    }
  }

  /**
   * REMOVED ATTRIBUTES
   */
  for (const key in oldAttrs) {
    if (!(key in newAttrs)) {
      diffs.push({
        type: "REMOVE_ATTRIBUTE",
        path,
        attribute: key,
        oldValue: oldAttrs[key],
      });
    }
  }

  // Extract event maps safely
  const oldEvents = oldNode.events || {};
  const newEvents = newNode.events || {};

  /**
   * CHANGED OR ADDED EVENTS
   */
  for (const eventType in newEvents) {
    if (oldEvents[eventType] !== newEvents[eventType]) {
      diffs.push({
        type: "EVENT",
        path,
        eventType,
        newValue: newEvents[eventType],
      });
    }
  }

  /**
   * REMOVED EVENTS
   */
  for (const eventType in oldEvents) {
    if (!(eventType in newEvents)) {
      diffs.push({
        type: "REMOVE_EVENT",
        path,
        eventType,
      });
    }
  }

  /**
   * CHILDREN COMPARISON
   * Recursively diff all children nodes.
   */
  const oldChildren = oldNode.children || [];
  const newChildren = newNode.children || [];

  // Compare using the largest children count
  const max = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < max; i++) {
    diffs.push(...diffDOM(oldChildren[i], newChildren[i], `${path}.children[${i}]`));
  }

  return diffs;
}
