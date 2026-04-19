import { cn } from "@/lib/utils";
import { getAqiCategory, type AqiCategory } from "@/lib/api";

interface AqiBadgeProps {
  value?: number;
  category?: AqiCategory;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const categoryStyles: Record<AqiCategory, string> = {
  Good: "bg-aqi-good/15 text-aqi-good ring-aqi-good/30",
  Moderate: "bg-aqi-moderate/20 text-aqi-moderate ring-aqi-moderate/40",
  "Unhealthy for Sensitive Groups":
    "bg-aqi-sensitive/15 text-aqi-sensitive ring-aqi-sensitive/30",
  Unhealthy: "bg-aqi-unhealthy/15 text-aqi-unhealthy ring-aqi-unhealthy/30",
  "Very Unhealthy":
    "bg-aqi-very-unhealthy/15 text-aqi-very-unhealthy ring-aqi-very-unhealthy/30",
  Hazardous: "bg-aqi-hazardous/20 text-aqi-hazardous ring-aqi-hazardous/40",
};

export function AqiBadge({ value, category, className, size = "md" }: AqiBadgeProps) {
  const cat = category ?? (value !== undefined ? getAqiCategory(value) : "Good");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        categoryStyles[cat],
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cat}
    </span>
  );
}
