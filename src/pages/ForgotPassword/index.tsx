import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  requestPasswordResetCode,
  resetPassword,
  verifyPasswordResetCode,
} from "../../services/api/auth";

type Step = "email" | "code" | "password" | "done";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none";
const primaryButtonClass =
  "mt-2 inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCode = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    run(async () => {
      const res = await requestPasswordResetCode(trimmed);
      setEmail(trimmed);
      setNotice(res.message);
      setStep("code");
    });
  };

  const handleResend = () =>
    run(async () => {
      const res = await requestPasswordResetCode(email);
      setCode("");
      setNotice(res.message);
    });

  const handleVerifyCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    run(async () => {
      await verifyPasswordResetCode(email, code);
      setNotice(null);
      setStep("password");
    });
  };

  const handleResetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    run(async () => {
      try {
        await resetPassword(email, code, newPassword);
        setStep("done");
      } catch (err) {
        // Code expired between verification and reset — send them back.
        if (err instanceof Error && /invalid or expired code/i.test(err.message)) {
          setCode("");
          setStep("code");
        }
        throw err;
      }
    });
  };

  const titles: Record<Step, { title: string; subtitle: string }> = {
    email: {
      title: "Forgot your password?",
      subtitle: "Enter your email and we'll send you a 6-digit verification code.",
    },
    code: {
      title: "Check your email",
      subtitle: `Enter the code we sent to ${email}.`,
    },
    password: {
      title: "Set a new password",
      subtitle: "Choose a password with at least 8 characters.",
    },
    done: {
      title: "Password updated",
      subtitle: "You can now sign in with your new password.",
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-[#4f46e5]/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-80 w-80 rounded-full bg-[#ec4899]/25 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_40%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <span className="text-xs uppercase tracking-[0.5em] text-white/60">Aworan.ai</span>
          <div className="mb-6 mt-4">
            <h2 className="text-2xl font-semibold font-montserrat">{titles[step].title}</h2>
            <p className="mt-1 text-sm text-white/60">{titles[step].subtitle}</p>
          </div>

          {notice && step === "code" && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
              {notice}
            </div>
          )}

          {step === "email" && (
            <form className="grid gap-4" onSubmit={handleRequestCode}>
              <label className="grid gap-2 text-sm">
                Email address
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className={inputClass}
                />
              </label>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading} className={primaryButtonClass}>
                {isLoading ? "Sending code..." : "Send code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form className="grid gap-4" onSubmit={handleVerifyCode}>
              <label className="grid gap-2 text-sm">
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className={`${inputClass} tracking-[0.5em] text-center text-lg`}
                />
              </label>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading} className={primaryButtonClass}>
                {isLoading ? "Verifying..." : "Verify code"}
              </button>
              <div className="flex items-center justify-between text-sm text-white/60">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setCode("");
                    setStep("email");
                  }}
                  className="hover:text-white"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-white underline decoration-white/40 disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form className="grid gap-4" onSubmit={handleResetPassword}>
              <label className="grid gap-2 text-sm">
                New password
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/70 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm">
                Confirm new password
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </label>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading} className={primaryButtonClass}>
                {isLoading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="grid gap-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-white/10 grid place-items-center text-lg">
                ✓
              </div>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className={primaryButtonClass}
              >
                Back to sign in
              </button>
            </div>
          )}

          {step !== "done" && (
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const ErrorBox = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
    {message}
  </div>
);

export default ForgotPassword;
