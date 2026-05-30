import { cn } from "@/lib/utils";

// The Task Mate mark: a rounded check in a coral squircle.
export function LogoMark({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Task Mate"
    >
      <rect x="6" y="6" width="88" height="88" rx="27" fill="var(--primary)" />
      <path
        d="M31 53.5 L44.5 67 L71.5 35.5"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="11.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mark + wordmark lockup. `Mate` is coral.
export function Logo({
  className,
  markClassName,
  textClassName,
  showText = true,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-7", markClassName)} />
      {showText && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight text-foreground",
            textClassName,
          )}
        >
          Task<span className="text-primary"> Mate</span>
        </span>
      )}
    </span>
  );
}
