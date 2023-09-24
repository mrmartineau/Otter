import { Dispatch, DispatchWithoutAction } from 'react';
import { useCallback, useState } from 'react';

/**
 * @name useToggle
 * @description Toggle something
 */
export const useToggle = (
  initialState = false,
): [boolean, DispatchWithoutAction, Dispatch<boolean>] => {
  // Initialize the state
  const [state, setToggleState] = useState(initialState);

  // Define and memoize toggler function in case we pass down the comopnent,
  // This function change the boolean value to it's opposite value
  const toggle = useCallback(() => setToggleState((state) => !state), []);

  return [state, toggle, setToggleState];
};
