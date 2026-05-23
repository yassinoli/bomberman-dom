# Mini Framework

Mini Framework is a small frontend experiment built with vanilla JavaScript and native ES modules. It implements a lightweight UI system with virtual element creation, recursive rendering, reactive state, hash routing, and DOM diff/patch updates.

The repository also includes a TodoMVC-style demo app that shows how the framework is meant to be used in practice.

## What This Project Includes

- Virtual DOM-like element creation with `createElement(...)`
- Recursive DOM rendering with `renderElement(...)`
- Reactive state with `createState(...)`
- Hash-based routing
- DOM diffing and patching for targeted updates
- A TodoMVC example app built on top of the framework

## Project Structure

```text
mini-framework/
├── fw/
│   ├── create-element.mjs
│   ├── render-elemnt.mjs
│   ├── global.mjs /patching diffing files
│   ├── state-managment.mjs
│   ├── routing.mjs
│   └── FRAMEWORK_GUIDE.md
└── todomvc/
    ├── index.html
    ├── index.css
    └── index.mjs
```

## Core Modules

### `fw/create-element.mjs`

Creates plain JavaScript objects that describe UI elements.

```js
createElement(tagName, attributes = {}, events = {}, ...children)
```

### `fw/render-elemnt.mjs`

Turns virtual elements into real DOM nodes and appends them to the page.

### `fw/state-managment.mjs`

Provides a tiny reactive store:

- `getState()`
- `setState(newState)`
- `subscribe(listener)`

### `fw/routing.mjs`

Provides a simple hash router for routes like:

- `#/`
- `#/active`
- `#/completed`

### `fw/diff-patch.mjs`

Builds virtual trees, compares them, and patches only the changed DOM parts where possible.

## Demo App

The `todomvc/` folder contains a TodoMVC-style app that demonstrates:

- rendering lists of elements
- attaching click and keyboard events
- updating UI from state changes
- route-based filtering
- using diff/patch updates after state changes

## Getting Started

This project does not require a bundler or package install, but it should be served through a local HTTP server because it uses ES modules.

Example with Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/todomvc/
```

## Example

```js
import createElement from "../fw/create-element.mjs";
import renderElement from "../fw/render-elemnt.mjs";

const root = document.getElementById("root");

const app = createElement(
  "div",
  { class: "app" },
  {},
  createElement("h1", {}, {}, "Hello"),
  createElement(
    "button",
    { class: "btn" },
    {
      click: () => {
        console.log("Clicked");
      },
    },
    "Click me"
  )
);

renderElement(true, root, app);
```

## Documentation

Detailed framework documentation is available in [fw/FRAMEWORK_GUIDE.md](./fw/FRAMEWORK_GUIDE.md).

That guide covers:

- framework features
- how to create elements
- how to attach events
- how to nest elements
- how to add attributes
- why the framework is designed this way

## Design Summary

The framework is built around one consistent data shape: a virtual element object. That same structure is used for rendering, nested children, event handling, and DOM diffing, which keeps the implementation small and easier to reason about.

It is intentionally simple and educational rather than production-heavy. The value of the project is that the moving parts are visible and understandable.
