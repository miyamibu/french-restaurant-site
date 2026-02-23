import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function PhotosPage() {
  const photos = await prisma.photo.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">ギャラリー</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="relative h-48">
              <Image src={p.url} alt={p.caption} fill className="object-cover" />
            </div>
            <p className="p-3 text-sm text-gray-700">{p.caption}</p>
          </div>
        ))}
        {photos.length === 0 && <p className="text-gray-600">写真準備中です。</p>}
      </div>
    </div>
  );
}