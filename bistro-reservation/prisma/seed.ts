import { PrismaClient, SeatType, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.menuItem.deleteMany({}),
    prisma.photo.deleteMany({}),
    prisma.businessDay.deleteMany({}),
  ]);

  await prisma.menuItem.createMany({
    data: [
      {
        title: "季節の前菜盛り合わせ",
        description: "旬の食材を使った小皿の盛り合わせ",
        price: 1250,
        sortOrder: 1,
      },
      {
        title: "牛ホホ肉の赤ワイン煮込み",
        description: "看板メイン。低温でじっくり煮込みました",
        price: 1750,
        sortOrder: 2,
      },
      {
        title: "シェフおまかせコース",
        description: "その日の最良の食材を使ったフルコース",
        price: 2250,
        sortOrder: 3,
      },
    ],
  });

  await prisma.photo.createMany({
    data: [
      {
        url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
        caption: "ダイニングの夜景",
        sortOrder: 1,
      },
      {
        url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
        caption: "季節のメインディッシュ",
        sortOrder: 2,
      },
      {
        url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
        caption: "個室の様子",
        sortOrder: 3,
      },
    ],
  });

  await prisma.businessDay.createMany({
    data: [
      { date: "2026-01-01", isClosed: true, note: "年始休業" },
    ],
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });