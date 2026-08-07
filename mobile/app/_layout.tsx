import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-bengali";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { darkTheme, lightTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PaperProvider theme={colorScheme === "dark" ? darkTheme : lightTheme}>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </PaperProvider>
        </AuthProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
