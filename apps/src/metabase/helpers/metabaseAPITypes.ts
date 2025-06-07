/**
 * Type-Safe Metabase API Definitions
 * 
 * Defines all Metabase API endpoints with:
 * - Template URLs with parameter placeholders
 * - HTTP methods
 * - Required parameter types
 * - Performance configuration mapping
 */

// =============================================================================
// BASE API INTERFACE
// =============================================================================

interface BaseMetabaseAPI {
  readonly template: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly params: Record<string, any>;
}

// =============================================================================
// SPECIFIC API ENDPOINT DEFINITIONS
// =============================================================================

// Database Operations
export interface DatabaseListAPI extends BaseMetabaseAPI {
  readonly template: '/api/database';
  readonly method: 'GET';
  readonly params: {};
}

export interface DatabaseInfoAPI extends BaseMetabaseAPI {
  readonly template: '/api/database/{{db_id}}';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
  };
}

export interface DatabaseWithTablesAPI extends BaseMetabaseAPI {
  readonly template: '/api/database/{{db_id}}?include=tables';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
  };
}

// Table Operations
export interface TableMetadataAPI extends BaseMetabaseAPI {
  readonly template: '/api/table/{{table_id}}/query_metadata';
  readonly method: 'GET';
  readonly params: {
    table_id: number;
  };
}

// Field Operations
export interface FieldUniqueValuesAPI extends BaseMetabaseAPI {
  readonly template: '/api/field/{{field_id}}/values';
  readonly method: 'GET';
  readonly params: {
    field_id: number;
  };
}

// Search Operations
export interface SearchUserEditsAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?edited_by={{user_id}}';
  readonly method: 'GET';
  readonly params: {
    user_id: number;
  };
}

export interface SearchUserCreationsAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?created_by={{user_id}}';
  readonly method: 'GET';
  readonly params: {
    user_id: number;
  };
}

export interface SearchByQueryAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?table_db_id={{db_id}}&q={{query}}';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
    query: string;
  };
}

export interface SearchUserEditsWithQueryAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?table_db_id={{db_id}}&q={{query}}&edited_by={{user_id}}';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
    query: string;
    user_id: number;
  };
}

export interface SearchUserCreationsWithQueryAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?table_db_id={{db_id}}&q={{query}}&created_by={{user_id}}';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
    query: string;
    user_id: number;
  };
}

export interface SearchAllWithQueryAPI extends BaseMetabaseAPI {
  readonly template: '/api/search?models=card&table_db_id={{db_id}}&q={{query}}';
  readonly method: 'GET';
  readonly params: {
    db_id: number;
    query: string;
  };
}

// System Operations
export interface SessionPropertiesAPI extends BaseMetabaseAPI {
  readonly template: '/api/session/properties';
  readonly method: 'GET';
  readonly params: {};
}

// =============================================================================
// UNION TYPE FOR ALL APIS
// =============================================================================

export type MetabaseAPI = 
  | DatabaseListAPI
  | DatabaseInfoAPI
  | DatabaseWithTablesAPI
  | TableMetadataAPI
  | FieldUniqueValuesAPI
  | SearchUserEditsAPI
  | SearchUserCreationsAPI
  | SearchByQueryAPI
  | SearchUserEditsWithQueryAPI
  | SearchUserCreationsWithQueryAPI
  | SearchAllWithQueryAPI
  | SessionPropertiesAPI;

// =============================================================================
// API CONFIGURATION MAPPING
// =============================================================================

export interface APIPerformanceConfig {
  cache_ttl: number;        // Cache TTL in seconds
  cache_rewarm_ttl: number; // Background refresh TTL in seconds
  max_concurrency: number;  // Max concurrent requests for this endpoint
  concurrency_delay: number; // Min delay between requests in milliseconds
}

export const API_PERFORMANCE_CONFIG: Record<string, APIPerformanceConfig> = {
  // Database operations - relatively fast, can cache longer
  '/api/database': {
    cache_ttl: 1000,        // ~17 minutes
    cache_rewarm_ttl: 600,  // 10 minutes
    max_concurrency: 10,
    concurrency_delay: 50
  },
  
  '/api/database/{{db_id}}': {
    cache_ttl: 1200,        // 20 minutes
    cache_rewarm_ttl: 600,
    max_concurrency: 10,
    concurrency_delay: 50
  },
  
  '/api/database/{{db_id}}?include=tables': {
    cache_ttl: 800,         // 13 minutes - more volatile with table list
    cache_rewarm_ttl: 400,
    max_concurrency: 5,     // More expensive call
    concurrency_delay: 100
  },

  // Table metadata - moderate expense
  '/api/table/{{table_id}}/query_metadata': {
    cache_ttl: 1800,        // 30 minutes
    cache_rewarm_ttl: 900,
    max_concurrency: 8,
    concurrency_delay: 100
  },

  // Field unique values - EXPENSIVE in Metabase, very conservative limits
  '/api/field/{{field_id}}/values': {
    cache_ttl: 3600,        // 1 hour - cache heavily
    cache_rewarm_ttl: 1800,
    max_concurrency: 3,     // Very conservative
    concurrency_delay: 500  // Half-second delay between requests
  },

  // Search operations - can be expensive depending on DB size
  '/api/search?edited_by={{user_id}}': {
    cache_ttl: 600,         // 10 minutes
    cache_rewarm_ttl: 300,
    max_concurrency: 4,
    concurrency_delay: 200
  },

  '/api/search?created_by={{user_id}}': {
    cache_ttl: 600,
    cache_rewarm_ttl: 300,
    max_concurrency: 4,
    concurrency_delay: 200
  },

  '/api/search?table_db_id={{db_id}}&q={{query}}': {
    cache_ttl: 300,         // 5 minutes - search results change frequently
    cache_rewarm_ttl: 150,
    max_concurrency: 2,     // Search can be expensive
    concurrency_delay: 300
  },

  '/api/search?table_db_id={{db_id}}&q={{query}}&edited_by={{user_id}}': {
    cache_ttl: 300,
    cache_rewarm_ttl: 150,
    max_concurrency: 2,
    concurrency_delay: 300
  },

  '/api/search?table_db_id={{db_id}}&q={{query}}&created_by={{user_id}}': {
    cache_ttl: 300,
    cache_rewarm_ttl: 150,
    max_concurrency: 2,
    concurrency_delay: 300
  },

  '/api/search?models=card&table_db_id={{db_id}}&q={{query}}': {
    cache_ttl: 300,
    cache_rewarm_ttl: 150,
    max_concurrency: 2,
    concurrency_delay: 300
  },

  // System properties - rarely changes
  '/api/session/properties': {
    cache_ttl: 86400,       // 24 hours
    cache_rewarm_ttl: 43200, // 12 hours
    max_concurrency: 5,
    concurrency_delay: 0
  }
};

// Default config for any endpoint not explicitly configured
export const DEFAULT_API_CONFIG: APIPerformanceConfig = {
  cache_ttl: 600,         // 10 minutes
  cache_rewarm_ttl: 300,  // 5 minutes
  max_concurrency: 10,
  concurrency_delay: 100
};

// =============================================================================
// TYPED API CONSTANTS FOR CLEAN USAGE
// =============================================================================

export const API_DATABASE_LIST: DatabaseListAPI = {
  template: '/api/database',
  method: 'GET',
  params: {}
};

export const API_DATABASE_INFO: DatabaseInfoAPI = {
  template: '/api/database/{{db_id}}',
  method: 'GET',
  params: {} as { db_id: number }
};

export const API_DATABASE_WITH_TABLES: DatabaseWithTablesAPI = {
  template: '/api/database/{{db_id}}?include=tables',
  method: 'GET',
  params: {} as { db_id: number }
};

export const API_TABLE_METADATA: TableMetadataAPI = {
  template: '/api/table/{{table_id}}/query_metadata',
  method: 'GET',
  params: {} as { table_id: number }
};

export const API_FIELD_UNIQUE_VALUES: FieldUniqueValuesAPI = {
  template: '/api/field/{{field_id}}/values',
  method: 'GET',
  params: {} as { field_id: number }
};

export const API_SEARCH_USER_EDITS: SearchUserEditsAPI = {
  template: '/api/search?edited_by={{user_id}}',
  method: 'GET',
  params: {} as { user_id: number }
};

export const API_SEARCH_USER_CREATIONS: SearchUserCreationsAPI = {
  template: '/api/search?created_by={{user_id}}',
  method: 'GET',
  params: {} as { user_id: number }
};

export const API_SEARCH_BY_QUERY: SearchByQueryAPI = {
  template: '/api/search?table_db_id={{db_id}}&q={{query}}',
  method: 'GET',
  params: {} as { db_id: number; query: string }
};

export const API_SEARCH_USER_EDITS_WITH_QUERY: SearchUserEditsWithQueryAPI = {
  template: '/api/search?table_db_id={{db_id}}&q={{query}}&edited_by={{user_id}}',
  method: 'GET',
  params: {} as { db_id: number; query: string; user_id: number }
};

export const API_SEARCH_USER_CREATIONS_WITH_QUERY: SearchUserCreationsWithQueryAPI = {
  template: '/api/search?table_db_id={{db_id}}&q={{query}}&created_by={{user_id}}',
  method: 'GET',
  params: {} as { db_id: number; query: string; user_id: number }
};

export const API_SEARCH_ALL_WITH_QUERY: SearchAllWithQueryAPI = {
  template: '/api/search?models=card&table_db_id={{db_id}}&q={{query}}',
  method: 'GET',
  params: {} as { db_id: number; query: string }
};

export const API_SESSION_PROPERTIES: SessionPropertiesAPI = {
  template: '/api/session/properties',
  method: 'GET',
  params: {}
};