import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./PageHeader";

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  bullets,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="secondary">Próximamente</Badge>}
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-brand-gradient p-4 text-primary-foreground">
            <Icon className="h-8 w-8" />
          </div>
          <div className="max-w-lg">
            <h3 className="text-lg font-semibold text-primary">Módulo en construcción</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              La estructura de datos ya está definida en el esquema Supabase. Este
              módulo se conectará al backend en las próximas fases del roadmap.
            </p>
          </div>
          {bullets && bullets.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground text-left">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
