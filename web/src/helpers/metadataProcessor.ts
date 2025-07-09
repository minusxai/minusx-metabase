/**
 * Cards Metadata Processing
 * 
 * This module handles uploading cards metadata to the backend
 * with hash-based caching to avoid redundant uploads.
 */

import axios from 'axios';
import { configs } from '../constants';
import { getOrigin } from './origin';
import { get } from 'lodash';
import { setMetadataHash } from '../state/settings/reducer';
import { getState } from '../state/store';
import { dispatch } from '../state/dispatch';
import { getAllCards, getDatabaseTablesAndModelsWithoutFields } from '../../../apps/src/metabase/helpers/metabaseAPIHelpers';

export interface MetadataItem {
  metadata_type: string;
  metadata_value: any;
  version: string;
  metadata_hash: string;
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
    const response = await axios.post(
      `${configs.DEEPRESEARCH_BASE_URL}/metadata`, 
      metadataRequest, 
    );

    return response.data;
  } catch (error) {
    console.warn('Failed to upload metadata items:', error);
    throw error;
  }
}

/**
 * Calculates metadata hash for caching purposes (simplified & faster)
 */
async function calculateMetadataHash(metadataType: string, metadataValue: any, version: string): Promise<string> {
  // Simplified hash calculation - just hash the stringified data
  const content = JSON.stringify({ metadataType, version, metadataValue });
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Global map to track ongoing uploads by hash
const ongoingUploads = new Map<string, Promise<string>>();

/**
 * Generic function to upload any metadata type to the backend
 * @param metadataType The type of metadata (e.g., 'cards', 'dbSchema')
 * @param data The data to upload
 * @param metadataHash The calculated hash to send to server
 * @returns The hash returned from the server
 */
async function uploadMetadata(metadataType: string, data: any, metadataHash: string): Promise<string> {
  // Check if this hash is already being uploaded
  if (ongoingUploads.has(metadataHash)) {
    console.log(`[minusx] Upload already in progress for hash ${metadataHash}, waiting...`)
    return await ongoingUploads.get(metadataHash)!;
  }

  // Create and store the upload promise
  const uploadPromise = (async () => {
    const metadataItem: MetadataItem = {
      metadata_type: metadataType,
      metadata_value: { [metadataType]: data },
      version: '1.0',
      metadata_hash: metadataHash
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
  dataFetcher: () => Promise<any>): Promise<string> {
  // Fetch the data
  const data = await dataFetcher()
  console.log('Retrieved data for metadata type', metadataType, data)

  // Calculate hash of current data
  const currentHash = await calculateMetadataHash(metadataType, { [metadataType]: data }, '1.0')

  // Get stored hashes from Redux
  const currentState = getState()
  const storedHashes = currentState.settings.metadataHashes

  // Only upload if hash doesn't exist in the Record
  if (!storedHashes[currentHash]) {
    try {
      console.log(`[minusx] ${metadataType} data changed, uploading to metadata endpoint`)
      const serverHash = await uploadMetadata(metadataType, data, currentHash)

      // Store the new hash in Redux
      dispatch(setMetadataHash(serverHash))
      console.log(`[minusx] ${metadataType} metadata uploaded and hash updated`)
    } catch (error) {
      console.warn(`[minusx] Failed to upload ${metadataType} metadata:`, error)
      // Continue without failing the entire request
    }
  } else {
    console.log(`[minusx] ${metadataType} data unchanged, skipping metadata upload`)
  }

  // Return the hash
  return currentHash
}

export async function processCards() {
  return await processMetadataWithCaching('cards', getAllCards)
}

export async function processDBSchema() {
  return await processMetadataWithCaching('dbSchema', getDatabaseTablesAndModelsWithoutFields)
}

