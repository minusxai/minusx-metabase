import { createMxCollection, createOrUpdateModelsForAllCatalogs, createOrUpdateModelsForCatalog, getAllMxInternalModels } from '../../helpers/catalogAsModels';
import type { RootState, AppDispatch } from '../../state/store';
import { saveCatalog, setMemberships, setMxCollectionId, setMxModels, setSnippetsMode } from './reducer';
import { createAction, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

export const refreshMxCache = createAction('settings/refreshMxCache')
export const catalogsListener = createListenerMiddleware();

catalogsListener.startListening({
  matcher: isAnyOf(saveCatalog, setMemberships, setSnippetsMode, refreshMxCache),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    const dispatch = listenerApi.dispatch as AppDispatch
    // if it's a full refresh with snippets mode on,
    // or if snippets mode is just turned on, then we need to create the mx collection
    // and repopulate models
    if (
      (setSnippetsMode.match(action) && action.payload == true) || 
      (refreshMxCache.match(action) && state.settings.snippetsMode == true) ) {
      try {
        const mxCollectionId = await listenerApi.pause(createMxCollection())
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
    if (!state.settings.mxCollectionId || !state.settings.snippetsMode) {
      // don't want to do anything if snippets mode is off or mx collection id is not set
      return
    }
    if (saveCatalog.match(action)) {
      const catalog = state.settings.availableCatalogs.find(catalog => catalog.id == action.payload.id)
      if (catalog) {
        await listenerApi.pause(createOrUpdateModelsForCatalog(state.settings.mxCollectionId, state.settings.mxModels, catalog))
        const mxModels = await listenerApi.pause(getAllMxInternalModels(state.settings.mxCollectionId))
        dispatch(setMxModels(mxModels))
      }
    } else if (setMemberships.match(action)) {
      await listenerApi.pause(createOrUpdateModelsForAllCatalogs(state.settings.mxCollectionId, state.settings.mxModels, state.settings.availableCatalogs))
      const mxModels = await listenerApi.pause(getAllMxInternalModels(state.settings.mxCollectionId))
      dispatch(setMxModels(mxModels))
    } 
  }
});