import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: appId ?? undefined,
  token: token ?? undefined,
  functionsVersion: functionsVersion ?? undefined,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl: appBaseUrl ?? undefined,
});
