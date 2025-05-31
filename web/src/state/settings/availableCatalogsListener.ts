import { Action } from '../../../../apps/src/base/appController';
import { getOrCreateMxCollectionId, createOrUpdateModelsForAllCatalogs, createOrUpdateModelsForCatalog, getAllMxInternalModels } from '../../helpers/catalogAsModels';
import type { RootState, AppDispatch } from '../../state/store';
import { setMxCollectionId, setMxModels } from '../cache/reducer';
import { saveCatalog, setMemberships, setModelsMode } from './reducer';
import { createAction, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

export const setupCollectionsAndModels = createAction('cache/setupCollectionsAndModels')
export const catalogsListener = createListenerMiddleware();

const startListening = catalogsListener.startListening.withTypes<RootState, AppDispatch>();

startListening({
  matcher: isAnyOf(setupCollectionsAndModels, setModelsMode),
  effect: async (action, listenerApi) => {
    // only one listener should be active at a time
    listenerApi.unsubscribe()
    const state = listenerApi.getState()
    const dispatch = listenerApi.dispatch
    // if model's mode is true,
    // then we need to re-create the mx collections
    // and repopulate models
    if (
      state.settings.modelsMode == true
    ) {
      try {
        if (!state.auth.email) {
          console.warn('[minusx] No email found, cant create mx collection')
          return
        }
        const mxCollectionId = await listenerApi.pause(getOrCreateMxCollectionId(state.auth.email))
        if (mxCollectionId) {
          try {
            // also get all models
            const mxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
            // create new models (if required) for all catalogs
            await listenerApi.pause(createOrUpdateModelsForAllCatalogs(mxCollectionId, mxModels, state.settings.availableCatalogs))
            const newMxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
            dispatch(setMxModels(newMxModels))
          } catch (e) {

          }
        }
        // only set mxCollectionId after mxModels so that the below listener has mxModels available after condition
        dispatch(setMxCollectionId(mxCollectionId))
      } catch (e) {
      } finally {
        listenerApi.subscribe();
      }
      return
    }
    listenerApi.subscribe();
  }
})

startListening({
  matcher: isAnyOf(saveCatalog, setMemberships),
  effect: async (action, listenerApi) => {
    // only one listener should be active at a time
    listenerApi.unsubscribe()
    try {
      let state = listenerApi.getState()
      const dispatch = listenerApi.dispatch
      // check if in models mode; if not just return
      if (!state.settings.modelsMode) {
        return
      }
      // check if mxCollectionId is undefined -> if so, we need to wait for setupCollectionsAndModels to finish
      if (state.cache.mxCollectionId == undefined) {
        await listenerApi.condition(
          (action, currentState: RootState) => {
            return currentState.cache.mxCollectionId !== undefined
          },
          5000,
        )
        state = listenerApi.getState()
      }
      if (!state.cache.mxCollectionId) {
        // either couldn't create collection or we timed out
        return
      }
      if (setMemberships.match(action)) {
        // create new models (if required) for all catalogs
        await listenerApi.pause(createOrUpdateModelsForAllCatalogs(state.cache.mxCollectionId, state.cache.mxModels, state.settings.availableCatalogs))
        const newMxModels = await listenerApi.pause(getAllMxInternalModels(state.cache.mxCollectionId))
        dispatch(setMxModels(newMxModels))
      } else if (saveCatalog.match(action)) {
        const catalog = state.settings.availableCatalogs.find(catalog => catalog.id == action.payload.id)
        if (catalog) {
          await listenerApi.pause(createOrUpdateModelsForCatalog(state.cache.mxCollectionId, state.cache.mxModels, catalog))
          const mxModels = await listenerApi.pause(getAllMxInternalModels(state.cache.mxCollectionId))
          dispatch(setMxModels(mxModels))
        }
      }
    } catch(e) {
    } finally {
      listenerApi.subscribe()
    }
  }
});
