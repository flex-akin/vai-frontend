const Loader = ({ size = 6 }: { size?: number }) => {
  // Tailwind's animate-spin class provides a simple rotating animation.
  // size is in rem units for Tailwind h-/w- classes (e.g., 6 => h-6 w-6).
  const cls = `animate-spin h-${size} w-${size} text-white`;
  return (
    <svg
      className={cls}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  );
};

export default Loader;
