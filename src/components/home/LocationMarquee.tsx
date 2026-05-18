// Sliding global locations strip — pure CSS keyframe marquee.
// Used as the homepage hero background.
const LOCATIONS = [
  { name: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=70" },
  { name: "Tokyo", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=70" },
  { name: "Lisbon", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=70" },
  { name: "Marrakech", img: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=900&q=70" },
  { name: "Reykjavik", img: "https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=900&q=70" },
  { name: "New York", img: "https://images.unsplash.com/photo-1522083165195-3424ed129620?w=900&q=70" },
  { name: "Cape Town", img: "https://images.unsplash.com/photo-1591742708307-e1a564af8e0a?w=900&q=70" },
  { name: "Queenstown", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=70" },
];

export function LocationMarquee() {
  const tiles = [...LOCATIONS, ...LOCATIONS];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 flex animate-[ml-scroll_80s_linear_infinite] will-change-transform motion-reduce:animate-none">
        {tiles.map((loc, i) => (
          <div
            key={`${loc.name}-${i}`}
            className="relative h-full w-[70vw] shrink-0 sm:w-[42vw] lg:w-[28vw]"
            style={{ backgroundImage: `url('${loc.img}')`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <span className="absolute bottom-5 left-5 z-10 font-display text-[10px] uppercase tracking-[0.35em] text-white/85 mix-blend-luminosity sm:text-xs">
              {loc.name}
            </span>
          </div>
        ))}
      </div>
      {/* tonal overlay — uses brand tokens */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--deep)_55%,transparent)_0%,color-mix(in_oklch,var(--deep)_75%,transparent)_55%,var(--deep)_100%)]" />

      <style>{`
        @keyframes ml-scroll {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
      `}</style>
    </div>
  );
}
