import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../services/api/auth";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none";

const Account = () => {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user?.email) {
      setError("Unable to determine your account. Please sign in again.");
      return;
    }
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setError("Passwords must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword(user.email, currentPassword, newPassword);
      const message = res.message || "Password changed successfully";
      setSuccess(message);
      toast.success(message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordType = showPasswords ? "text" : "password";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold font-montserrat">Account</h1>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">Name</dt>
              <dd>{user?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">Email</dt>
              <dd className="break-all">{user?.email}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Change password</h2>
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? "Hide" : "Show"}
            </button>
          </div>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm">
              Current password
              <input
                type={passwordType}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm">
              New password
              <input
                type={passwordType}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Confirm new password
              <input
                type={passwordType}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/forgot-password"
                className="text-sm text-white/60 underline decoration-white/30 hover:text-white"
              >
                Forgot your current password?
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Account;
