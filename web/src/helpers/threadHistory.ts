/**
 * Thread History Management
 * 
 * Functions for scanning thread history and restoring conversation context
 * based on SQL query matching.
 */

import { ChatThread, ChatMessage, Action, startNewThread, cloneThreadFromHistory } from '../state/chat/reducer';
import { applySQLEdits, SQLEdits, getCurrentQuery } from 'apps';
import { dispatch } from '../state/dispatch';
import { RootState } from '../state/store';
import { queryURL } from '../app/rpc';

/**
 * Normalizes SQL for comparison by removing extra whitespace, 
 * converting to lowercase, and standardizing formatting
 */
export function normalizeSQL(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }
  
  return sql
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\(\s+/g, '(') // Remove spaces after opening parentheses
    .replace(/\s+\)/g, ')') // Remove spaces before closing parentheses
    .replace(/,\s+/g, ',') // Normalize comma spacing
    .replace(/;\s*$/, ''); // Remove trailing semicolon
}

/**
 * Extracts SQL from tool call arguments, handling both ExecuteQuery and EditAndExecuteQuery
 */
function extractSQLFromAction(action: Action): string | null {
  try {
    const functionName = action.function.name;
    const args = JSON.parse(action.function.arguments);
    
    if (functionName === 'ExecuteQuery') {
      return args.sql || null;
    }
    
    if (functionName === 'EditAndExecuteQuery') {
      // For EditAndExecuteQuery, we need to reconstruct the final SQL
      // This is a simplified approach - in reality we'd need access to the base SQL
      const sql_edits = args.sql_edits as SQLEdits;
      // Note: We can't reconstruct without the original SQL, so return null for now
      // This could be enhanced to store the reconstructed SQL in the action results
      return null;
    }
    
    return null;
  } catch (error) {
    console.warn('Error extracting SQL from action:', error);
    return null;
  }
}

/**
 * Extracts MBQL from tool call arguments, handling ExecuteMBQLQuery
 */
function extractMBQLFromAction(action: Action): string | null {
  try {
    const functionName = action.function.name;
    const args = JSON.parse(action.function.arguments);
    
    if (functionName === 'ExecuteMBQLQuery') {
      return args.mbql ? JSON.stringify(args.mbql) : null;
    }
    
    return null;
  } catch (error) {
    console.warn('Error extracting MBQL from action:', error);
    return null;
  }
}

/**
 * Scans thread history for a matching MBQL query
 * Returns the first match found (most recent threads searched first)
 */
export function scanThreadsForMBQL(
  threads: ChatThread[], 
  normalizedCurrentMBQL: string
): ThreadScanResult | null {
  if (!normalizedCurrentMBQL || !threads || threads.length === 0) {
    return null;
  }
  
  // Scan threads backwards (most recent first)
  for (let threadIndex = threads.length - 1; threadIndex >= 0; threadIndex--) {
    const thread = threads[threadIndex];
    if (!thread.messages) continue;
    
    // Scan messages backwards within each thread
    for (let messageIndex = thread.messages.length - 1; messageIndex >= 0; messageIndex--) {
      const message = thread.messages[messageIndex];
      
      // Only check tool messages with ExecuteMBQLQuery actions
      if (message.role === 'tool' && message.action) {
        const extractedMBQL = extractMBQLFromAction(message.action);
        if (extractedMBQL) {
          // Normalize extracted MBQL for comparison
          let normalizedExtractedMBQL: string;
          try {
            normalizedExtractedMBQL = JSON.stringify(JSON.parse(extractedMBQL));
          } catch {
            continue; // Skip invalid MBQL
          }
          
          if (normalizedExtractedMBQL === normalizedCurrentMBQL) {
            return {
              threadIndex,
              messageIndex,
              matchingSQL: extractedMBQL // Using matchingSQL field for consistency
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Result of scanning threads for matching SQL
 */
export interface ThreadScanResult {
  threadIndex: number;
  messageIndex: number;
  matchingSQL: string;
}

/**
 * Scans thread history for a matching SQL query
 * Returns the first match found (most recent threads searched first)
 */
export function scanThreadsForSQL(
  threads: ChatThread[], 
  currentSQL: string
): ThreadScanResult | null {
  if (!currentSQL || !threads || threads.length === 0) {
    return null;
  }
  
  const normalizedCurrentSQL = normalizeSQL(currentSQL);
  if (!normalizedCurrentSQL) {
    return null;
  }
  
  // Scan threads backwards (most recent first)
  for (let threadIndex = threads.length - 1; threadIndex >= 0; threadIndex--) {
    const thread = threads[threadIndex];
    if (!thread.messages) continue;
    
    // Scan messages backwards within each thread
    for (let messageIndex = thread.messages.length - 1; messageIndex >= 0; messageIndex--) {
      const message = thread.messages[messageIndex];
      
      // Only check tool messages with ExecuteQuery or EditAndExecuteQuery actions
      if (message.role === 'tool' && message.action) {
        const extractedSQL = extractSQLFromAction(message.action);
        if (extractedSQL) {
          const normalizedExtractedSQL = normalizeSQL(extractedSQL);
          if (normalizedExtractedSQL === normalizedCurrentSQL) {
            return {
              threadIndex,
              messageIndex,
              matchingSQL: extractedSQL
            };
          }
        }
      }
    }
  }
  
  return null;
}


/**
 * Intelligent thread start function that checks for matching SQL in history
 * and restores context if found, otherwise starts a new thread
 */
export async function intelligentThreadStart(getState: () => RootState): Promise<{
  restored: boolean;
  matchingSQL?: string;
}> {
  try {
    // Get current SQL from the page
    const currentURL = await queryURL()
    let currentSQL = ''
    let currentMBQL = ''
    try {
      const url = new URL(currentURL);
      const hash = url.hash;
      const dataset_query = JSON.parse(atob(decodeURIComponent(hash.slice(1)))).dataset_query
      if (dataset_query.type == 'query') {
        currentMBQL = JSON.stringify(dataset_query.query);
      } else {
        currentSQL = dataset_query.native.query;
      }
    } catch {
      console.warn('Failed to extract SQL from URL hash, using getCurrentQuery');
    }
    if (!currentSQL && !currentMBQL) {
      // No SQL or MBQL on page, start new thread normally
      dispatch(startNewThread());
      return { restored: false };
    }

    // Get current thread state
    const state = getState();
    const threads = state.chat.threads;
    
    if (!threads || threads.length === 0) {
      // No threads to search, start new thread
      dispatch(startNewThread());
      return { restored: false };
    }

    // Scan for matching SQL in thread history
    const matchResult = currentSQL ? scanThreadsForSQL(threads, currentSQL) : scanThreadsForMBQL(threads, currentMBQL);
    
    if (matchResult) {
      // Found a match! Clone the thread up to that message
      dispatch(cloneThreadFromHistory({
        sourceThreadIndex: matchResult.threadIndex,
        upToMessageIndex: matchResult.messageIndex
      }));
      
      return { 
        restored: true, 
        matchingSQL: matchResult.matchingSQL 
      };
    } else {
      // No match found, start new thread
      dispatch(startNewThread());
      return { restored: false };
    }
    
  } catch (error) {
    console.error('Error in intelligentThreadStart:', error);
    // Fallback to normal thread start on any error
    dispatch(startNewThread());
    return { restored: false };
  }
}