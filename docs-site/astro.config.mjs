import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  redirects: {
    "/": "/introduction",
  },
  integrations: [
    starlight({
      title: "OpenArcade",
      logo: {
        src: "./src/assets/logo.png",
        alt: "OpenArcade Logo",
      },
      social: {
        github: "https://github.com/ssh-vom/openarcade",
      },
      customCss: [
        "@fontsource/newsreader/400.css",
        "@fontsource/newsreader/500.css",
        "@fontsource/newsreader/600.css",
        "@fontsource/newsreader/700.css",
        "@fontsource/jetbrains-mono/400.css",
        "@fontsource/jetbrains-mono/500.css",
        "@fontsource/jetbrains-mono/600.css",
        "@fontsource/jetbrains-mono/700.css",
        "./src/styles/custom.css",
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "introduction" },
            { label: "Quick Start", slug: "quick-start" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "System Overview", slug: "architecture/overview" },
            { label: "Data Flow", slug: "architecture/data-flow" },
          ],
        },
        {
          label: "Firmware",
          items: [
            { label: "Overview", slug: "firmware/overview" },
            { label: "BLE Protocol", slug: "firmware/ble-protocol" },
          ],
        },
        {
          label: "Server",
          items: [
            { label: "Overview", slug: "server/overview" },
            { label: "Configuration", slug: "server/configuration" },
          ],
        },
        {
          label: "Config App",
          items: [{ label: "Overview", slug: "config-app/overview" }],
        },
        {
          label: "Reference",
          items: [
            { label: "BLE GATT Services", slug: "reference/ble-gatt" },
            { label: "Serial Protocol", slug: "reference/serial-protocol" },
          ],
        },
      ],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.png",
            type: "image/png",
          },
        },
      ],
    }),
  ],
});
