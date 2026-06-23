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

// Singleton — geolocation is requested at most once per page load.
let _locationPromise: Promise<LocationData | null> | null = null;

export function getLocation(): Promise<LocationData | null> {
  if (_locationPromise) return _locationPromise;

  _locationPromise = new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
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
      () => resolve(null),
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
