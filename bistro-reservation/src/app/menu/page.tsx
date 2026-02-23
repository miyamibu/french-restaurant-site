import Image from "next/image";

const TOP_GAP_PX = 110; // ←ここだけ変えれば上の空白を微調整できる
const ANCHOR_GAP_PX = TOP_GAP_PX + 20; // ←#joie などに飛んだ時の見え方調整

const courses = [
  {
    id: "petite",
    title: "Petite La course",
    photos: ["/photos/pu.jpg", "/photos/jo.jpg", "/photos/qu.jpg", "/photos/am.jpg"],
  },
  {
    id: "joie",
    title: "Joie course",
    photos: ["/photos/jo.jpg", "/photos/pu.jpg", "/photos/qu.jpg", "/photos/am.jpg", "/photos/po.png"],
  },
  {
    id: "cent",
    title: "Cent Quatre course",
    photos: ["/photos/qu.jpg", "/photos/jo.jpg", "/photos/pu.jpg", "/photos/am.jpg", "/photos/extract_1~2.png", "/photos/extract_2~2.png"],
  },
];

export default function MenuPage() {
  return (
    <div
      className="space-y-16"
      style={{ paddingTop: `${TOP_GAP_PX}px` }} // ✅ 上の空白（固定ヘッダー対策）
    >
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-[#2f1b0f]">メニュー</h1>
      </header>

      {courses.map((course) => (
        <section
          key={course.id}
          id={course.id}
          className="space-y-6"
          style={{ scrollMarginTop: `${ANCHOR_GAP_PX}px` }} // ✅ #joie で飛んだ時に見出しが隠れない
        >
          <div className="flex items-start justify-start">
            <h2 className="text-2xl md:text-3xl font-semibold text-[#2f1b0f]">
              {course.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
            {course.photos.map((src, index) => (
              <div
                key={`${course.id}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
              >
                <Image
                  src={src}
                  alt={`${course.title} ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#6b3b20] shadow-sm">
                  前菜
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
