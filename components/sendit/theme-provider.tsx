"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

import { ThemeFavicon } from "@/components/sendit/theme-favicon"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeFavicon />
      {children}
    </NextThemesProvider>
  )
}
