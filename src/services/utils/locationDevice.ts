const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

export type LocationData = {
  lat: number;
  lng: number;
  country: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
};

export type DeviceInfo = {
  user_agent: string;
  platform: string;
  browser: string;
  os: string;
  screen: string;
  language: string;
  timezone: string;
};

export type ClientContext = {
  location: LocationData | null;
  device_info: DeviceInfo;
};

// ---------- Device (synchronous) ----------

function parseBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && ua.includes("Version/")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";
  return "Unknown";
}

function parseOS(ua: string, platform: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Win/.test(platform)) return "Windows";
  if (/Mac/.test(platform)) return "macOS";
  if (/Linux/.test(platform)) return "Linux";
  return "Unknown";
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";
  return {
    user_agent: ua,
    platform,
    browser: parseBrowser(ua),
    os: parseOS(ua, platform),
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ---------- Location (async, requires browser permission) ----------

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Partial<LocationData>> {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          "Accept-Language": "en",
          // Nominatim usage policy requires a valid User-Agent
          "User-Agent": "Aworan-VideoAI/1.0",
        },
      }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address ?? {};
    const streetParts = [addr.house_number, addr.road].filter(Boolean);
    return {
      country: addr.country ?? null,
      state: addr.state ?? addr.province ?? addr.region ?? null,
      city:
        addr.city ??
        addr.town ??
        addr.village ??
        addr.municipality ??
        addr.county ??
        null,
      street: streetParts.length > 0 ? streetParts.join(" ") : null,
    };
  } catch {
    return {};
  }
}

// IP-based fallback — no permission needed, works on HTTP and HTTPS.
async function getIPLocation(): Promise<LocationData | null> {
  try {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 6_000);
    let res: Response;
    try {
      res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    } finally {
      clearTimeout(timerId);
    }
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.city && !d.country_name) return null;
    return {
      lat: typeof d.latitude === "number" ? d.latitude : 0,
      lng: typeof d.longitude === "number" ? d.longitude : 0,
      country: d.country_name ?? null,
      state: d.region ?? null,
      city: d.city ?? null,
      street: null,
    };
  } catch {
    return null;
  }
}

// Singleton — geolocation is requested at most once per page load.
let _locationPromise: Promise<LocationData | null> | null = null;

export function getLocation(): Promise<LocationData | null> {
  if (_locationPromise) return _locationPromise;

  _locationPromise = new Promise((resolve) => {
    // navigator.geolocation requires HTTPS in production; fall back to IP if unavailable.
    if (!("geolocation" in navigator)) {
      void getIPLocation().then(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const geo = await reverseGeocode(lat, lng);
        resolve({
          lat,
          lng,
          country: null,
          state: null,
          city: null,
          street: null,
          ...geo,
        });
      },
      // Permission denied or unavailable — fall back to IP-based location.
      () => void getIPLocation().then(resolve),
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  });

  return _locationPromise;
}

// ---------- Combined context (used by trackEvent) ----------

let _cachedContext: ClientContext | null = null;
let _contextPromise: Promise<ClientContext> | null = null;

export function getClientContext(): Promise<ClientContext> {
  if (_cachedContext) return Promise.resolve(_cachedContext);
  if (_contextPromise) return _contextPromise;

  const device_info = getDeviceInfo();

  _contextPromise = getLocation().then((location) => {
    _cachedContext = { location, device_info };
    return _cachedContext;
  });

  return _contextPromise;
}

// Call this early (e.g. on Watch page mount) to trigger the browser
// permission prompt before the first event fires.
export function prefetchClientContext(): void {
  void getClientContext();
}

// ---------- Session ID ----------
// One ID per browser tab, persisted in sessionStorage so it survives
// SPA navigations but resets when the tab is closed.

const SESSION_KEY = "vai_session_id";

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
