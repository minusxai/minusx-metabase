# Metabase API Client Usage Examples

This file demonstrates how to use the new type-safe Metabase API client with automatic caching, concurrency control, and rate limiting.

## Basic Usage (Existing Functions - Backward Compatible)

```typescript
import { 
  getDatabases, 
  getDatabase, 
  getTable, 
  getUserContext, 
  findRelevantTables 
} from './metabaseAPI';

// Get all databases
const databases = await getDatabases();

// Get specific database with tables
const dbWithTables = await getDatabase(123, true);

// Get table with columns and unique values
const table = await getTable(456, { 
  includeColumns: true, 
  includeUniqueValues: true 
});

// Get user's query context
const context = await getUserContext();

// Find relevant tables
const tables = await findRelevantTables(123, { 
  searchQuery: 'customer',
  includeColumns: true,
  maxTables: 10
});
```

## Advanced Usage (Direct API Client)

```typescript
import { 
  fetchMetabaseAPI, 
  createMetabaseAPIFetch 
} from './metabaseAPIClient';
import { 
  API_DATABASE_INFO, 
  API_FIELD_UNIQUE_VALUES 
} from './metabaseAPITypes';

// Direct API calls with automatic concurrency control and caching
const dbInfo = await fetchMetabaseAPI(API_DATABASE_INFO, { db_id: 123 });

// Create custom memoized function
const memoizedFieldValues = createMetabaseAPIFetch(API_FIELD_UNIQUE_VALUES);
const values = await memoizedFieldValues({ field_id: 789 });
```

## Monitoring and Debugging

```typescript
import { 
  getConcurrencyStats, 
  getAPIConfiguration 
} from './metabaseAPI';

// Check current concurrency status
const stats = getConcurrencyStats();
console.log('Active requests:', stats['/api/field/{{field_id}}/values'].active);
console.log('Queued requests:', stats['/api/field/{{field_id}}/values'].queued);

// Check configuration for an endpoint
const config = getAPIConfiguration('/api/field/{{field_id}}/values');
console.log('Max concurrency:', config.max_concurrency); // 3
console.log('Delay between requests:', config.concurrency_delay); // 500ms
console.log('Cache TTL:', config.cache_ttl); // 3600 seconds
```

## Performance Features

### Automatic Rate Limiting
- Field unique values: Max 3 concurrent, 500ms delay
- Search operations: Max 2 concurrent, 300ms delay  
- Table metadata: Max 8 concurrent, 100ms delay
- Database operations: Max 10 concurrent, 50ms delay

### Intelligent Caching
- Field unique values: 1 hour cache (expensive operations)
- Table metadata: 30 minutes cache
- Database info: 20 minutes cache
- Search results: 5 minutes cache

### Background Refresh
- Uses stale-while-revalidate pattern
- Returns cached data while refreshing in background
- Prevents duplicate concurrent requests
- Persists across browser sessions (IndexedDB)

## Error Handling

The API client automatically handles:
- Parameter validation (compile-time and runtime)
- Request queuing during high load
- Failed request retries (via web/cache)
- Graceful degradation on API errors

```typescript
try {
  const table = await getTable(123, { includeColumns: true });
} catch (error) {
  console.error('Failed to get table:', error);
  // Error includes context about missing parameters, network issues, etc.
}
```