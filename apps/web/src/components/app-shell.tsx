import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import {
  BrainIcon,
  ChartColumnIcon,
  FileTextIcon,
  GaugeIcon,
  StarIcon,
} from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu"
import { cn } from "@workspace/ui/lib/utils"

import { ThemeToggle } from "@/components/theme-toggle.tsx"

const navItems = [
  { to: "/", label: "写字板", icon: BrainIcon },
  { to: "/context", label: "上下文", icon: FileTextIcon },
  { to: "/statistics", label: "统计", icon: ChartColumnIcon },
  { to: "/admin", label: "管理", icon: GaugeIcon },
] as const

export function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">LIME IME</h1>
            <p className="text-sm text-muted-foreground">
              单进程 LLM 拼音写字板与管理面板
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <NavigationMenu viewport={false}>
              <NavigationMenuList className="flex-wrap justify-start gap-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavigationMenuItem key={to}>
                    <Link
                      to={to}
                      activeOptions={{ exact: to === "/" }}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "gap-2",
                        (to === "/"
                          ? pathname === "/"
                          : pathname.startsWith(to)) && "bg-muted"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row">
          <p>
            由{" "}
            <a
              href="https://github.com/Deali-Axy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              曦远 (DealiAxy)
            </a>{" "}
            用 ❤️ 构建
          </p>
          <a
            href="https://github.com/Deali-Axy/llm-ime"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 fill-current"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Deali-Axy/llm-ime</span>
            <StarIcon className="size-3.5" />
            <span>Star</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
