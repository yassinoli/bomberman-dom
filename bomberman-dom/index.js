import { createVirtualRootContainer, ROOT } from "../fw/helpers.mjs";
import { patchDOM } from "../fw/patching.mjs";
import renderElement from "../fw/render-elemnt.mjs";
import createElement from "../fw/create-element.mjs";
import { createState } from "../fw/state-managment.mjs";
import { routing, navigate, RouterConstructor } from "../fw/routing.mjs";

const router = RouterConstructor();

const listType = createState({
  listType: "all",
});

const list = createState({
  list: [],
});

const data = createState({ count: list.getState().list.filter((item) => item.listType == "active").length });

// Re-renders the app when the active count changes.
data.subscribe(() => {
  patchDOM(router);
});

// Re-renders the app when the todo list changes.
list.subscribe(() => {
  patchDOM(router);
});

// Re-renders the app when the selected filter changes.
listType.subscribe(() => {
  patchDOM(router);
});

/**
 * Builds the main todo application view for the active route.
 */
function Home() {
  let toggleAll = {};
  if (list.getState().list.length != 0) {
    toggleAll = createElement(
      "div",
      { class: "toggle-all-container" },
      {},
      createElement(
        "input",
        { class: "toggle-all", type: "check-box", id: "toggle-all", "data-testid": "toggle-all" },
        {
          // Toggles all todo items when the master checkbox is clicked.
          click: () => {
            markAllItemsAsCompleted();
          },
        },
        "",
      ),
      createElement("label", { class: "toggle-all-label", for: "toggle-all" }),
    );
  }
  return [
    createElement(
      "header",
      { class: "header", "data-testid": "header" },
      {},
      createElement("h1", {}, {}, "todos"),
      createElement(
        "div",
        { class: "input-container" },
        {},
        createElement(
          "input",
          { class: "new-todo", id: "todo-input", type: "text", "data-testid": "text-input", placeholder: "What needs to be done?", value: "" },
          {
            // Adds a todo item when Enter is pressed with valid text.
            keydown: (event) => {
              const value = event.target.value.trim();
              if (event.key === "Enter" && value.length >= 2) {
                event.target.value = "";
                addItem(value);
              }
            },
          },
          "",
        ),
        createElement("label", { class: "visually-hidden", for: "todo-input" }, {}, "New Todo Input"),
      ),
    ),
    createElement("main", { class: "main", "data-testid": "main" }, {}, toggleAll, createElement("ul", { class: "todo-list", "data-testid": "todo-list" }, {}, ...listItem())),
    ...actionsBar(),
  ];
}

/**
 * Builds the informational footer displayed below the app.
 */
function Footer() {
  return [
    createElement(
      "footer",
      { class: "info" },
      {},
      createElement("p", {}, {}, "Double-click to edit a todo"),
      createElement("p", {}, {}, "Created by the TodoMVC Team"),
      createElement("p", {}, {}, "Part of ", createElement("a", { href: "http://todomvc.com" }, {}, "TodoMVC")),
    ),
  ];
}

/**
 * Generates a unique id for a newly created todo item.
 */
function generateUniqueId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Adds a new active todo item and refreshes the active count.
 */
function addItem(newItemVal) {
  list.setState({
    list: [
      ...list.getState().list,
      {
        id: generateUniqueId(),
        listType: "active",
        content: newItemVal,
      },
    ],
  });
  data.setState({ count: countActiveTasks() });
}

/**
 * Removes all completed todo items from the list.
 */
function removeCompleted() {
  for (let i = 0; i < list.getState().list.length; i++) {
    const element = list.getState().list[i];
    if (element.listType == "completed") {
      removeItem(element.id);
      i--;
    }
  }
  data.setState({ count: countActiveTasks() });
}

/**
 * Removes a single todo item by id and refreshes the active count.
 */
function removeItem(itemId) {
  list.setState({ list: [...list.getState().list.filter((item) => item.id !== itemId)] });
  data.setState({ count: countActiveTasks() });
}

/**
 * Counts how many todo items are still active.
 */
function countActiveTasks() {
  let result = 0;
  for (let i = 0; i < list.getState().list.length; i++) {
    const element = list.getState().list[i];
    if (element.listType == "active") {
      result++;
    }
  }
  return result;
}

/**
 * Toggles a todo item between active and completed states.
 */
function markItemAsCompleted(itemId) {
  list.setState({
    list: [
      ...list.getState().list.map((item) => {
        if (item.id === itemId) {
          if (item.listType == "completed") {
            return {
              ...item,
              listType: "active",
            };
          } else {
            return {
              ...item,
              listType: "completed",
            };
          }
        }
        return item;
      }),
    ],
  });
  data.setState({ count: countActiveTasks() });
}

/**
 * Marks every todo as completed, or reactivates all todos if none are active.
 */
function markAllItemsAsCompleted() {
  if (data.getState().count != 0) {
    list.setState({
      list: [
        ...list.getState().list.map((item) => {
          return {
            ...item,
            listType: "completed",
          };
        }),
      ],
    });
  } else {
    list.setState({
      list: [
        ...list.getState().list.map((item) => {
          return {
            ...item,
            listType: "active",
          };
        }),
      ],
    });
  }
  data.setState({ count: countActiveTasks() });
}

/**
 * Updates the text content for a single todo item.
 */
function changeItemContent(itemId, newContent) {
  list.setState({
    list: [
      ...list.getState().list.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            content: newContent,
          };
        }
        return item;
      }),
    ],
  });
}

/**
 * Builds the visible todo list items for the current filter.
 */
function listItem() {
  let result = [];
  for (let i = 0; i < list.getState().list.length; i++) {
    const element = list.getState().list[i];
    if (listType.getState().listType == "all" || listType.getState().listType == element.listType) {
      let checkBoxState = {};
      if (element.listType == "completed") {
        checkBoxState = { checked: true };
      }
      result.push(
        createElement(
          "li",
          { "data-testid": "todo-item", class: element.listType == "completed" ? "completed" : "" },
          {},
          createElement(
            "div",
            { class: "view" },
            {},
            createElement(
              "input",
              { class: "toggle", type: "checkbox", "data-testid": "todo-item-toggle", ...checkBoxState },
              {
                // Toggles the completed state for this todo item.
                click: () => {
                  markItemAsCompleted(element.id);
                },
              },
              "",
            ),
            createElement(
              "label",
              { "data-testid": "todo-item-label" },
              {
                // Opens the inline editor for this todo item.
                dblclick: (event) => {
                  document.querySelectorAll(".hide-element").forEach((el) => {
                    el.classList.remove("hide-element");
                  });
                  event.target.setAttribute("class", "hide-element");
                  event.target.classList.add("hide-element");
                  event.target.previousElementSibling.classList.add("hide-element");
                  event.target.nextElementSibling.classList.add("hide-element");
                  document.querySelectorAll(".editing-input").forEach((el) => {
                    el.classList.add("hide-input");
                  });
                  event.target.parentElement.lastElementChild.classList.remove("hide-input");
                  event.target.parentElement.lastElementChild.focus();
                },
              },
              element.content,
            ),
            createElement(
              "button",
              { "data-testid": "todo-item-button", class: "destroy" },
              {
                // Removes this todo item from the list.
                click: () => {
                  removeItem(element.id);
                },
              },
              "",
            ),
            createElement(
              "input",
              { class: "new-todo editing-input hide-input", id: "todo-input", "data-testid": "text-input", value: element.content },
              {
                // Saves edited todo text when Enter is pressed.
                keydown: (event) => {
                  const value = event.target.value.trim();
                  if (event.key === "Enter" && value.length >= 2) {
                    changeItemContent(element.id, value);
                    document.querySelectorAll(".hide-element").forEach((el) => {
                      el.classList.remove("hide-element");
                    });
                    event.target.classList.add("hide-input");
                  }
                },
              },
              "",
            ),
          ),
        ),
      );
    }
  }
  return result;
}

// Closes any open inline todo editor when the document is clicked.
document.addEventListener("click", () => {
  event.stopPropagation();
  document.querySelectorAll(".hide-element").forEach((el) => {
    el.classList.remove("hide-element");
  });
  document.querySelectorAll(".editing-input").forEach((el) => {
    el.classList.add("hide-input");
  });
});

/**
 * Builds the not-found route view.
 */
function NotFound() {
  return createElement("div", {}, {}, "404");
}

/**
 * Builds the footer action bar with counters, filters, and clear controls.
 */
function actionsBar() {
  let all = {
    class: "selected",
  };
  let active = {
    class: "selected",
  };
  let completed = {
    class: "selected",
  };
  if (listType.getState().listType == "all") {
    active = {};
    completed = {};
  } else if (listType.getState().listType == "active") {
    all = {};
    completed = {};
  } else if (listType.getState().listType == "completed") {
    active = {};
    all = {};
  }
  if (list.getState().list.length != 0) {
    return [
      createElement(
        "footer",
        { class: "footer", "data-testid": "footer" },
        {},
        createElement("span", { class: "todo-count" }, {}, `${data.getState().count} item left!`),
        createElement(
          "ul",
          { class: "filters", "data-testid": "footer-navigation" },
          {},
          createElement(
            "li",
            {},
            {},
            createElement(
              "a",
              { ...all, href: "#/" },
              {
                // Switches the filter to show all todos.
                click: () => {
                  listType.setState({ listType: "all" });
                },
              },
              "All",
            ),
          ),
          createElement(
            "li",
            {},
            {},
            createElement(
              "a",
              { ...active, href: "#/active" },
              {
                // Switches the filter to show active todos.
                click: () => {
                  listType.setState({ listType: "active" });
                },
              },
              "Active",
            ),
          ),
          createElement(
            "li",
            {},
            {},
            createElement(
              "a",
              { ...completed, href: "#/completed" },
              {
                // Switches the filter to show completed todos.
                click: () => {
                  listType.setState({ listType: "completed" });
                },
              },
              "Completed",
            ),
          ),
        ),
        createElement(
          "button",
          { class: "clear-completed" },
          {
            // Removes all completed todo items.
            click: () => {
              removeCompleted();
            },
          },
          "Clear completed",
        ),
      ),
    ];
  } else {
    return [];
  }
}

router.route = {
  path: "/",
  // Renders the home route into the real DOM.
  handler: () => {
    renderElement(true, ROOT, ...Home());
  },
  // Builds the home route virtual DOM for patching.
  fakeHandler: () => {
    return createVirtualRootContainer(ROOT, ...Home());
  },
};

router.route = {
  path: "/active",
  // Renders the active filter route into the real DOM.
  handler: () => {
    renderElement(true, ROOT, ...Home());
  },
  // Builds the active filter virtual DOM for patching.
  fakeHandler: () => {
    return createVirtualRootContainer(ROOT, ...Home());
  },
};

router.route = {
  path: "/completed",
  // Renders the completed filter route into the real DOM.
  handler: () => {
    renderElement(true, ROOT, ...Home());
  },
  // Builds the completed filter virtual DOM for patching.
  fakeHandler: () => {
    return createVirtualRootContainer(ROOT, ...Home());
  },
};

router.route = {
  path: "*",
  // Renders the fallback route into the real DOM.
  handler: () => {
    renderElement(true, ROOT, ...Home());
  },
  // Builds the fallback route virtual DOM for patching.
  fakeHandler: () => {
    return createVirtualRootContainer(ROOT, ...Home());
  },
};

routing(router);
renderElement(false, document.body, ...Footer());
