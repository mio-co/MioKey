import type { Config } from "vike/types";
import vikeVue from "vike-vue/config";

// Default config (can be overridden by pages)
// https://vike.dev/config

const config: Config = {
  title: "MioKey",
  description: "",

  passToClient: ["user", "site", "rootInitialized", "registrationEnabled"],
  extends: [vikeVue],
};

export default config;
