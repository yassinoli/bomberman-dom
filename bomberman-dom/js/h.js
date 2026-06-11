import createElement from "/fw/create-element.mjs";

export function h(tag, attrs = {}, events = {}, ...children) {
  return createElement(tag, attrs, events, ...children);
}
