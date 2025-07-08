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
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      }
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
export async function calculateMetadataHash(metadataType: string, metadataValue: any, version: string): Promise<string> {
  // Simplified hash calculation - just hash the stringified data
  const content = JSON.stringify({ metadataType, version, metadataValue });
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Uploads cards metadata to the backend using processMetadata
 * @param cards The cards data to upload
 * @param metadataHash The calculated hash to send to server
 * @returns The hash returned from the server
 */
export async function uploadCardsMetadata(cards: any, metadataHash: string): Promise<string> {
  const metadataItem: MetadataItem = {
    metadata_type: 'cards',
    metadata_value: { cards },
    version: '1.0',
    metadata_hash: metadataHash
  };

  try {
    const response = await processMetadata([metadataItem]);
    const hash = get(response, 'results[0].metadata_hash')
    return hash
  } catch (error) {
    console.warn('Failed to upload cards metadata:', error);
    throw error;
  }
}