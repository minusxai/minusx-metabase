/**
 * Metadata Processing with Batching
 * 
 * This module handles processing metadata from fresh API responses
 * to the backend for analytics and insights. It batches metadata items
 * and sends them every 30 seconds to reduce API calls.
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

// Batching configuration
const BATCH_INTERVAL_MS = 30 * 1000; // 30 seconds
let metadataBatch: MetadataItem[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Sends the current batch of metadata items to the backend
 */
async function sendBatch(): Promise<void> {
  if (metadataBatch.length === 0) {
    return;
  }

  const itemsToSend = [...metadataBatch];
  metadataBatch = []; // Clear the batch

  try {
    const metadataRequest: MetadataRequest = {
      origin: getOrigin(),
      metadata_items: itemsToSend
    };

    await axios.post(`${configs.DEEPRESEARCH_BASE_URL}/metadata`, metadataRequest, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Successfully processed batch of ${itemsToSend.length} metadata items`);
  } catch (error) {
    console.warn(`Failed to process metadata batch:`, error);
    // On failure, we could consider re-adding items to batch, but for now we'll just log
  }
}

/**
 * Starts the batch timer if not already running
 */
function startBatchTimer(): void {
  if (batchTimer !== null) {
    return; // Timer already running
  }

  batchTimer = setInterval(() => {
    if (metadataBatch.length > 0) {
      sendBatch();
    }
  }, BATCH_INTERVAL_MS);
}

/**
 * Processes metadata items by adding them to a batch
 * The batch is automatically sent every 30 seconds if non-empty
 * @param metadataItems Array of metadata items to process
 * @param apiTemplate The API template that generated this metadata
 */
export async function processMetadata(metadataItems: MetadataItem[], apiTemplate: string): Promise<void> {
  if (!metadataItems || metadataItems.length === 0) {
    return;
  }

  // Add items to the batch
  metadataBatch.push(...metadataItems);
  
  // Start the timer if this is the first batch
  startBatchTimer();

  console.log(`Added ${metadataItems.length} metadata items from ${apiTemplate} to batch (total: ${metadataBatch.length})`);
}

/**
 * Forces immediate sending of the current batch
 * Useful for cleanup on app shutdown or for testing
 */
export async function flushMetadataBatch(): Promise<void> {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
  await sendBatch();
}

/**
 * Stops the batching timer
 * Useful for cleanup on app shutdown
 */
export function stopMetadataBatching(): void {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
}