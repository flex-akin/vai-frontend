import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Search,
  Bell,
  LogOut,
  UserRound,
} from "lucide-react";

type NavLink = { label: string; href: string };
type User = { name?: string; avatarUrl?: string };

export default function Navbar(props: {
  links?: NavLink[];
  logo?: React.ReactNode;
  user?: User | null;
  onSearch?: (q: string) => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
  className?: string;
}) {
  const {
    links = [
      { label: "Home", href: "/" },
      { label: "Series", href: "/series" },
      { label: "Movies", href: "/movies" },
      { label: "My List", href: "/list" },
    ],
    logo = <span className="text-xl font-extrabold">VideoAI</span>,
    user,
    onSearch,
    onSignIn,
    onSignOut,
    className = "",
  } = props;

  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user?.name]);

  const submitSearch = () => {
    if (!query.trim()) return;
    onSearch?.(query.trim());
    setQuery("");
  };

  return (
    <header
      className={[
        "sticky top-0 z-50",
        scrolled
          ? "bg-black/70 backdrop-blur border-b border-white/10"
          : "bg-gradient-to-b from-black/70 to-transparent",
        className,
      ].join(" ")}
      role="banner"
    >
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        role="navigation"
        aria-label="Global"
      >
        <div className="h-16 flex items-center justify-between">
          {/* left: logo + links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="shrink-0 text-white hover:opacity-90">
              {logo}
            </Link>

            <div className="hidden md:flex items-center gap-5">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    to={l.href}
                    className={[
                      "text-sm transition",
                      active
                        ? "text-white font-semibold"
                        : "text-white/80 hover:text-white",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* right: search + actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5">
              <Search className="w-4 h-4 text-white/70" />
              <input
                aria-label="Search"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                className="bg-transparent outline-none text-sm placeholder:text-white/60 text-white w-40"
              />
            </div>

            <button
              className="hidden md:inline-flex p-2 rounded-lg hover:bg-white/10"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-white" />
            </button>

            {/* profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((s) => !s)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-2 py-1"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Account menu"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "Avatar"}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-white/20 grid place-items-center text-xs font-bold">
                    {initials}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-white/80" />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#151515] shadow-xl overflow-hidden"
                >
                  <div className="px-3 py-2 text-xs text-white/60">
                    {user?.name
                      ? `Signed in as ${user.name}`
                      : "You are not signed in"}
                  </div>
                  <div className="h-px bg-white/10" />
                  {user ? (
                    <>
                      <Link
                        to="/account"
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        <UserRound className="w-4 h-4" />
                        Account
                      </Link>
                      <button
                        role="menuitem"
                        onClick={onSignOut}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <button
                      role="menuitem"
                      onClick={onSignIn}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
                    >
                      <UserRound className="w-4 h-4" />
                      Sign in
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* mobile hamburger */}
            <button
              className="md:hidden inline-flex p-2 rounded-lg hover:bg-white/10"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* mobile panel */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-x-0 top-0 rounded-b-2xl bg-[#101010] border-b border-white/10 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Menu</div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <Search className="w-4 h-4 text-white/70" />
              <input
                aria-label="Search"
                placeholder="Search titles"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitSearch();
                    setMobileOpen(false);
                  }
                }}
                className="bg-transparent outline-none text-sm placeholder:text-white/60 text-white w-full"
              />
              <button
                onClick={() => {
                  submitSearch();
                  setMobileOpen(false);
                }}
                className="text-sm px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              >
                Go
              </button>
            </div>

            <div className="mt-4 grid gap-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    to={l.href}
                    className={[
                      "rounded-lg px-3 py-2 text-sm",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              {user ? (
                <button
                  onClick={() => {
                    onSignOut?.();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => {
                    onSignIn?.();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
