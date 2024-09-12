export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

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

export async function fetchData<T>(
  url: string,
  method: HttpMethod,
  body: unknown,
  headers: Record<string, string>,
  csrfInfo?: {
    cookieKey: string,
    headerKey: string
  }
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
      throw new Error(`HTTP error! status: ${response.status}, fetch url: ${url},  message: ${response.statusText}`);
    }
    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error, ', fetch url:', url);
    throw error;
  }
}
