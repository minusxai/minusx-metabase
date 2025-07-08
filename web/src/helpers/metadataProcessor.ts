/**
 * Cards Metadata Processing
 * 
 * This module handles uploading cards metadata to the backend
 * with hash-based caching to avoid redundant uploads.
 */

import axios from 'axios';
import { configs } from '../constants';
import { getOrigin } from './origin';

export interface MetadataItem {
  metadata_type: string;
  metadata_value: any;
  version: string;
}

export interface MetadataRequest {
  origin: string;
  metadata_items: MetadataItem[];
}

/**
 * Calculates metadata hash for caching purposes
 */
export async function calculateMetadataHash(metadataType: string, metadataValue: any, version: string): Promise<string> {
  const hashParts = [
    `metadata_type:${metadataType}`,
    `version:${version}`,
    `metadata_value:${JSON.stringify(metadataValue, Object.keys(metadataValue).sort())}`
  ];

  const hashContent = hashParts.join('|');
  const data = new TextEncoder().encode(hashContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Uploads cards metadata to the backend (simplified, immediate upload)
 * @param cards The cards data to upload
 * @returns The hash returned from the server
 */
export async function uploadCardsMetadata(cards: any): Promise<string> {
  const metadataRequest: MetadataRequest = {
    origin: getOrigin(),
    metadata_items: [
      {
        metadata_type: 'cards',
        metadata_value: cards,
        version: '1.0'
      }
    ]
  };

  try {
    const response = await axios.post<{hash: string}>(
      `${configs.DEEPRESEARCH_BASE_URL}/metadata`, 
      metadataRequest, 
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Successfully uploaded cards metadata');
    return response.data.hash;
  } catch (error) {
    console.warn('Failed to upload cards metadata:', error);
    throw error;
  }
}