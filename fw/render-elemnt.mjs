import { setDomAttribute, setEventListener } from "./helpers.mjs";
/**
 * Renders virtual elements into the DOM recursively.
 *
 * @param {boolean} clear - If true, clears the parent before rendering.
 * @param {HTMLElement} parent - The parent DOM element.
 * @param {...Object} elements - Virtual elements to render.
 */

export default function renderElement(clear, parent, ...elements) {
  // Clear existing content if requested
  if (clear) {
    parent.innerHTML = "";
  }

  elements.forEach((element) => {
    // Ignore invalid render values
    if (element == null || element === false) return;

    // Render text nodes
    if (element.tagName === "text") {
      const textNode = document.createTextNode(element.content);
      parent.appendChild(textNode);
      return;
    }

    // Create DOM element
    const domElement = document.createElement(element.tagName);

    // Apply attributes
    if (element.attributes) {
      for (const [key, value] of Object.entries(element.attributes)) {
        if (key === "ref" && typeof value === "function") {
          value(domElement);
          continue;
        }
        if (key.startsWith("on") && typeof value === "function") {
          const eventType = key.slice(2).toLowerCase();
          setEventListener(domElement, eventType, value);
        } else {
          setDomAttribute(domElement, key, value);
        }
      }
    }

    // Attach events
    if (element.events) {
      for (const [eventType, eventHandler] of Object.entries(element.events)) {
        setEventListener(domElement, eventType, eventHandler);
      }
    }

    // Render children recursively
    if (element.children?.length > 0) {
      renderElement(false, domElement, ...element.children);
    }

    // Append final element to parent
    parent.appendChild(domElement);
  });
}
