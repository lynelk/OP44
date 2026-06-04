/// <reference types="vite/client" />

interface AppParams {
  appId: string | null;
  token: string | null;
  fromUrl: string | null;
  functionsVersion: string | null;
  appBaseUrl: string | null;
}

interface StorageLike {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

class MapStorage implements StorageLike {
  private readonly _map = new Map<string, string>();
  setItem(key: string, value: string): void { this._map.set(key, value); }
  getItem(key: string): string | null { return this._map.get(key) ?? null; }
  removeItem(key: string): void { this._map.delete(key); }
}

const isNode = typeof window === 'undefined';
const storage: StorageLike = isNode ? new MapStorage() : window.localStorage;

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function getAppParamValue(
  paramName: string,
  { defaultValue, removeFromUrl = false }: { defaultValue?: string; removeFromUrl?: boolean } = {},
): string | null {
  if (isNode) return defaultValue ?? null;

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }
  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }
  return storage.getItem(storageKey);
}

function getAppParams(): AppParams {
  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }
  return {
    appId: getAppParamValue('app_id', { defaultValue: import.meta.env['VITE_BASE44_APP_ID'] }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: isNode ? undefined : window.location.href }),
    functionsVersion: getAppParamValue('functions_version', {
      defaultValue: import.meta.env['VITE_BASE44_FUNCTIONS_VERSION'],
    }),
    appBaseUrl: getAppParamValue('app_base_url', {
      defaultValue: import.meta.env['VITE_BASE44_APP_BASE_URL'],
    }),
  };
}

export const appParams: AppParams = getAppParams();
