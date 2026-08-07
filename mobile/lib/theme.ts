import { MD3DarkTheme, MD3LightTheme, configureFonts } from "react-native-paper";

const fontConfig = { fontFamily: "NotoSansBengali_400Regular" };

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: "#00695C",
    primaryContainer: "#B2DFDB",
    secondary: "#00897B",
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
  },
};
