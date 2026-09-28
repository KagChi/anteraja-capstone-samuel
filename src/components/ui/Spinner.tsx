export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block size-[1em] animate-spinner rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
