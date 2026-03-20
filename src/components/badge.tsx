import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "success";
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
        tone === "warning" && "chip-warning",
        tone === "danger" && "chip-danger",
        tone === "success" && "chip-success",
        className,
      )}
    >
      {children}
    </span>
  );
}
