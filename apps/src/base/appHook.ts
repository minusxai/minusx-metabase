import { create } from 'zustand';
import { once } from 'lodash';

function _createStore<T> (internalState: T) {
    return create<T & {
        update: (newState: Partial<T>) => void;
    }>((set) => ({
        ...internalState,
        update: (newState: Partial<T>) => set((state) => ({
            ...state,
            ...newState
        })),
    }))
}

export const createStore = once(_createStore)