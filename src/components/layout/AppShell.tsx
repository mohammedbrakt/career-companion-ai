import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase, Home, MessageSquareText, KanbanSquare, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { BrandLockup } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/shared/LanguageToggle";

const items = [
  { to: "/home", key: "home", icon: Home },
  { to: "/jobs", key: "jobs", icon: Briefcase },
  { to: "/agent", key: "agent", icon: MessageSquareText, central: true },
  { to: "/applications", key: "applications", icon: KanbanSquare },
  { to: "/profile", key: "profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAgentThread = pathname.startsWith("/agent/");

  return (
    <div className="min-h-dvh bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-6 py-6">
          <BrandLockup />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-5" />
                {t.nav[item.key]}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-6">
          <LanguageToggle className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80" />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <main className={cn("mx-auto w-full max-w-5xl flex-1", isAgentThread ? "" : "px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8")}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        {!isAgentThread && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-xl safe-bottom md:hidden">
            <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
              {items.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                const central = "central" in item && item.central;
                return (
                  <li key={item.to} className="flex justify-center">
                    <Link
                      to={item.to}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[10.5px] font-semibold transition-colors",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-2xl transition-all",
                          central
                            ? "-mt-6 size-14 bg-navy text-navy-foreground shadow-glow ring-4 ring-background"
                            : "size-9",
                          active && !central && "bg-agent-soft",
                        )}
                      >
                        <Icon className={cn(central ? "size-6" : "size-5")} />
                      </span>
                      {t.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
