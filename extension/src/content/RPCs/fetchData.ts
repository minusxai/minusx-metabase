export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface SortCriteria {
  sortBy: string;     // Field to sort by (e.g., 'view_count', 'created_at')
  max: number;        // Take top N items after sorting
  desc?: boolean;     // Sort descending (default true)
}

export interface DataFilter {
  maxLength?: number;           // Hard limit on array length
  sortPriority?: SortCriteria[]; // Multi-stage sorting: top N by first criteria, then top M by second, etc.
}

/**
 * Apply smart sorting and limiting to reduce payload before RPC transfer
 */
function applyDataFilter<T>(data: T, filter: DataFilter): T {
  if (!filter || !Array.isArray(data)) {
    return data;
  }

  console.log(`[minusx] [FILTER] Applying filter to array of ${data.length} items`);

  let result = [...data]; // Work with a copy

  // Apply sortPriority if specified
  if (filter.sortPriority && filter.sortPriority.length > 0) {
    console.log(`[minusx] [FILTER] Applying ${filter.sortPriority.length} sort criteria`);

    const selectedItems: any[] = [];
    let remaining = result;

    for (let i = 0; i < filter.sortPriority.length; i++) {
      const criteria = filter.sortPriority[i];
      const desc = criteria.desc !== false; // Default to descending

      console.log(`[minusx] [FILTER] Step ${i + 1}: Sort by '${criteria.sortBy}' (${desc ? 'desc' : 'asc'}), take top ${criteria.max}`);

      // Sort remaining items by this criteria
      const sorted = remaining.sort((a, b) => {
        const aVal = a[criteria.sortBy] ?? 0;
        const bVal = b[criteria.sortBy] ?? 0;
        return desc ? (bVal - aVal) : (aVal - bVal);
      });

      // Take top N items
      const selected = sorted.slice(0, criteria.max);
      selectedItems.push(...selected);

      console.log(`[minusx] [FILTER] Selected ${selected.length} items (total so far: ${selectedItems.length})`);

      // Remove selected items from remaining for next iteration
      const selectedIds = new Set(selected.map((item, idx) =>
        item.id ?? idx // Use id if available, otherwise index
      ));
      remaining = sorted.filter((item, idx) =>
        !selectedIds.has(item.id ?? idx)
      );

      if (remaining.length === 0) break;
    }

    result = selectedItems;
    console.log(`[minusx] [FILTER] After sort priority: ${result.length} items`);
  }

  // Apply maxLength as final hard limit
  if (filter.maxLength && result.length > filter.maxLength) {
    console.log(`[minusx] [FILTER] Trimming from ${result.length} to ${filter.maxLength}`);
    result = result.slice(0, filter.maxLength);
  }

  const originalSize = JSON.stringify(data).length;
  const filteredSize = JSON.stringify(result).length;
  const savedMB = (originalSize - filteredSize) / 1024 / 1024;
  const savedPct = ((originalSize - filteredSize) / originalSize * 100).toFixed(1);

  console.log(`[minusx] [FILTER] ✅ Result: ${data.length} → ${result.length} items`);
  console.log(`[minusx] [FILTER] Memory saved: ${savedMB.toFixed(2)} MB (${savedPct}%)`);

  return result as T;
}

function getCookie(name: string): string | null {
  let cookieValue: string | null = null
  if (document.cookie && document.cookie !== '') {
    for (let cookie of document.cookie.split(';')) {
      cookie = cookie.trim()
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

export function getMXToken(): string | null {
  // Get the CSRF token from the cookie
  return getCookie('mx_jwt')
}

export async function fetchData<T>(
  url: string,
  method: HttpMethod,
  body: unknown,
  headers: Record<string, string>,
  csrfInfo?: {
    cookieKey: string,
    headerKey: string
  },
  dataFilter?: DataFilter  // Optional: Apply smart sorting/limiting before RPC transfer
): Promise<T> {
  if (csrfInfo && csrfInfo?.cookieKey && csrfInfo?.headerKey) {
    const token = getCookie(csrfInfo.cookieKey);
    if (token) {
      headers[csrfInfo.headerKey] = String(token);
    }
  }
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        let data = {}
        try{
            data = await response.json();
        } catch(e) {
          // ignore JSON parse error
        }
      throw new Error(`Error! status: ${response.status}, DETAILS:${JSON.stringify(data)}`);
    }
    let data: T = await response.json();

    // Apply filter BEFORE RPC transfer to reduce memory
    if (dataFilter) {
      console.log(`[minusx] [FILTER] Filtering ${url} before RPC transfer`);
      data = applyDataFilter(data, dataFilter);
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error, ', fetch url:', url);
    throw error;
  }
}
