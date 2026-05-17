// Curated Bali activity catalogue — used by the deterministic planner.
// No AI required. Add or edit freely.
//
// Image URLs use Unsplash source for variety; swap with your own assets later.

export type CatalogueEntry = {
  id: string;
  title: string;
  description: string;
  location: string;       // human-readable
  area: "ubud" | "canggu" | "uluwatu" | "seminyak" | "nusa-dua" | "amed" | "munduk" | "nusa-penida" | "sanur";
  lat: number;
  lng: number;
  category: "food" | "activity" | "culture" | "nightlife" | "chill" | "transit";
  vibes: Array<"adventure" | "relaxed" | "cultural" | "foodie" | "party">;
  tags: Array<"beach" | "surf" | "rice" | "temple" | "spa" | "nightlife" | "diving" | "yoga" | "waterfall" | "hike" | "market" | "sunset">;
  intensity: 1 | 2 | 3;   // 1=chill, 3=intense
  budget: 1 | 2 | 3;      // 1=$, 3=$$$
  duration_min: number;
  daypart: "morning" | "afternoon" | "evening";
  image_url: string;
};

export const BALI_CATALOGUE: CatalogueEntry[] = [
  // --- Morning ---
  { id: "morning-yoga-radiantly-alive", title: "Sunrise yoga at Radiantly Alive", description: "90-min vinyasa flow in the heart of Ubud. Mats provided.", location: "Radiantly Alive, Ubud", area: "ubud", lat: -8.5069, lng: 115.2625, category: "chill", vibes: ["relaxed", "cultural"], tags: ["yoga"], intensity: 1, budget: 1, duration_min: 90, daypart: "morning", image_url: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80" },
  { id: "morning-tegalalang", title: "Tegalalang rice terraces", description: "Walk the iconic emerald terraces before the heat and crowds arrive.", location: "Tegalalang, Ubud", area: "ubud", lat: -8.4314, lng: 115.2776, category: "activity", vibes: ["cultural", "adventure"], tags: ["rice", "hike"], intensity: 2, budget: 1, duration_min: 120, daypart: "morning", image_url: "https://images.unsplash.com/photo-1531592937781-344ad608fabf?w=800&q=80" },
  { id: "morning-surf-canggu", title: "Surf lesson at Batu Bolong", description: "Beginner-friendly waves, longboard rental & coach.", location: "Batu Bolong Beach, Canggu", area: "canggu", lat: -8.6573, lng: 115.1330, category: "activity", vibes: ["adventure"], tags: ["surf", "beach"], intensity: 3, budget: 2, duration_min: 120, daypart: "morning", image_url: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80" },
  { id: "morning-mt-batur", title: "Mt Batur sunrise trek", description: "2am pickup, 2-hour ascent, breakfast over the crater rim.", location: "Mt Batur, Kintamani", area: "ubud", lat: -8.2421, lng: 115.3753, category: "activity", vibes: ["adventure"], tags: ["hike", "sunset"], intensity: 3, budget: 2, duration_min: 360, daypart: "morning", image_url: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=800&q=80" },
  { id: "morning-coffee-revolver", title: "Brunch at Revolver Espresso", description: "Speakeasy-style coffee bar, eggs benedict that's actually good.", location: "Revolver, Seminyak", area: "seminyak", lat: -8.6886, lng: 115.1659, category: "food", vibes: ["foodie", "relaxed"], tags: [], intensity: 1, budget: 2, duration_min: 75, daypart: "morning", image_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80" },
  { id: "morning-spa-bodyworks", title: "Spa morning at Bodyworks", description: "Balinese massage, flower bath, fresh juice. 2hr ritual.", location: "Bodyworks, Seminyak", area: "seminyak", lat: -8.6794, lng: 115.1577, category: "chill", vibes: ["relaxed"], tags: ["spa"], intensity: 1, budget: 2, duration_min: 120, daypart: "morning", image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80" },

  // --- Afternoon ---
  { id: "afternoon-monkey-forest", title: "Sacred Monkey Forest", description: "Walk among ancient banyans and 700 macaques. Hold your snacks tight.", location: "Sacred Monkey Forest, Ubud", area: "ubud", lat: -8.5188, lng: 115.2588, category: "culture", vibes: ["cultural", "adventure"], tags: ["temple"], intensity: 2, budget: 1, duration_min: 90, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1604665039000-7b00b21d9f1d?w=800&q=80" },
  { id: "afternoon-uluwatu-temple", title: "Uluwatu Temple + Kecak dance", description: "Cliff-top temple at golden hour with the fire-trance Kecak performance.", location: "Pura Luhur Uluwatu", area: "uluwatu", lat: -8.8290, lng: 115.0850, category: "culture", vibes: ["cultural"], tags: ["temple", "sunset"], intensity: 1, budget: 1, duration_min: 180, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&q=80" },
  { id: "afternoon-tirta-empul", title: "Tirta Empul purification ritual", description: "Sacred spring temple, guided melukat ceremony, sarong provided.", location: "Tirta Empul, Tampaksiring", area: "ubud", lat: -8.4156, lng: 115.3155, category: "culture", vibes: ["cultural", "relaxed"], tags: ["temple"], intensity: 2, budget: 1, duration_min: 150, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1559628233-100c798642d4?w=800&q=80" },
  { id: "afternoon-nusa-penida", title: "Nusa Penida day trip — Kelingking + Broken Beach", description: "Boat over, scooter the island's wildest viewpoints.", location: "Nusa Penida", area: "nusa-penida", lat: -8.7273, lng: 115.5444, category: "activity", vibes: ["adventure"], tags: ["beach", "hike"], intensity: 3, budget: 2, duration_min: 480, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1559628233-eb1bfc7ce96f?w=800&q=80" },
  { id: "afternoon-canggu-beach", title: "Beach club at La Brisa", description: "Driftwood-built club, infinity pool, sun loungers facing the surf.", location: "La Brisa, Canggu", area: "canggu", lat: -8.6543, lng: 115.1295, category: "chill", vibes: ["relaxed", "party"], tags: ["beach"], intensity: 1, budget: 3, duration_min: 240, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
  { id: "afternoon-tibumana", title: "Tibumana waterfall swim", description: "Tucked-away waterfall, easy 10-min walk in. Bring swimsuit.", location: "Tibumana Waterfall, Bangli", area: "ubud", lat: -8.5469, lng: 115.3661, category: "activity", vibes: ["adventure", "relaxed"], tags: ["waterfall", "hike"], intensity: 2, budget: 1, duration_min: 180, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1502209524164-acea936639a2?w=800&q=80" },
  { id: "afternoon-cooking-class", title: "Cooking class at Paon Bali", description: "Market tour, then cook 7 Balinese dishes in a family compound.", location: "Paon Bali, Ubud", area: "ubud", lat: -8.4937, lng: 115.2552, category: "food", vibes: ["foodie", "cultural"], tags: ["market"], intensity: 1, budget: 2, duration_min: 240, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80" },
  { id: "afternoon-blue-lagoon", title: "Snorkel Blue Lagoon, Padangbai", description: "Calm bay, abundant fish, gear rental on the beach.", location: "Blue Lagoon, Padangbai", area: "amed", lat: -8.5320, lng: 115.5099, category: "activity", vibes: ["adventure"], tags: ["beach", "diving"], intensity: 2, budget: 2, duration_min: 240, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80" },
  { id: "afternoon-spa-karsa", title: "Karsa Spa rice-paddy massage", description: "Open-air bales overlooking rice fields. 90-min full body.", location: "Karsa Spa, Ubud", area: "ubud", lat: -8.4953, lng: 115.2570, category: "chill", vibes: ["relaxed"], tags: ["spa"], intensity: 1, budget: 2, duration_min: 90, daypart: "afternoon", image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80" },

  // --- Evening ---
  { id: "evening-locavore", title: "Tasting menu at Locavore NXT", description: "10-course modern Indonesian. Book weeks ahead.", location: "Locavore NXT, Ubud", area: "ubud", lat: -8.5095, lng: 115.2603, category: "food", vibes: ["foodie"], tags: [], intensity: 1, budget: 3, duration_min: 180, daypart: "evening", image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80" },
  { id: "evening-jimbaran-seafood", title: "Jimbaran Bay seafood grill", description: "Toes-in-sand long tables, just-caught fish over coconut husks.", location: "Jimbaran Bay", area: "uluwatu", lat: -8.7794, lng: 115.1638, category: "food", vibes: ["foodie", "relaxed"], tags: ["beach", "sunset"], intensity: 1, budget: 2, duration_min: 150, daypart: "evening", image_url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80" },
  { id: "evening-single-fin", title: "Sunset session at Single Fin", description: "Iconic cliff bar, world-class sunsets, DJ from 6pm.", location: "Single Fin, Uluwatu", area: "uluwatu", lat: -8.8147, lng: 115.0867, category: "nightlife", vibes: ["party", "relaxed"], tags: ["sunset", "nightlife"], intensity: 2, budget: 2, duration_min: 240, daypart: "evening", image_url: "https://images.unsplash.com/photo-1502780402662-acc01917420e?w=800&q=80" },
  { id: "evening-finns-club", title: "Finns Beach Club night", description: "DJs, fire shows, swim-up bar. Goes late.", location: "Finns, Canggu", area: "canggu", lat: -8.6663, lng: 115.1366, category: "nightlife", vibes: ["party"], tags: ["nightlife", "beach"], intensity: 3, budget: 3, duration_min: 300, daypart: "evening", image_url: "https://images.unsplash.com/photo-1571266028243-d220c6a0a6b3?w=800&q=80" },
  { id: "evening-mocca", title: "Mörkar wood-fired dinner", description: "Open-fire chef's counter in a converted Canggu warehouse.", location: "Mörkar, Canggu", area: "canggu", lat: -8.6515, lng: 115.1410, category: "food", vibes: ["foodie"], tags: [], intensity: 1, budget: 3, duration_min: 150, daypart: "evening", image_url: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80" },
  { id: "evening-warung-pulau-kelapa", title: "Warung Pulau Kelapa local feast", description: "Family-style nasi campur, sambal that will ruin all other sambal.", location: "Warung Pulau Kelapa, Ubud", area: "ubud", lat: -8.4982, lng: 115.2604, category: "food", vibes: ["foodie", "cultural"], tags: [], intensity: 1, budget: 1, duration_min: 90, daypart: "evening", image_url: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80" },
  { id: "evening-savaya", title: "Savaya Bali night out", description: "Cliff-edge megaclub, international DJs, runs till 4am.", location: "Savaya, Uluwatu", area: "uluwatu", lat: -8.8358, lng: 115.0769, category: "nightlife", vibes: ["party"], tags: ["nightlife"], intensity: 3, budget: 3, duration_min: 360, daypart: "evening", image_url: "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800&q=80" },
  { id: "evening-fire-dance", title: "Kecak fire dance at Pura Dalem", description: "Traditional Ramayana performance, less touristy than Uluwatu.", location: "Pura Dalem, Ubud", area: "ubud", lat: -8.5067, lng: 115.2625, category: "culture", vibes: ["cultural"], tags: ["temple"], intensity: 1, budget: 1, duration_min: 90, daypart: "evening", image_url: "https://images.unsplash.com/photo-1604665039000-7b00b21d9f1d?w=800&q=80" },
];

export const VIBE_OPTIONS = [
  { id: "adventure", label: "Adventure", emoji: "🏄" },
  { id: "relaxed", label: "Relaxed", emoji: "🧘" },
  { id: "cultural", label: "Cultural", emoji: "🛕" },
  { id: "foodie", label: "Foodie", emoji: "🍜" },
  { id: "party", label: "Party", emoji: "🎉" },
] as const;

export const MUST_DO_OPTIONS = [
  { id: "beach", label: "Beach days", emoji: "🏖️" },
  { id: "surf", label: "Surf", emoji: "🏄" },
  { id: "rice", label: "Rice terraces", emoji: "🌾" },
  { id: "temple", label: "Temples", emoji: "🛕" },
  { id: "spa", label: "Spa & wellness", emoji: "💆" },
  { id: "nightlife", label: "Nightlife", emoji: "🍹" },
  { id: "diving", label: "Snorkel/dive", emoji: "🤿" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "waterfall", label: "Waterfalls", emoji: "💦" },
  { id: "hike", label: "Hiking", emoji: "🥾" },
  { id: "market", label: "Local markets", emoji: "🛒" },
  { id: "sunset", label: "Sunset spots", emoji: "🌅" },
] as const;

export const AVOID_OPTIONS = [
  { id: "early", label: "Early starts", emoji: "🌅" },
  { id: "drives", label: "Long drives", emoji: "🚗" },
  { id: "crowds", label: "Tourist crowds", emoji: "👥" },
] as const;
