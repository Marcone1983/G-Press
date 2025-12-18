/**
 * G-Press Color Theme
 * Professional blue palette for press release distribution app
 */

import { Platform } from "react-native";

// Primary colors
const primaryBlue = "#1E88E5";
const primaryBlueDark = "#1565C0";

export const Colors = {
  light: {
    text: "#212121",
    textSecondary: "#757575",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    tint: primaryBlue,
    icon: "#757575",
    tabIconDefault: "#757575",
    tabIconSelected: primaryBlue,
    success: "#43A047",
    danger: "#E53935",
    border: "#E0E0E0",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    background: "#151718",
    surface: "#1E1E1E",
    tint: primaryBlue,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryBlue,
    success: "#66BB6A",
    danger: "#EF5350",
    border: "#333333",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
