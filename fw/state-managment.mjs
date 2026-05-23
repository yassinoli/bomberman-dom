/**
 * Creates a simple reactive state container.
 *
 * @param {Object} initialState - Initial application state.
 *
 * @returns {Object} State manager with:
 * - getState(): returns current state
 * - setState(newState): updates and merges state
 * - subscribe(fn): listens for state changes
 */
export function createState(initialState) {
  let state = initialState;
  let listeners = [];

  /**
   * Returns the current state.
   */
  function getState() {
    return state;
  }

  /**
   * Updates the state by merging new values
   * and notifies all subscribers.
   *
   * @param {Object} newState
   */
  function setState(newState) {
    state = { ...state, ...newState };

    listeners.forEach((listener) => listener(state));
  }

  /**
   * Registers a listener for state updates.
   *
   * @param {Function} fn
   */
  function subscribe(fn) {
    listeners.push(fn);

    // Optional unsubscribe support
    return () => {
      listeners = listeners.filter((listener) => listener !== fn);
    };
  }

  return {
    getState,
    setState,
    subscribe,
  };
}
