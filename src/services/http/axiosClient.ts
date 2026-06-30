import axios from "axios";

  // In development we want to use a relative base so Vite's dev server proxy can
  // forward requests (e.g. `/api`) to the backend and avoid CORS issues.
// In production you can set this to your real API origin.
const isDev = process.env.NODE_ENV === "development" || import.meta.env?.MODE === 'development';
const BASE = isDev ? "/" : "https://aworan.ai-api.neoproducts.ca";

// Exported so sendBeacon calls (which can't use axios) use the same base.
export const API_BASE = BASE;

const axiosClient = axios.create({
  baseURL: BASE,
  // don't set a global Content-Type: let individual requests set it.
  headers: {
    Accept: "application/json",
  },
});

// Request interceptor: attach auth token if present
axiosClient.interceptors.request.use(
  (config) => {
    try {
      // If the request payload is FormData, remove Content-Type so the browser
      // can set the correct multipart boundary. For other requests, default
      // to application/json if no Content-Type is present.
      const headers = (config && config.headers) || {};
      const isForm = config && config.data && (config.data instanceof FormData);
      if (isForm) {
        // delete any Content-Type so browser sets multipart/form-data; boundary=...
        if (headers['Content-Type']) delete headers['Content-Type'];
        if (headers['content-type']) delete headers['content-type'];
      } else {
        headers['Content-Type'] = headers['Content-Type'] || headers['content-type'] || 'application/json';
      }
      config.headers = headers;
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unify error shape
axiosClient.interceptors.response.use(
  (res) => {
    console.log("Response:", res);
    return res;
  },
  (err) => {
    const error = err as any;
    const payload = {
      message:
        error?.response?.data?.message || error?.message || "An unexpected error occurred",
      status: error?.response?.status || 500,
      data: error?.response?.data ?? null,
    };
    return Promise.reject(payload);
  }
);

export default axiosClient;
