import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sendit",
    short_name: "Sendit",
    description:
      "Split trip expenses, balances, and repayments with friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/sendit-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/sendit-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
