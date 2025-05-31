import { getOrCreateMxCollectionId, createOrUpdateModelsForAllCatalogs, createOrUpdateModelsForCatalog, getAllMxInternalModels, currentOriginCatalogs } from '../../helpers/catalogAsModels';
import type { RootState, AppDispatch } from '../../state/store';
import { setMxCollectionId, setMxModels } from '../cache/reducer';
import { saveCatalog, setMemberships, setModelsMode } from './reducer';
import { createAction, createListenerMiddleware, current, isAnyOf } from '@reduxjs/toolkit'

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
        // check if there are available catalogs for current origin; if not, set mxCollectionId to null
        // we don't want to create a collection for users not using catalogs
        if (currentOriginCatalogs(state.settings.availableCatalogs).length == 0) {
          dispatch(setMxCollectionId(null))
          return
        }
        const mxCollectionId = await listenerApi.pause(getOrCreateMxCollectionId(state.auth.email || "no_email"))
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
      if (state.cache.mxCollectionId === undefined) {
        await listenerApi.condition(
          (action, currentState: RootState) => {
            return currentState.cache.mxCollectionId !== undefined
          },
          5000,
        )
        state = listenerApi.getState()
      }
      let mxCollectionId = state.cache.mxCollectionId
      if (mxCollectionId === undefined) {
        // something went seriously wrong with collection creation, no point in re-attempting
        console.warn('[minusx] Got mxCollectionId undefined in setMemberships listener; not retrying')
        return
      }
      if (mxCollectionId === null) {
        // something mildy wrong happened, maybe there were no catalogs available.
        // check original state vs current state if earlier availableCatalogs is empty
        const originalState = listenerApi.getOriginalState()
        const oldRelevantCatalogs = currentOriginCatalogs(originalState.settings.availableCatalogs)
        const currentRelevantCatalogs = currentOriginCatalogs(state.settings.availableCatalogs)
        if (oldRelevantCatalogs.length == 0 && currentRelevantCatalogs.length > 0 && state.settings.modelsMode) {
          // create collection
          mxCollectionId = await listenerApi.pause(getOrCreateMxCollectionId(state.auth.email || "no_email"))
          dispatch(setMxCollectionId(mxCollectionId))
        }
        if (mxCollectionId === null) {
          // something went wrong, no point in re-attempting
          console.warn('[minusx] still getting null when creating mx collection; not retrying')
          return
        }
      }
      if (setMemberships.match(action)) {
        // create new models (if required) for all catalogs
        await listenerApi.pause(createOrUpdateModelsForAllCatalogs(mxCollectionId, state.cache.mxModels, state.settings.availableCatalogs))
        const newMxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
        dispatch(setMxModels(newMxModels))
      } else if (saveCatalog.match(action)) {
        const catalog = state.settings.availableCatalogs.find(catalog => catalog.id == action.payload.id)
        if (catalog) {
          await listenerApi.pause(createOrUpdateModelsForCatalog(mxCollectionId, state.cache.mxModels, catalog))
          const mxModels = await listenerApi.pause(getAllMxInternalModels(mxCollectionId))
          dispatch(setMxModels(mxModels))
        }
      }
    } catch(e) {
      console.log("[minusx]some error happened during saveCatalog/setMemberships:", e)
    } finally {
      listenerApi.subscribe()
    }
  }
});
