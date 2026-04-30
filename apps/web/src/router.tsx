import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell.tsx"
import { AdminPage } from "@/routes/admin-page.tsx"
import { ContextPage } from "@/routes/context-page.tsx"
import { HomePage } from "@/routes/home-page.tsx"
import { StatisticsPage } from "@/routes/statistics-page.tsx"

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const contextRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/context",
  component: ContextPage,
})

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  component: StatisticsPage,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  contextRoute,
  statisticsRoute,
  adminRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
