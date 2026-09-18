import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-card flex flex-col items-center px-6 py-10 text-center animate-fade-up", className)}>
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-agent-soft text-primary [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground text-balance">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
