export interface RuntimeConfig {
  apiBaseUrl: string;
}

let runtimeConfig: RuntimeConfig = {
  apiBaseUrl: '/api',
};

export async function cargarRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) return;

    const config = await response.json() as Partial<RuntimeConfig>;
    if (typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim()) {
      runtimeConfig = {
        apiBaseUrl: config.apiBaseUrl.trim().replace(/\/$/, ''),
      };
    }
  } catch {
    runtimeConfig = { apiBaseUrl: '/api' };
  }
}

export function getApiBaseUrl(): string {
  return runtimeConfig.apiBaseUrl;
}
