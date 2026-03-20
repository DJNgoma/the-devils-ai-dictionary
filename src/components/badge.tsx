import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "accent" | "success";
  className?: string;
};

export function Badge({
  children,
  tone = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "chip",
        tone === "accent" && "chip-accent",
        tone === "success" && "chip-success",
        className,
      )}
    >
      {children}
    </span>
  );
}
