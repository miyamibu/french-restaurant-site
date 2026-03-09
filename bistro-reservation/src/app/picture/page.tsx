import Image from "next/image";
import { Tangerine } from "next/font/google";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PHOTO_CATEGORIES = [
  { key: "interior", label: "内装" },
  { key: "food", label: "料理" },
  { key: "drink", label: "飲み物" },
] as const;

const headingFont = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const menuHeadingSize = { base: 32, md: 60 };

export default async function PhotosPage() {
  const photosTopPaddingMobile = "86px";
  const photosTopPaddingDesktop = "124px";
  const canQueryDatabase = /^(postgres|postgresql):\/\//.test(process.env.DATABASE_URL ?? "");
  const photos = canQueryDatabase
    ? await prisma.photo
        .findMany({
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        })
        .catch((error) => {
          console.error("Failed to load photos", error);
          return [];
        })
    : [];

  return (
    <div
      className="space-y-8 pt-[var(--photos-top-padding-mobile)] md:pt-[var(--photos-top-padding-desktop)]"
      style={{
        "--photos-top-padding-mobile": photosTopPaddingMobile,
        "--photos-top-padding-desktop": photosTopPaddingDesktop,
      } as Record<string, string>}
    >
      <header className="text-center">
        <h1
          className={`menu-heading-title font-semibold text-[#2f1b0f] ${headingFont.className}`}
          style={
            {
              "--menu-heading-size": `${menuHeadingSize.base}px`,
              "--menu-heading-size-md": `${menuHeadingSize.md}px`,
            } as Record<string, string>
          }
        >
          GALLERY
        </h1>
      </header>
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
