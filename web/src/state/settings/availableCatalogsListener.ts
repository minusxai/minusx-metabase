import { Action } from '../../../../apps/src/base/appController';
import { getOrCreateMxCollectionId, createOrUpdateModelsForAllCatalogs, createOrUpdateModelsForCatalog, getAllMxInternalModels } from '../../helpers/catalogAsModels';
import type { RootState, AppDispatch } from '../../state/store';
import { setMxCollectionId, setMxModels } from '../cache/reducer';
import { saveCatalog, setMemberships, setModelsMode } from './reducer';
import { createAction, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

export const refreshMxCache = createAction('settings/refreshMxCache')
export const catalogsListener = createListenerMiddleware();

catalogsListener.startListening({
  matcher: isAnyOf(saveCatalog, setMemberships, setModelsMode, refreshMxCache),
  effect: async (action, listenerApi) => {
    // just debounce this listener by 50 ms for all actions and cancel existing listeners 
    // this is to handle app startup races; this is kind of a hack;
    // should have more sophistated logic to separate refreshMxCache and setMemberships
    // not cancelling each other
    listenerApi.cancelActiveListeners()
    // Delay before starting actual work
    await listenerApi.delay(50)
    const state = listenerApi.getState() as RootState
    const dispatch = listenerApi.dispatch as AppDispatch
    // if it's a full refresh with snippets mode on,
    // or if snippets mode is just turned on, 
    // or if setMemberships is called with snippets mode on,
    // then we need to re-create the mx collection
    // and repopulate models
    if (
      (setModelsMode.match(action) && action.payload == true) || 
      (refreshMxCache.match(action) && state.settings.modelsMode == true) ||
      (setMemberships.match(action) && state.settings.modelsMode == true)
    ) {
      try {
        if (!state.auth.email) {
          console.warn('[minusx] No email found, cant create mx collection')
          return
        }
        const mxCollectionId = await listenerApi.pause(getOrCreateMxCollectionId(state.auth.email))
        dispatch(setMxCollectionId(mxCollectionId))
        if (mxCollectionId) {
          // also get all models
          const mxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
          // create new models (if required) for all catalogs
          await listenerApi.pause(createOrUpdateModelsForAllCatalogs(mxCollectionId, mxModels, state.settings.availableCatalogs))
          const newMxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
          dispatch(setMxModels(newMxModels))
        }
      } catch (e) {
      }
      return
    }
    if (!state.cache.mxCollectionId || !state.settings.modelsMode) {
      // don't want to do anything if snippets mode is off or mx collection id is not set
      return
    }
    if (saveCatalog.match(action)) {
      const catalog = state.settings.availableCatalogs.find(catalog => catalog.id == action.payload.id)
      if (catalog) {
        await listenerApi.pause(createOrUpdateModelsForCatalog(state.cache.mxCollectionId, state.cache.mxModels, catalog))
        const mxModels = await listenerApi.pause(getAllMxInternalModels(state.cache.mxCollectionId))
        dispatch(setMxModels(mxModels))
      }
    }
  }
});
