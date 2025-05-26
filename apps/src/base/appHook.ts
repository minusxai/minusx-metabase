import { create } from 'zustand';
import { once } from 'lodash';

function _createStore<T>(internalState: T) {
    return create<T & {
      update: (newState: Partial<T> | ((prevState: T) => Partial<T>)) => void;
    }>((set) => ({
      ...internalState,
      update: (arg: Partial<T> | ((prevState: T) => Partial<T>)) =>
        set((state) => ({
          ...state,
          ...(typeof arg === 'function' ? arg(state as T) : arg),
        })),
    }));
  }

export const createStore = once(_createStore)