/** Minimum connection time — programmatic defaults only. */

export const DEFAULTS = Object.freeze({
  same_station: 60,
  same_city: 180,
});

export type TransferKind = 'same_station' | 'same_city';

export type LegLike = {
  to_station?: string;
  from_station?: string;
  to_city?: string;
  from_city?: string;
  arr_at?: string;
  dep_at?: string;
};

export function classifyTransfer(
  fromLeg: LegLike | null | undefined,
  toLeg: LegLike | null | undefined
): TransferKind | null {
  if (!fromLeg || !toLeg) return null;
  if (fromLeg.to_station && toLeg.from_station && fromLeg.to_station === toLeg.from_station) {
    return 'same_station';
  }
  if (fromLeg.to_city && toLeg.from_city && fromLeg.to_city === toLeg.from_city) {
    return 'same_city';
  }
  return null;
}

export function requiredMctMinutes(
  kind: TransferKind | null,
  overrides?: Partial<typeof DEFAULTS>
): number | null {
  const cfg = { ...DEFAULTS, ...(overrides || {}) };
  if (kind === 'same_station') return cfg.same_station;
  if (kind === 'same_city') return cfg.same_city;
  return null;
}

function parseIso(s?: string): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export function bufferMinutes(
  fromLeg: LegLike | null | undefined,
  toLeg: LegLike | null | undefined
): number | null {
  const arr = parseIso(fromLeg?.arr_at);
  const dep = parseIso(toLeg?.dep_at);
  if (arr == null || dep == null) return null;
  return Math.floor((dep - arr) / 60000);
}

export function checkConnection(
  fromLeg: LegLike | null | undefined,
  toLeg: LegLike | null | undefined,
  overrides?: Partial<typeof DEFAULTS>
): {
  ok: boolean;
  kind: TransferKind | null;
  buffer_min: number | null;
  required_min: number | null;
} {
  const kind = classifyTransfer(fromLeg, toLeg);
  if (!kind) {
    return { ok: false, kind: null, buffer_min: null, required_min: null };
  }
  const required = requiredMctMinutes(kind, overrides);
  const buffer = bufferMinutes(fromLeg, toLeg);
  const ok = buffer != null && required != null && buffer >= required;
  return { ok, kind, buffer_min: buffer, required_min: required };
}

export const MCT_SAME_STATION_MIN = DEFAULTS.same_station;
export const MCT_SAME_CITY_MIN = DEFAULTS.same_city;
