import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await res.json();
      throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
    } else {
      const text = await res.text();
      throw new Error(text || `${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any,
  options?: RequestInit
): Promise<Response> {
  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {})
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    ...options
  };
  
  try {
    const res = await fetch(url, fetchOptions);
    return res;
  } catch (error) {
    console.error('API request error:', error);
    throw new Error('Network error. Please try again.');
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Check if the response has content before trying to parse JSON
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    
    return null;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
