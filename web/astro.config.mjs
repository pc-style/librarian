import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Static docs site for https://librarian.pcstyle.dev, built on Astro's Starlight
// docs template. Built output (web/dist) is merged into the eve Vercel Build
// Output at .vercel/output/static by scripts/merge-web.mjs, so the static
// frontend is served at "/" and its slugs while the eve agent API keeps its
// "/eve/v1/*" routes on the same domain.
export default defineConfig({
  site: "https://librarian.pcstyle.dev",
  trailingSlash: "ignore",
  compressHTML: true,
  integrations: [
    starlight({
      title: "Librarian docs",
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      description:
        "An eve research agent for public GitHub repositories and the public web.",
      // Custom component overrides.
      components: {
        Hero: "./src/components/Hero.astro",
      },
      // Web fonts + URL-switchable font theme bootstrap. Pass ?font=editorial|
      // geist|plex|literary to preview a typography pairing; the choice persists
      // in localStorage. The inline script sets data-font before paint.
      head: [
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Geist:wght@400;500;600&family=Geist%20Mono:wght@400;500&family=IBM%20Plex%20Serif:wght@400;600&family=IBM%20Plex%20Sans:wght@400;500;600&family=IBM%20Plex%20Mono:wght@400;500&family=Newsreader:ital,wght@0,400;0,600;1,400;1,600&family=JetBrains%20Mono:wght@400;500&display=swap",
          },
        },
        {
          tag: "script",
          content:
            '(function(){var k="librarian-font",v=["editorial","geist","plex","literary"],p=new URLSearchParams(location.search).get("font"),f=v.indexOf(p)>-1?p:null;if(f)try{localStorage.setItem(k,f)}catch(e){}else try{f=localStorage.getItem(k)}catch(e){}if(v.indexOf(f)<0)f="editorial";document.documentElement.dataset.font=f;})();',
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/pc-style/librarian",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Install the skill", link: "/install/" },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "reference", collapsed: false } }],
        },
      ],
      // Order matters: tokens (theme) -> font vars/families -> component
      // polish -> page-specific (hero/404) styles.
      customCss: [
        "./src/styles/theme.css",
        "./src/styles/fonts.css",
        "./src/styles/components.css",
        "./src/styles/hero-404.css",
      ],
    }),
  ],
});
