"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

function faviconUrl(theme: "light" | "dark") {
  const background = theme === "dark" ? "#09090b" : "#fafafa"
  const foreground = theme === "dark" ? "#fafafa" : "#09090b"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="17" fill="${background}"/><g fill="none" stroke="${foreground}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22h36m0 0-9-9m9 9-9 9"/><path d="M50 42H14m0 0 9-9m-9 9 9 9"/></g></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function ThemeFavicon() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return

    let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')

    if (!icon) {
      icon = document.createElement("link")
      icon.rel = "icon"
      icon.type = "image/svg+xml"
      document.head.appendChild(icon)
    }

    icon.href = faviconUrl(resolvedTheme)
  }, [resolvedTheme])

  return null
}
