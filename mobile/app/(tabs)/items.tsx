import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, FAB, Text } from "react-native-paper";
import { EmptyState } from "@/components/empty-state";
import { bn, rateUnitLabel, taka } from "@/lib/format";
import { useItems } from "@/lib/queries";
import { useAppTheme } from "@/lib/theme";
import type { Item } from "@/lib/types";

function ItemCard({ item }: { item: Item }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card} onPress={() => router.push(`/items/${item.id}`)}>
      <Card.Title
        title={item.name}
        subtitle={`${taka(item.rate)} ${rateUnitLabel(item.rateUnit)}`}
        titleStyle={styles.cardTitle}
      />
      <Card.Content>
        <View style={styles.chips}>
          <Chip compact icon="package-variant">{`মোট ${bn(item.totalQuantity)}টি`}</Chip>
          <Chip compact icon="arrow-up-bold">{`বাইরে ${bn(item.outQuantity)}টি`}</Chip>
          <Chip compact icon="check">{`আছে ${bn(item.availableQuantity)}টি`}</Chip>
        </View>
        <Text variant="bodyMedium" style={styles.finance}>
          খরচ {taka(item.investment)} · আয় {taka(item.income)} ·{" "}
          <Text
            variant="bodyMedium"
            style={{ color: item.profit >= 0 ? theme.colors.income : theme.colors.loss }}
          >
            {item.profit >= 0 ? "লাভ" : "ক্ষতি"} {taka(Math.abs(item.profit))}
          </Text>
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function ItemsScreen() {
  const { data, isLoading, refetch, isRefetching } = useItems();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        contentContainerStyle={data?.length ? styles.list : styles.listEmpty}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon="package-variant-closed"
            message={"এখনো কোনো মালামাল নেই।\n+ বাটনে চাপ দিয়ে যোগ করুন।"}
          />
        }
      />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push("/items/form")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, paddingBottom: 96 },
  listEmpty: { flexGrow: 1 },
  card: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  finance: { marginTop: 8, opacity: 0.85 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
