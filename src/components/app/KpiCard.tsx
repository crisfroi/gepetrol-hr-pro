import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: { direction: "up" | "down" | "flat"; value: string };
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="rounded-md bg-secondary p-1.5 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {(hint || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend ? (
              <span
                className={cn(
                  "font-medium",
                  trend.direction === "up" && "text-success",
                  trend.direction === "down" && "text-destructive",
                  trend.direction === "flat" && "text-muted-foreground",
                )}
              >
                {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■"}{" "}
                {trend.value}
              </span>
            ) : null}
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
