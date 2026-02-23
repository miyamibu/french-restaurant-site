import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PHOTO_CATEGORIES = [
  { key: "interior", label: "内装" },
  { key: "food", label: "料理" },
  { key: "drink", label: "飲み物" },
] as const;

export default async function PhotosPage() {
  const photosTopPadding = "124px";
  const photos = await prisma.photo
    .findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    })
    .catch((error) => {
      console.error("Failed to load photos", error);
      return [];
    });

  return (
    <div
      className="space-y-8 pt-[var(--photos-top-padding)]"
      style={{ "--photos-top-padding": photosTopPadding } as Record<string, string>}
    >
      <h1 className="text-3xl font-semibold">ギャラリー</h1>
      {PHOTO_CATEGORIES.map((category) => {
        const items = photos.filter(
          (photo) => (photo.category ?? "food") === category.key
        );

        return (
          <section key={category.key} className="space-y-3">
            <h2 className="text-xl font-semibold text-[#2f1b0f]">
              {category.label}
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-gray-600">写真準備中です。</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={p.url}
                        alt={p.caption}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-700">{p.caption}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
