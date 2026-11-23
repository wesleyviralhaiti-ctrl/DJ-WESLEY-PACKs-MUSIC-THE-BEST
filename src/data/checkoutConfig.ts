export function sanitizeHttpUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidOptionalHttpUrl(rawUrl: string): boolean {
  if (!rawUrl.trim()) return true;
  return sanitizeHttpUrl(rawUrl) !== null;
}

export interface AutomatedCheckoutConfig {
  defaultCheckoutUrl: string;
  planLinks: {
    '10-folder': string;
    '21-folder': string;
    '36-folder': string;
    '55-folder': string;
    'unlimited-vip': string;
  };
  updatedAt: number;
}

export const CHECKOUT_CONFIG_STORAGE_KEY = 'wesley_automated_checkout_v1';

export const DEFAULT_CHECKOUT_CONFIG: AutomatedCheckoutConfig = {
  defaultCheckoutUrl: '',
  planLinks: {
    '10-folder': '',
    '21-folder': '',
    '36-folder': '',
    '55-folder': '',
    'unlimited-vip': '',
  },
  updatedAt: 0,
};

export function loadCheckoutConfig(): AutomatedCheckoutConfig {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CHECKOUT_CONFIG;
    const parsed = JSON.parse(raw) as {
      defaultCheckoutUrl?: string;
      planLinks?: Record<string, string>;
      updatedAt?: number;
    };
    const rawLinks = parsed.planLinks || {};
    const isNewSchema =
      '21-folder' in rawLinks || '36-folder' in rawLinks || '55-folder' in rawLinks;

    const getUrl = (key: string) =>
      typeof rawLinks[key] === 'string' ? sanitizeHttpUrl(rawLinks[key]) ?? '' : '';

    return {
      defaultCheckoutUrl:
        typeof parsed.defaultCheckoutUrl === 'string'
          ? sanitizeHttpUrl(parsed.defaultCheckoutUrl) ?? ''
          : '',
      planLinks: {
        '10-folder': isNewSchema ? getUrl('10-folder') : getUrl('1-folder'),
        '21-folder': isNewSchema ? getUrl('21-folder') : getUrl('3-folder'),
        '36-folder': isNewSchema ? getUrl('36-folder') : getUrl('5-folder'),
        '55-folder': isNewSchema ? getUrl('55-folder') : getUrl('10-folder'),
        'unlimited-vip': getUrl('unlimited-vip'),
      },
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return DEFAULT_CHECKOUT_CONFIG;
  }
}

export function saveCheckoutConfig(
  config: AutomatedCheckoutConfig
): AutomatedCheckoutConfig {
  const sanitized: AutomatedCheckoutConfig = {
    defaultCheckoutUrl: sanitizeHttpUrl(config.defaultCheckoutUrl) ?? '',
    planLinks: {
      '10-folder': sanitizeHttpUrl(config.planLinks['10-folder']) ?? '',
      '21-folder': sanitizeHttpUrl(config.planLinks['21-folder']) ?? '',
      '36-folder': sanitizeHttpUrl(config.planLinks['36-folder']) ?? '',
      '55-folder': sanitizeHttpUrl(config.planLinks['55-folder']) ?? '',
      'unlimited-vip': sanitizeHttpUrl(config.planLinks['unlimited-vip']) ?? '',
    },
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(CHECKOUT_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return sanitized;
}

export function resolvePlanCheckoutUrl(
  config: AutomatedCheckoutConfig,
  planId: string
): string | null {
  const specific =
    planId === '10-folder' ||
    planId === '21-folder' ||
    planId === '36-folder' ||
    planId === '55-folder' ||
    planId === 'unlimited-vip'
      ? config.planLinks[planId]
      : '';
  return sanitizeHttpUrl(specific) ?? sanitizeHttpUrl(config.defaultCheckoutUrl);
}
