import { MD3DarkTheme, MD3LightTheme, configureFonts, useTheme } from "react-native-paper";

const fontConfig = { fontFamily: "NotoSansBengali_400Regular" };

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: "#00695C",
    primaryContainer: "#B2DFDB",
    secondary: "#00897B",
    income: "#2e7d32",
    loss: "#c62828",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#4DB6AC",
    primaryContainer: "#00695C",
    secondary: "#80CBC4",
    income: "#81C784",
    loss: "#EF9A9A",
  },
};

export type AppTheme = typeof lightTheme;

export const useAppTheme = () => useTheme<AppTheme>();
