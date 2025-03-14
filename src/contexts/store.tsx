import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type FC
} from 'react';
import { reducer } from '../lib/store';
import { defaultState, type AppState } from '../lib/store/state';
import type { Action } from '../lib/store/action';
import type React from 'react';
  
  /*
  context allows you to share values (in this case, your global state and a dispatch function) 
  between components without needing to pass props explicitly down through every level of the component tree (Prop drilling)
  
  The first value in the array is the AppState, which represents the current state of your application.
  The second value is a Dispatch<Action> function, which will be used to send actions to the reducer to update the state.
  But not yet it's only initialized in createContext

  StoreContext hold the store structure, all the states are held in AppState in lib/sotre/action.ts
  it returns the current state
  */
  
  export const StoreContext = createContext<[AppState, Dispatch<Action>]>([
    defaultState(),
    s => s  //This is a no-op function (a function that does nothing) but requires initial value
  ]);
  
  /*
  reducer:first checks if there is a saved state in local storage. If local storage contains a valid state, 
  the app will use that state, meaning the state will be exactly as it was when you last closed the tab.
  Default State: If no valid state is found in local storage (e.g., local storage was cleared or an error occurred during state saving), 
  the app will fall back to defaultState().

  provides the payload to all children given its position in main.tsx
  */
  export const StoreProvider: FC<{ children?: React.ReactNode }> = ({
    children
  }) => {
    const v = useReducer(reducer, defaultState());
    return <StoreContext.Provider value={v}>{children}</StoreContext.Provider>;
  };
  
  /*
  hook that gives components access to those values 
  */
  export const useStore = () => useContext(StoreContext);
  