interface AppParams {
  appId: string | null;
  token: string | null;
  fromUrl: string | null;
  functionsVersion: string | null;
  appBaseUrl: string | null;
}

const isNode = typeof window === 'undefined';
const storage: Storage | Map<string, string> = isNode
  ? new Map<string, string>()
  : window.localStorage;

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
