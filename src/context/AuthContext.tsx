import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = {
  id?: number;
  name: string;
  email: string;
  is_admin: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_KEY = "aworan.auth";

type PersistedAuth = {
  user: AuthUser;
  token: string;
};

const API_BASE_URL = "https://aworan.ai-api.neoproducts.ca/api/v1/auth";

const extractToken = (payload: Record<string, any> | null | undefined) => {
  if (!payload) return null;
  return (
    payload.access_token ||
    payload.token ||
    payload?.data?.access_token ||
    payload?.data?.token
  );
};

const extractUser = (
  payload: Record<string, any> | null | undefined,
  fallback: AuthUser
): AuthUser => {
  if (!payload) return fallback;
  const user = payload.user || payload?.data?.user || payload.profile || payload;
  if (!user) return fallback;

  const name =
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    fallback.name;
  const email = user.email || fallback.email;
  const id = typeof user.id === "number" ? user.id : fallback.id;
  const is_admin = typeof user.is_admin === "boolean" ? user.is_admin : false;

  return { id, name, email, is_admin };
};

const parseErrorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    return (
      data?.message ||
      data?.detail ||
      data?.error ||
      data?.errors?.[0]?.message ||
      "Authentication failed."
    );
  } catch {
    return "Authentication failed.";
  }
};


const readPersistedAuth = (): PersistedAuth | null => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed?.user?.email || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writePersistedAuth = (payload: PersistedAuth) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
};

const clearPersistedAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const persisted = readPersistedAuth();
    if (persisted?.user) {
      setUser(persisted.user);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = (await response.json()) as Record<string, any>;
    const fallbackName = email.split("@")[0] || "Aworan.ai User";
    const user = extractUser(data, { name: fallbackName, email, is_admin: false });
    const token = extractToken(data) || "session";

    const payload: PersistedAuth = { user, token };
    writePersistedAuth(payload);
    setUser(user);
  }, []);

  const signUp = useCallback(async (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = (await response.json()) as Record<string, any>;
    const user = extractUser(data, {
      name: `${firstName} ${lastName}`.trim(),
      email,
      is_admin: false,
    });
    const token = extractToken(data) || "session";

    const payload: PersistedAuth = { user, token };
    writePersistedAuth(payload);
    setUser(user);
  }, []);

  const signOut = useCallback(() => {
    clearPersistedAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      signOut,
    }),
    [user, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
