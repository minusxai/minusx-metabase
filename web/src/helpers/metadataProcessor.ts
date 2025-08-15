/**
 * Cards Metadata Processing
 * 
 * This module handles uploading cards metadata to the backend
 * with hash-based caching to avoid redundant uploads.
 */

import axios from 'axios';
import { configs } from '../constants';
import { getOrigin } from './origin';
import { get, isEmpty } from 'lodash';
import { MetadataProcessingResult, setMetadataHash, setMetadataProcessingCache, clearMetadataProcessingCache } from '../state/settings/reducer';
import { getState } from '../state/store';
import { dispatch } from '../state/dispatch';
import { getAllCardsAndModels, getAllCardsLegacy, getDatabaseTablesAndModelsWithoutFields, getAllFields } from '../../../apps/src/metabase/helpers/metabaseAPIHelpers';
import { fetchDatabaseFields } from '../../../apps/src/metabase/helpers/metabaseAPI';
import { getSelectedDbId } from '../../../apps/src/metabase/helpers/metabaseStateAPI';
import { getModelsWithFields } from '../../../apps/src/metabase/helpers/metabaseModels';
import { sha256 } from 'js-sha256';

export interface MetadataItem {
  metadata_type: string;
  metadata_value: any;
  version: string;
  metadata_hash: string;
  database_id?: string;
}

export interface MetadataRequest {
  origin: string;
  metadata_items: MetadataItem[];
}

/**
 * Uploads metadata items to the backend (simplified, immediate upload)
 * @param metadataItems Array of metadata items to upload
 * @returns The response from the server
 */
export async function processMetadata(metadataItems: MetadataItem[]): Promise<any> {
  const metadataRequest: MetadataRequest = {
    origin: getOrigin(),
    metadata_items: metadataItems
  };

  try {
    const profile_id = getState().auth.profile_id
    if (profile_id) {
      const response = await axios.post(
        `${configs.DEEPRESEARCH_BASE_URL}/metadata`, 
        metadataRequest, 
      );
      return response.data;
    }
  } catch (error) {
    console.warn('Failed to upload metadata items:', error);
    throw error;
  }
}

/**
 * Calculates metadata hash for caching purposes (simplified & faster)
 */

function calculateMetadataHashFallback(content: string) {
  return sha256(content); // `sha256` is globally available
}

async function calculateMetadataHash(metadataType: string, metadataValue: any, version: string): Promise<string> {
  // Simplified hash calculation - just hash the stringified data
  const content = JSON.stringify({ metadataType, version, metadataValue });
  try {
    const data = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('Failed to calculate metadata hash using crypto API, falling back:', error);
    // Fallback to a simpler hash calculation
    return calculateMetadataHashFallback(content);
  }
  
}

// Global map to track ongoing uploads by hash
const ongoingUploads = new Map<string, Promise<string>>();

// Global map to track ongoing metadata processing by dbId
const ongoingMetadataProcessing = new Map<number, Promise<MetadataProcessingResult>>();

/**
 * Generic function to upload any metadata type to the backend
 * @param metadataType The type of metadata (e.g., 'cards', 'dbSchema')
 * @param data The data to upload
 * @param metadataHash The calculated hash to send to server
 * @returns The hash returned from the server
 */

// async function gzipBase64(obj: any): Promise<string> {
//   const json = JSON.stringify(obj);
//   const enc = new TextEncoder().encode(json);
//   const stream = new Blob([enc]).stream().pipeThrough(new CompressionStream('gzip'));
//   const gzBytes = new Uint8Array(await new Response(stream).arrayBuffer());
//   return btoa(String.fromCharCode(...gzBytes));
// }

async function gzipBase64(obj: any): Promise<string> {
  const json = JSON.stringify(obj);
  const enc = new TextEncoder().encode(json);

  const stream = new Blob([enc]).stream().pipeThrough(new CompressionStream('gzip'));
  const blob = await new Response(stream).blob();

  // Produces a data URL; strip the prefix
  const b64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return b64;
}

async function uploadMetadata(metadataType: string, data: any, metadataHash: string, database_id: number): Promise<string | undefined> {
  // Check if this hash is already being uploaded
  if (ongoingUploads.has(metadataHash)) {
    console.log(`[minusx] Upload already in progress for hash ${metadataHash}, waiting...`)
    return await ongoingUploads.get(metadataHash)!;
  }

  // Create and store the upload promise
  const uploadPromise = (async () => {
    // Stringify data, gzip it, and base64 encode
    let metadata_value = { [metadataType]: data }
    try {
      const compressedData = await gzipBase64(data);
      metadata_value = {
        type: 'gzip',
        [metadataType]: compressedData
      }
    } catch (error) {
      console.warn(`Failed to compress ${metadataType} data, using uncompressed version`, error);
    }
    
    const metadataItem: MetadataItem = {
      metadata_type: metadataType,
      metadata_value,
      version: '1.0',
      metadata_hash: metadataHash,
      database_id: `${database_id}`
    };

    try {
      const response = await processMetadata([metadataItem]);
      const hash = get(response, 'results[0].metadata_hash')
      return hash
    } catch (error) {
      console.warn(`Failed to upload ${metadataType} metadata:`, error);
      throw error;
    } finally {
      // Clean up the ongoing upload tracking
      ongoingUploads.delete(metadataHash);
    }
  })();

  // Store the promise in the map
  ongoingUploads.set(metadataHash, uploadPromise);

  return await uploadPromise;
}

async function processMetadataWithCaching(
  metadataType: string,
  dataFetcher: () => Promise<any>,
  database_id: number): Promise<string | undefined> {
  // Fetch the data
  const data = await dataFetcher()
  if (isEmpty(data)) {
    console.warn(`[minusx] No data found for ${metadataType}, skipping upload`)
    return undefined; // No data to process
  }

  // Calculate hash of current data
  const currentHash = await calculateMetadataHash(metadataType, { [metadataType]: data }, '1.0')

  // Get stored hashes from Redux
  const currentState = getState()
  const storedHashes = currentState.settings.metadataHashes

  // Only upload if hash doesn't exist in the Record
  if (!storedHashes[currentHash]) {
    try {
      console.log(`[minusx] ${metadataType} data changed, uploading to metadata endpoint`)
      const serverHash = await uploadMetadata(metadataType, data, currentHash, database_id)

      // Store the new hash in Redux
      if (!serverHash) {
        console.warn(`[minusx] No hash returned for ${metadataType} metadata upload`)
        return undefined; // Return undefined when upload failed
      }
      dispatch(setMetadataHash(serverHash))
      console.log(`[minusx] ${metadataType} metadata uploaded and hash updated`)
    } catch (error) {
      console.warn(`[minusx] Failed to upload ${metadataType} metadata:`, error)
      return undefined
      // Continue without failing the entire request
    }
  } else {
    console.log(`[minusx] ${metadataType} data unchanged, skipping metadata upload`)
  }

  // Return the hash
  return currentHash
}

export async function processAllMetadata(forceRefresh = false) : Promise<MetadataProcessingResult> {
  console.log('[minusx] Starting coordinated metadata processing with parallel API calls...') 
  
  // Step 1: Start all expensive API calls in parallel
  console.log('[minusx] Initiating parallel API calls...')
  const selectedDbId = await getSelectedDbId()
  
  if (!selectedDbId) {
    throw new Error('No database selected for metadata processing')
  }
  if (forceRefresh) {
    dispatch(clearMetadataProcessingCache(selectedDbId))
  }
  
  // Check cache for this database ID first (synchronous)
  const currentState = getState()
  const cacheEntry = currentState.settings.metadataProcessingCache[selectedDbId]
  
  if (!forceRefresh && cacheEntry) {
    const ONE_HOUR_MS = 1 * 60 * 60 * 1000
    const isStale = Date.now() - cacheEntry.timestamp > ONE_HOUR_MS
    
    if (!isStale) {
      console.log(`[minusx] Using cached metadata for database ${selectedDbId}`)
      return cacheEntry.result
    } else {
      console.log(`[minusx] Cached metadata for database ${selectedDbId} is stale, clearing cache`)
      // Clear stale cache entry using proper Redux action
      dispatch(clearMetadataProcessingCache(selectedDbId))
    }
  }
  
  // Check if processing is already in progress for this database ID
  if (ongoingMetadataProcessing.has(selectedDbId)) {
    console.log(`[minusx] Metadata processing already in progress for database ${selectedDbId}, returning existing promise`)
    return await ongoingMetadataProcessing.get(selectedDbId)!
  }
  
  // Create and store the processing promise
  const processingPromise = (async () => {
    try {
      
      const [dbSchema, { cards, tables: referencedTables, modelFields }, allFields] = await Promise.all([
        getDatabaseTablesAndModelsWithoutFields(selectedDbId, forceRefresh, forceRefresh),
        getAllCardsAndModels(forceRefresh),
        forceRefresh ? fetchDatabaseFields.refresh({ db_id: selectedDbId }) : fetchDatabaseFields({ db_id: selectedDbId })
      ])
      console.log('[minusx] All API calls completed. Processing data...')
      
      const filteredFields = allFields // Not filtering in new flow
      
      console.log('[minusx] Fields after filtering:', filteredFields.length, 'out of', allFields.length)
      
      console.log("[minusx] modelFields: ", modelFields.length)      
      // Step 5: Process metadata for all four with filtered data
      console.log('[minusx] Processing metadata with filtered data...')
      
      const [cardsHash, dbSchemaHash, fieldsHash, modelFieldsHash] = await Promise.all([
        processMetadataWithCaching('cards', async () => cards, selectedDbId),
        processMetadataWithCaching('dbSchema', async () => dbSchema, selectedDbId),
        processMetadataWithCaching('fields', async () => filteredFields, selectedDbId),
        processMetadataWithCaching('modelFields', async () => modelFields, selectedDbId)
      ])
      
      console.log('[minusx] Coordinated metadata processing complete')
      
      const result = {
        cardsHash,
        dbSchemaHash, 
        fieldsHash,
        modelFieldsHash,
        selectedDbId
      }
  
      // Cache the result for this database ID
      if (!result.cardsHash) {
        console.warn('[minusx] Cardshash is undefined, not caching result')
        return result; // Return even if some hashes are missing
      }
      dispatch(setMetadataProcessingCache({ dbId: selectedDbId, result }))
      console.log(`[minusx] Cached metadata processing result for database ${selectedDbId}`)
      
      return result
    } finally {
      // Clean up the ongoing processing tracking
      ongoingMetadataProcessing.delete(selectedDbId)
    }
  })()
  
  // Store the promise in the map
  ongoingMetadataProcessing.set(selectedDbId, processingPromise)
  
  return await processingPromise
}

