/**
 * Root application container element.
 * All DOM updates are applied inside this node.
 */
export const ROOT = document.getElementById("root");

/**
 * Builds a new virtual DOM tree based on
 * the current route from the router object.
 *
 * If the current route does not exist,
 * the fallback "*" route is used instead.
 *
 * @param {Object} router - Application router object
 * @returns {Object} Virtual DOM tree
 */
export function buildVirtualDomFromRoute(router) {
  const currentPath = location.hash.slice(1) || "/";
  const matchedRoute = router.routes[currentPath];

  if (matchedRoute) {
    return router.routes[currentPath].fake();
  } else {
    return router.routes["*"].fake();
  }
}

/**
 * Converts a real DOM element into
 * a serializable virtual DOM object.
 *
 * Handles:
 * - Text nodes
 * - HTML attributes
 * - Recursive child extraction
 *
 * Note:
 * Native DOM event listeners added with
 * addEventListener cannot be extracted.
 *
 * @param {Node} domElement - Real DOM node
 * @returns {Object} Virtual DOM representation
 */
export function extractElement(domElement) {
  /**
   * Handle text nodes separately
   */
  if (domElement.nodeType === Node.TEXT_NODE) {
    return {
      tagName: "text",
      content: domElement.textContent,
    };
  }

  /**
   * Extract all HTML attributes
   */
  const attributes = {};

  for (const attr of domElement.attributes) {
    attributes[attr.name] = attr.value;
  }

  /**
   * Recursively extract children
   */
  const children = [];

  for (const child of domElement.childNodes) {
    children.push(extractElement(child));
  }

  return {
    tagName: domElement.tagName.toLowerCase(),
    attributes,

    // Event listeners cannot be reconstructed from the DOM
    events: {},

    children,
  };
}

/**
 * Creates a new virtual DOM root container
 * with updated child elements.
 *
 * This function acts like a lightweight
 * virtual DOM wrapper generator.
 *
 * @param {Object} parent - Unused parent parameter
 * @param {...Object} elements - Child virtual nodes
 *
 * @returns {Object} Root virtual DOM node
 */
export function createVirtualRootContainer(parent, ...elements) {
  let result = {
    tagName: "div",

    attributes: {
      class: "todoapp",
      id: "root",
    },

    events: {},

    children: [...elements],
  };

  return result;
}

/**
 * Converts a virtual DOM node into
 * a real browser DOM node.
 *
 * Handles:
 * - Text nodes
 * - Attributes
 * - Event listeners
 * - Recursive child rendering
 *
 * @param {Object} vNode - Virtual DOM node
 * @returns {Node|null} Real DOM node
 */
export function createRealNode(vNode) {
  if (!vNode) return null;

  /**
   * Create text node
   */
  if (vNode.tagName === "text") {
    return document.createTextNode(vNode.content);
  }

  /**
   * Create HTML element
   */
  const element = document.createElement(vNode.tagName);

  /**
   * Apply attributes and inline events
   */
  for (const [key, value] of Object.entries(vNode.attributes || {})) {
    if (key === "ref" && typeof value === "function") {
      value(element);
      continue;
    }
    if (key.startsWith("on") && typeof value === "function") {
      setEventListener(element, key.slice(2).toLowerCase(), value);
    } else {
      setDomAttribute(element, key, value);
    }
  }

  /**
   * Apply explicit event listeners
   */
  for (const [eventType, handler] of Object.entries(vNode.events || {})) {
    setEventListener(element, eventType, handler);
  }

  /**
   * Recursively render children
   */
  for (const child of vNode.children || []) {
    const childNode = createRealNode(child);

    if (childNode) {
      element.appendChild(childNode);
    }
  }

  return element;
}

/**
 * Safely attaches an event listener
 * while preventing duplicate listeners.
 *
 * Existing listeners of the same type
 * are removed before attaching the new one.
 *
 * @param {HTMLElement} element - Target DOM element
 * @param {string} eventType - Event type (click, input, etc.)
 * @param {Function} handler - Event callback
 */
export function setEventListener(element, eventType, handler) {
  /**
   * Internal event registry
   */
  if (!element.__fwEventListeners) {
    element.__fwEventListeners = {};
  }

  /**
   * Remove old listener before adding new one
   */
  removeEventListener(element, eventType);

  element.__fwEventListeners[eventType] = handler;

  element.addEventListener(eventType, handler);
}

/**
 * Removes a previously attached event listener
 * from the target element.
 *
 * @param {HTMLElement} element - Target DOM element
 * @param {string} eventType - Event type to remove
 */
export function removeEventListener(element, eventType) {
  const eventListeners = element.__fwEventListeners;

  const oldHandler = eventListeners?.[eventType];

  if (oldHandler) {
    element.removeEventListener(eventType, oldHandler);

    delete eventListeners[eventType];
  }
}

/**
 * Sets a DOM attribute on an element.
 *
 * Special handling exists for boolean
 * attributes such as "checked".
 *
 * @param {HTMLElement} element - Target DOM element
 * @param {string} key - Attribute name
 * @param {*} value - Attribute value
 */
export function setDomAttribute(element, key, value) {
  /**
   * Special handling for checkbox/radio state
   */
  if (key === "checked") {
    element.checked = Boolean(value);

    if (value) {
      element.setAttribute(key, "");
    } else {
      element.removeAttribute(key);
    }

    return;
  }

  element.setAttribute(key, value);
}

/**
 * Removes a DOM attribute from an element.
 *
 * Special handling exists for boolean
 * attributes such as "checked".
 *
 * @param {HTMLElement} element - Target DOM element
 * @param {string} key - Attribute name
 */
export function removeDomAttribute(element, key) {
  /**
   * Reset boolean checked state
   */
  if (key === "checked") {
    element.checked = false;
  }

  element.removeAttribute(key);
}

/**
 * Finds a real DOM node using a virtual DOM path.
 *
 * Example path:
 * root.children[0].children[2]
 *
 * @param {Node} root - Root DOM node
 * @param {string} path - Node traversal path
 *
 * @returns {Node|null} Matched DOM node
 */
export function getNodeByPath(root, path) {
  /**
   * Root node shortcut
   */
  if (path === "root") {
    return root;
  }

  /**
   * Extract all child indexes from path
   */
  const indexes = [...path.matchAll(/children\[(\d+)\]/g)].map((m) => Number(m[1]));

  let current = root;

  /**
   * Traverse through child nodes
   */
  for (const index of indexes) {
    if (!current || !current.childNodes[index]) {
      return null;
    }

    current = current.childNodes[index];
  }

  return current;
}
