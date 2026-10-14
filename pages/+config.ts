import type { Config } from "vike/types";
import vikeVue from "vike-vue/config";

// Default config (can be overridden by pages)
// https://vike.dev/config

const config: Config = {
  title: "MioKey",
  description: "",

  passToClient: ["user", "site", "rootInitialized", "registrationEnabled"],
  // https://vike.dev/prefetch — on link hover, fetch only the page's JS/CSS. pageContext (server data)
  // prefetch is off: in vike 0.4.260 it trips an internal assertion ("You stumbled upon a Vike bug").
  prefetch: { staticAssets: "hover" },
  extends: [vikeVue],
};

export default config;
