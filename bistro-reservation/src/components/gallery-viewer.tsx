"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type GalleryItem = {
  id: string;
  url: string;
  caption: string;
};

type GallerySection = {
  key: string;
  label: string;
  items: GalleryItem[];
};

export function GalleryViewer({ sections }: { sections: GallerySection[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (!selectedPhoto) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [selectedPhoto]);

  return (
    <>
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <h2 className="text-xl font-semibold text-[#2f1b0f]">{section.label}</h2>
          {section.items.length === 0 ? (
            <p className="text-sm text-gray-600">写真準備中です。</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {section.items.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="w-full space-y-2 text-left"
                  data-gallery-photo-button
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                    <Image
                      src={photo.url}
                      alt={photo.caption}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </div>
                  <p className="text-sm text-gray-700">{photo.caption}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-[240] bg-black/72 px-4 py-6 md:px-8"
          onClick={() => setSelectedPhoto(null)}
          data-gallery-modal
        >
          <div className="flex h-full items-center justify-center">
            <div
              className="w-full max-w-6xl space-y-3"
              onClick={(event) => event.stopPropagation()}
              data-gallery-modal-content
            >
              <div
                className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black shadow-2xl"
                style={{ maxWidth: "min(92vw, calc(82vh * 4 / 3))", aspectRatio: "4 / 3" }}
              >
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption}
                  fill
                  className="object-contain"
                  sizes="92vw"
                  priority
                />
              </div>
              <p className="text-center text-sm text-white/90">{selectedPhoto.caption}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
