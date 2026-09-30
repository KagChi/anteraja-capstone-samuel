interface MaterialIconProps {
  name: string;
  className?: string;
  fill?: boolean;
}

export function MaterialIcon({ name, className, fill }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined align-middle select-none ${className ?? ""}`}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${fill ? 600 : 400}, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
