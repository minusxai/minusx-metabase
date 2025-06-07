# Metabase API Usage Examples

This file demonstrates how to use the elegant, simplified Metabase API system with automatic caching, concurrency control, and rate limiting.

## Basic Usage (High-Level Functions)

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

## Direct API Usage (Low-Level Functions)

```typescript
import { 
  fetchDatabaseList,
  fetchDatabaseInfo,
  fetchTableMetadata,
  fetchFieldUniqueValues,
  fetchSessionProperties
} from './metabaseAPI';

// Direct API calls - automatically cached and rate-limited
const databases = await fetchDatabaseList({});
const dbInfo = await fetchDatabaseInfo({ db_id: 123 });
const tableMetadata = await fetchTableMetadata({ table_id: 456 });
const fieldValues = await fetchFieldUniqueValues({ field_id: 789 });
const sessionProps = await fetchSessionProperties({});
```

## Creating Custom APIs

The system uses a single `createAPI` function that handles everything:

```typescript
import { createAPI } from './metabaseAPI';

// Create a new API endpoint
const fetchCustomEndpoint = createAPI<{ id: number }>(
  '/api/custom/{{id}}',
  'GET',
  {
    cache_ttl: 600,        // 10 minutes
    cache_rewarm_ttl: 300, // 5 minutes  
    max_concurrency: 5,    // Max 5 concurrent requests
    concurrency_delay: 100 // 100ms delay between requests
  }
);

// Use it
const result = await fetchCustomEndpoint({ id: 123 });
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