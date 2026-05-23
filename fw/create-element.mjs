/**
 * Creates a virtual DOM-like element object.
 *
 * @param {string} tagName - The HTML tag name (e.g. "div", "button").
 * @param {Object} [attributes={}] - Element attributes such as class, id, etc.
 * @param {Object} [events={}] - Event handlers like click, input, dblclick...
 * @param {...any} children - Child elements, arrays of children, strings, or numbers.
 *
 * @returns {Object} A normalized element object structure.
 */

export default function createElement(tagName, attributes = {}, events = {}, ...children) {
  return {
    tagName,
    attributes,
    events,

    children: children.flat().map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return {
          tagName: "text",
          content: String(child),
        };
      }

      return child;
    }),
  };
}
