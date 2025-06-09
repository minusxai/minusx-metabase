/**
 * Metadata Processing
 * 
 * This module handles processing metadata from fresh API responses
 * to the backend for analytics and insights.
 */

import axios from 'axios';
import { configs } from '../constants';
import { getOrigin } from './origin';

export interface MetadataItem {
  metadata_type: string;
  metadata_value: any;
}

export interface MetadataRequest {
  origin: string;
  metadata_items: MetadataItem[];
}

/**
 * Processes metadata items to the backend
 * @param metadataItems Array of metadata items to process
 * @param apiTemplate The API template that generated this metadata
 */
export async function processMetadata(metadataItems: MetadataItem[], apiTemplate: string): Promise<void> {
  if (!metadataItems || metadataItems.length === 0) {
    return;
  }

  try {
    const metadataRequest: MetadataRequest = {
      origin: getOrigin(),
      metadata_items: metadataItems
    };

    await axios.post(`${configs.DEEPRESEARCH_BASE_URL}/metadata`, metadataRequest, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Successfully processed ${metadataItems.length} metadata items for ${apiTemplate}`);
  } catch (error) {
    console.warn(`Failed to process metadata for ${apiTemplate}:`, error);
  }
}