export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type HttpConfig = {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
};

export type RequestConfig = {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
};

export type HttpResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
};

export class HttpError extends Error {
  public status: number;
  public statusText: string;
  public response?: HttpResponse;

  constructor(message: string, status: number, statusText: string, response?: HttpResponse) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
  }
}

export class Http {
  private config: HttpConfig;

  constructor(config: HttpConfig = {}) {
    this.config = {
      baseURL: '',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  private buildURL(url: string, params?: Record<string, any>): string {
    const fullURL = this.config.baseURL ? `${this.config.baseURL}${url}` : url;
    
    if (!params) return fullURL;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullURL}?${queryString}` : fullURL;
  }

  private async makeRequest<T = any>(
    method: HttpMethod,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    const mergedHeaders = {
      ...this.config.headers,
      ...config?.headers,
    };

    const timeout = config?.timeout ?? this.config.timeout;
    const fullURL = this.buildURL(url, config?.params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullURL, {
        method,
        headers: mergedHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType?.includes('text/')) {
        responseData = await response.text() as T;
      } else {
        responseData = await response.blob() as T;
      }

      const httpResponse: HttpResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };

      if (!response.ok) {
        throw new HttpError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText,
          httpResponse
        );
      }

      return httpResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof HttpError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError('Request timeout', 408, 'Request Timeout');
      }
      
      throw new HttpError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'Network Error'
      );
    }
  }

  // HTTP method shortcuts
  async get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, config);
  }

  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('POST', url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, config);
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, config);
  }

  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, config);
  }

  // Instance configuration
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }
}

// Create a default instance
export const http = new Http();

// Convenience function to create new instances
export const createHttp = (config?: HttpConfig): Http => new Http(config);

export const query = new URLSearchParams(window.location.search);
