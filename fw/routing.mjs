/**
 * Creates a simple hash-based router.
 *
 * Usage:
 * router.route = {
 *   path: "/home",
 *   handler: () => {},
 *   fakeHandler: () => {}
 * };
 *
 * @returns {Object} Router instance containing registered routes.
 */
export function RouterConstructor() {
  return {
    routes: {},

    /**
     * Registers a route and stores its real and virtual render handlers.
     */
    set route({ path, handler, fakeHandler }) {
      this.routes[path] = {
        main: handler,
        fake: fakeHandler || null,
      };
    },
  };
}

/**
 * Starts the router and listens for URL hash changes.
 *
 * @param {Object} router - Router instance created by RouterConstructor.
 */
export function routing(router) {
  /**
   * Renders the handler for the current hash route or the fallback route.
   */
  function renderRoute() {
    const currentPath = location.hash.slice(1) || "/";
    const matchedRoute = router.routes[currentPath];

    if (matchedRoute) {
      matchedRoute.main();
    } else {
      // Fallback route: "*"
      const notFoundRoute = router.routes["*"];

      if (notFoundRoute) {
        notFoundRoute.main();
      }
    }
  }

  // Initial route render
  renderRoute();

  // Listen for route changes
  window.addEventListener("hashchange", renderRoute);
}

/**
 * Navigates to a new route.
 *
 * @param {string} path - Route path.
 */
export function navigate(path) {
  location.hash = path;
}
