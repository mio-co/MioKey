import type { Config } from "vike/types";
import vikeVue from "vike-vue/config";

// Default config (can be overridden by pages)
// https://vike.dev/config

const config: Config = {
  title: "MioKey",
  description: "",

  passToClient: ["user", "site", "rootInitialized", "registrationEnabled"],
  // https://vike.dev/prefetch — on link hover, fetch the page's JS/CSS and also its pageContext (server data),
  // cached for 5s, so most clicks render without waiting for the network. Links with side effects are buttons.
  prefetch: { staticAssets: "hover", pageContext: 5000 },
  extends: [vikeVue],
};

export default config;
