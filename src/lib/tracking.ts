const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type AttributionPayload = Partial<Record<UtmKey, string>> & {
  referrer?: string;
  landing_page?: string;
};

function clean(value: string | null) {
  return value?.trim().slice(0, 500) || undefined;
}

export function getAttribution(): AttributionPayload {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const attribution: AttributionPayload = {
    referrer: clean(document.referrer),
    landing_page: clean(`${window.location.pathname}${window.location.search}`),
  };

  UTM_KEYS.forEach((key) => {
    const value = clean(params.get(key));
    if (value) attribution[key] = value;
  });

  return attribution;
}

export function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, '').slice(0, 20);
}

export function sanitizeText(value: string, maxLength = 1000) {
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
