const AUTH_BASE_URL = "https://aworan.ai-api.neoproducts.ca/api/v1/auth";

type MessageResponse = { message: string };

// FastAPI returns `detail` as a string for 4xx errors, but as an array of
// validation errors for 422s. Normalize both into a readable message.
const parseError = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
      if (field === "new_password" || field === "current_password") {
        return "Password must be at least 8 characters.";
      }
      if (field === "code") return "Enter the 6-digit code from your email.";
      return first?.msg || fallback;
    }
    return data?.message || data?.error || fallback;
  } catch {
    return fallback;
  }
};

const post = async <T = MessageResponse>(
  path: string,
  body: Record<string, unknown>,
  fallbackError: string
): Promise<T> => {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, fallbackError));
  }

  return (await response.json()) as T;
};

/** Always resolves with the same message, whether or not the account exists. */
export const requestPasswordResetCode = (email: string) =>
  post("/password/request-code", { email }, "Unable to send verification code.");

export const verifyPasswordResetCode = (email: string, code: string) =>
  post("/password/verify-code", { email, code }, "Invalid or expired code");

export const resetPassword = (email: string, code: string, newPassword: string) =>
  post(
    "/password/reset",
    { email, code, new_password: newPassword },
    "Unable to reset password."
  );

export const changePassword = (
  email: string,
  currentPassword: string,
  newPassword: string
) =>
  post(
    "/password/change",
    { email, current_password: currentPassword, new_password: newPassword },
    "Unable to change password."
  );
