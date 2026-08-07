import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text, useTheme } from "react-native-paper";
import { bn, bnDate, taka } from "@/lib/format";
import { useDashboard } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <Text variant="labelMedium" style={styles.statLabel}>
          {label}
        </Text>
        <Text variant="headlineSmall" style={color ? { color } : undefined}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const theme = useTheme();

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text variant="titleMedium" style={styles.greeting}>
        আসসালামু আলাইকুম, {user?.name}
      </Text>
      <View style={styles.statsRow}>
        <StatCard label="চলমান ভাড়া" value={`${bn(data.activeRentals)}টি`} />
        <StatCard label="মালামাল বাইরে" value={`${bn(data.unitsOut)}টি`} />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="মোট বাকি"
          value={taka(data.totalDue)}
          color={data.totalDue > 0 ? "#c62828" : "#2e7d32"}
        />
        <StatCard
          label="মেয়াদ পার"
          value={`${bn(data.overdueCount)}টি`}
          color={data.overdueCount > 0 ? "#c62828" : undefined}
        />
      </View>

      {data.overdue.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            মেয়াদ পার হয়ে গেছে
          </Text>
          {data.overdue.map((o) => (
            <Card
              key={o.id}
              style={[styles.overdueCard, { borderColor: theme.colors.error }]}
              mode="outlined"
              onPress={() => router.push(`/rentals/${o.id}`)}
            >
              <Card.Title
                title={`${o.renter.name} — ${o.item.name} ${bn(o.quantityOut)}টি`}
                subtitle={`ফেরতের কথা ছিল ${bnDate(o.expectedReturnDate)} · বাকি ${taka(o.due)}`}
                titleStyle={styles.cardTitle}
              />
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 12, paddingBottom: 32 },
  greeting: { marginBottom: 12, marginLeft: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: { flex: 1 },
  statContent: { alignItems: "center" },
  statLabel: { opacity: 0.7, marginBottom: 4 },
  sectionTitle: { marginTop: 12, marginBottom: 8, marginLeft: 4 },
  overdueCard: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
});
