import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { router } from "@/router.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RouterProvider router={router} />
      {import.meta.env.DEV ? <TanStackRouterDevtools router={router} /> : null}
    </ThemeProvider>
  </StrictMode>
)
