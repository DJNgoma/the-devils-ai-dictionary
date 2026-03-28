import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.djngoma.devilsaidictionary",
  appName: "The Devil's AI Dictionary",
  webDir: "out",
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false,
      animation: "NONE",
    },
  },
  android: {
    backgroundColor: "#f4efe6",
  },
  ios: {
    backgroundColor: "#f4efe6",
    contentInset: "automatic",
  },
};

export default config;
