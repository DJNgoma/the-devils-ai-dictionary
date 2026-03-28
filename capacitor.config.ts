import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.djngoma.devilsaidictionary",
  appName: "The Devil's AI Dictionary",
  webDir: "out",
  android: {
    backgroundColor: "#f4efe6",
  },
  ios: {
    backgroundColor: "#f4efe6",
    contentInset: "automatic",
  },
};

export default config;
