/**
 * Cards Metadata Processing
 * 
 * This module handles uploading cards metadata to the backend
 * with hash-based caching to avoid redundant uploads.
 */

import axios from 'axios';
import { configs } from '../constants';
import { getParsedIframeInfo } from './origin';
import { get, isEmpty } from 'lodash';
import { MetadataProcessingResult, MetadataHashInfo, setMetadataHash, setMetadataProcessingCache, clearMetadataProcessingCache } from '../state/settings/reducer';
import { getState } from '../state/store';
import { dispatch } from '../state/dispatch';
import { getAllCardsAndModels, getDatabaseTablesAndModelsWithoutFields, getAllFields, getRelevantTablesAndDetailsForSelectedDb } from 'apps'
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

interface MetadataRequest {
  origin: string;
  r: string;
  metadata_items: MetadataItem[];
}

/**
 * Uploads metadata items to the backend (simplified, immediate upload)
 * @param metadataItems Array of metadata items to upload
 * @returns The response from the server
 */
export async function processMetadata(metadataItems: MetadataItem[]): Promise<any> {
  const iframeInfo = getParsedIframeInfo()
  const metadataRequest: MetadataRequest = {
    origin: iframeInfo.origin,
    r: iframeInfo.r,
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

/**
 * Finds the most recent hash for a given metadataType and database_id
 * @param metadataType The type of metadata (e.g., 'cards', 'dbSchema')
 * @param database_id The database ID
 * @returns The most recent hash or undefined if none found
 */
function findMostRecentHash(metadataType: string, database_id: number): string | undefined {
  const currentState = getState()
  const storedHashes = currentState.settings.metadataHashes
  
  let mostRecentHash: string | undefined = undefined
  let mostRecentTimestamp = 0
  
  for (const [hash, info] of Object.entries(storedHashes)) {
    if (info.metadataType === metadataType && info.database_id === database_id) {
      if (info.timestamp > mostRecentTimestamp) {
        mostRecentTimestamp = info.timestamp
        mostRecentHash = hash
      }
    }
  }
  
  return mostRecentHash
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

/**
 * Generates a presigned URL and object key
 */
async function generateObjectKey(metadataType: string, database_id: number): Promise<{url: string, key: string}> {
  const iframeInfo = getParsedIframeInfo()
  const request = {
    origin: iframeInfo.origin,
    r: iframeInfo.r,
    metadata_type: metadataType,
    database_id: `${database_id}`
  };

  const response = await axios.post(
    `${configs.DEEPRESEARCH_BASE_URL}/metadata/generate_key`, 
    request
  );
  
  return response.data;
}

async function uploadMetadata(metadataType: string, data: any, metadataHash: string, database_id: number): Promise<string | undefined> {
  // Check if this hash is already being uploaded
  if (ongoingUploads.has(metadataHash)) {
    console.log(`[minusx] Upload already in progress for hash ${metadataHash}, waiting...`)
    return await ongoingUploads.get(metadataHash)!;
  }

  const uploadPromise = (async () => {
    let metadata_value = { [metadataType]: data }
    
    try {
      const compressedData = await gzipBase64(data);
      
      try {
        const objectData = await generateObjectKey(metadataType, database_id);
        
        await axios.put(objectData.url, compressedData, {
          headers: {
            'Content-Type': 'application/octet-stream',
          }
        });
        console.log('[minusx] Successfull new obj flow:', objectData);
        
        metadata_value = {
          type: 'gzip_objstore',
          [metadataType]: objectData
        }
      } catch (objError) {
        console.warn(`Failed to process ${metadataType}, falling back to older method:`, objError);
        
        // Fallback to direct upload
        metadata_value = {
          type: 'gzip',
          [metadataType]: compressedData
        }
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
        // Try to return the most recent hash for this metadataType and database_id
        const fallbackHash = findMostRecentHash(metadataType, database_id)
        if (fallbackHash) {
          console.log(`[minusx] Using fallback hash for ${metadataType} on database ${database_id}: ${fallbackHash}`)
          return fallbackHash
        }
        return undefined; // Return undefined when upload failed and no fallback available
      }
      dispatch(setMetadataHash({ hash: serverHash, metadataType, database_id }))
      console.log(`[minusx] ${metadataType} metadata uploaded and hash updated`)
    } catch (error) {
      console.warn(`[minusx] Failed to upload ${metadataType} metadata:`, error)
      // Try to return the most recent hash for this metadataType and database_id
      const fallbackHash = findMostRecentHash(metadataType, database_id)
      if (fallbackHash) {
        console.log(`[minusx] Using fallback hash for ${metadataType} on database ${database_id}: ${fallbackHash}`)
        return fallbackHash
      }
      return undefined
      // Continue without failing the entire request
    }
  } else {
    console.log(`[minusx] ${metadataType} data unchanged, skipping metadata upload`)
  }

  // Return the hash
  return currentHash
}

export async function processAllMetadata(forceRefresh:boolean = false, currentDBId: number) : Promise<MetadataProcessingResult> {
  console.log('[minusx] Starting coordinated metadata processing with parallel API calls...') 
  
  // Step 1: Start all expensive API calls in parallel
  console.log('[minusx] Initiating parallel API calls...')
  const selectedDbId = currentDBId
  
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
      
      const [dbSchema, { cards }, allFields] = await Promise.all([
        getRelevantTablesAndDetailsForSelectedDb(selectedDbId, forceRefresh),
        getAllCardsAndModels(forceRefresh, selectedDbId),
        forceRefresh ? fetchDatabaseFields.refresh({ db_id: selectedDbId }) : fetchDatabaseFields({ db_id: selectedDbId })
      ])
      console.log('[minusx] All API calls completed. Processing data...')
      
      const filteredFields = allFields // Not filtering in new flow
      
      console.log('[minusx] Fields after filtering:', filteredFields.length, 'out of', allFields.length)
      
      // Step 5: Process metadata for all four with filtered data
      console.log('[minusx] Processing metadata with filtered data...')
      
      const [cardsHash, dbSchemaHash, fieldsHash] = await Promise.all([
        processMetadataWithCaching('cards', async () => cards, selectedDbId),
        processMetadataWithCaching('dbSchema', async () => dbSchema, selectedDbId),
        processMetadataWithCaching('fields', async () => filteredFields, selectedDbId),
      ])
      
      console.log('[minusx] Coordinated metadata processing complete')
      
      const result = {
        cardsHash,
        dbSchemaHash, 
        fieldsHash,
        selectedDbId
      }
  
      // Cache the result for this database ID
      const is_authenticated = getState().auth.is_authenticated;
      if (!is_authenticated) {
        console.warn('[minusx] User is not authenticated, not caching metadata processing result');
      }
      else if (!result.cardsHash && !result.dbSchemaHash && !result.fieldsHash) {
        console.warn('[minusx] All hashes are undefined. Not caching')
      } else {
        dispatch(setMetadataProcessingCache({ dbId: selectedDbId, result }))
        console.log(`[minusx] Cached metadata processing result for database ${selectedDbId}`)
      }
      
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

