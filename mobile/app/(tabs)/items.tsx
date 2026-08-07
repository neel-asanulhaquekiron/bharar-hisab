import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, FAB, Text } from "react-native-paper";
import { EmptyState } from "@/components/empty-state";
import { bn, rateUnitLabel, taka } from "@/lib/format";
import { useItems } from "@/lib/queries";
import type { Item } from "@/lib/types";

function ItemCard({ item }: { item: Item }) {
  return (
    <Card
      style={styles.card}
      onPress={() => router.push({ pathname: "/items/form", params: { id: item.id } })}
    >
      <Card.Title
        title={item.name}
        subtitle={`${taka(item.rate)} ${rateUnitLabel(item.rateUnit)}`}
        titleStyle={styles.cardTitle}
      />
      <Card.Content style={styles.chips}>
        <Chip compact icon="package-variant">{`মোট ${bn(item.totalQuantity)}টি`}</Chip>
        <Chip compact icon="arrow-up-bold">{`বাইরে ${bn(item.outQuantity)}টি`}</Chip>
        <Chip compact icon="check">{`আছে ${bn(item.availableQuantity)}টি`}</Chip>
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
  fab: { position: "absolute", right: 16, bottom: 16 },
});
