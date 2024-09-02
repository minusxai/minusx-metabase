export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export async function fetchData<T>(
  url: string,
  method: HttpMethod,
  body: unknown,
  headers:  Record<string, string>): Promise<T> {
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
