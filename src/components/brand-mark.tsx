import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

export function BrandMark({
  className,
  title = "The Devil's AI Dictionary",
  style,
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden={title ? undefined : true}
      role="img"
      className={cn(className)}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M30 22L25 11L38 21"
        fill="currentColor"
        opacity="0.94"
      />
      <path
        d="M66 22L71 11L58 21"
        fill="currentColor"
        opacity="0.94"
      />
      <path
        d="M19 28C28 22 38 20 48 24V66C38.6 62.2 28.8 61.5 19 66.2V28Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M77 28C68 22 58 20 48 24V66C57.4 62.2 67.2 61.5 77 66.2V28Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M48 24V66"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M43 76C28 79 20 88 24 92C29 97 41 91 45 82"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 88L11 82L14 94L24 92"
        fill="currentColor"
      />
      <circle cx="48" cy="24" r="4.5" fill="currentColor" />
    </svg>
  );
}
