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
      <div className="absolute inset-0 flex animate-[ml-scroll_60s_linear_infinite] will-change-transform">
        {tiles.map((loc, i) => (
          <div
            key={`${loc.name}-${i}`}
            className="relative h-full w-[55vw] shrink-0 sm:w-[38vw] lg:w-[28vw]"
            style={{ backgroundImage: `url('${loc.img}')`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <span className="absolute bottom-6 left-6 z-10 font-display text-sm uppercase tracking-[0.3em] text-white/90 mix-blend-luminosity">
              {loc.name}
            </span>
          </div>
        ))}
      </div>
      {/* dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-jungle/55 via-jungle/70 to-jungle/95" />

      <style>{`
        @keyframes ml-scroll {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
      `}</style>
    </div>
  );
}
