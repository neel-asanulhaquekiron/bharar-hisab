import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Redirect, Tabs } from "expo-router";
import { useTheme } from "react-native-paper";
import { useAuth } from "@/lib/auth";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const theme = useTheme();

  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        tabBarLabelStyle: { fontFamily: "NotoSansBengali_400Regular" },
        tabBarActiveTintColor: theme.colors.primary,
        headerStyle: { backgroundColor: theme.colors.surface },
        tabBarStyle: { backgroundColor: theme.colors.surface },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ড্যাশবোর্ড",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: "মালামাল",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: "ভাড়া",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="renters"
        options={{
          title: "ভাড়াটিয়া",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "সেটিংস",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
