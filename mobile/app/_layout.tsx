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
            <Stack
              screenOptions={{
                headerShown: true,
                headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="items/[id]" options={{ title: "মালামাল" }} />
              <Stack.Screen name="items/form" options={{ title: "মালামাল" }} />
              <Stack.Screen name="renters/[id]" options={{ title: "ভাড়াটিয়া" }} />
              <Stack.Screen name="renters/form" options={{ title: "ভাড়াটিয়া" }} />
              <Stack.Screen name="rentals/[id]" options={{ title: "ভাড়ার বিবরণ" }} />
              <Stack.Screen name="rentals/new" options={{ title: "নতুন ভাড়া" }} />
            </Stack>
            <StatusBar style="auto" />
          </PaperProvider>
        </AuthProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
