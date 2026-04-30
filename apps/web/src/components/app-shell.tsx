import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import {
  BrainIcon,
  ChartColumnIcon,
  FileTextIcon,
  GaugeIcon,
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
    </div>
  )
}
