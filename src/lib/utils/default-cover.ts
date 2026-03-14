/**
 * Deterministic default cover assignment for stories without an explicit cover_image.
 *
 * Strategy:
 *  1. If the story has a recognised topic, map it to a category
 *     and pick within that category using a hash of the storyId.
 *  2. Otherwise hash the storyId across all covers.
 *
 * Categories:
 *  - classic: Original color-series covers (pink/green/blue)
 *  - animal: Animal family illustrations
 *  - child: Child adventure/reading scenes
 *  - nature: Nature/landscape/ocean scenes
 *  - fantasy: Magical/fantastical scenes
 *  - warm: Cozy/emotional/craft scenes
 *  - style: AI-style labeled covers (ghibli/disney/pixar)
 */

type CoverTone = "pink" | "green" | "blue";
export type CoverCategory = "animal" | "child" | "nature" | "fantasy" | "warm" | "style";

interface ToneInfo {
  count: number;
  startIndex: number;
  ext: string;
}

const COVER_COUNTS: Record<CoverTone, ToneInfo> = {
  pink: { count: 16, startIndex: 1, ext: "png" },
  green: { count: 14, startIndex: 1, ext: "jpeg" },
  blue: { count: 15, startIndex: 0, ext: "jpeg" },
};

// New descriptive cover images organized by category
export const CATEGORY_COVERS: Record<CoverCategory, string[]> = {
  animal: [
    "/images/covers/Bear_family_walking_wheat_field_7c1ad49014.jpeg",
    "/images/covers/Bear_family_walking_wheat_field_9b35ef8d7c.jpeg",
    "/images/covers/Cat_napping_on_rooftop_laundry_2687a6ce9a.jpeg",
    "/images/covers/Child_and_tanuki_wait_bus_1597ddb49c.jpeg",
    "/images/covers/Child_touches_giant_bee_37ad1dc720.jpeg",
    "/images/covers/Cloud_whale_over_residential_street_c1d84defc6.jpeg",
    "/images/covers/Dragon_sleeps_with_garden_92b6b80e39.jpeg",
    "/images/covers/Felt_fox_and_owl_forest_d06c038980.jpeg",
    "/images/covers/Penguin_village_on_glacier_c5de204019.jpeg",
    "/images/covers/Polar_bears_sleeping_under_aurora_e76f52f038.jpeg",
    "/images/covers/Spider_weaving_rainbow_web_912586cc73.jpeg",
    "/images/covers/Whale_gliding_through_clouds_5dfa6e491a.jpeg",
  ],
  child: [
    "/images/covers/Child_crossing_stream_stones_9dd2d9c4b8.jpeg",
    "/images/covers/Child_hands_holding_galaxy_jar_975c9fd665.jpeg",
    "/images/covers/Child_hands_holding_galaxy_jar_f7fad8273e.jpeg",
    "/images/covers/Child_hugging_firefly_jar_207b60a38f.jpeg",
    "/images/covers/Child_on_platform_watching_stars_83b22568f0.jpeg",
    "/images/covers/Child_reading_in_abandoned_boat_98b3debdc2.jpeg",
    "/images/covers/Child_reading_in_flower_field_a3b6ad5632.jpeg",
    "/images/covers/Child_reading_underwater_library_553ce3df30.jpeg",
    "/images/covers/Child_running_through_meadow_fc6fcc972f.jpeg",
    "/images/covers/Child_silhouette_on_moon_09e95b6c12.jpeg",
    "/images/covers/Child_touching_planet_in_library_52ec7e8615.jpeg",
    "/images/covers/Child_waiting_at_crosswalk_cff48eaa97.jpeg",
    "/images/covers/Child_waiting_at_crosswalk_e3b4bc5a58.jpeg",
    "/images/covers/Child_walking_on_wet_road_5e49e88126.jpeg",
    "/images/covers/Child_walking_on_wet_road_7dc8816e8f.jpeg",
    "/images/covers/Child_watching_fireworks_over_river_2c95778870.jpeg",
    "/images/covers/Child_watching_meteor_shower_lake_bff6f368b8.jpeg",
    "/images/covers/Girl_by_cherry_blossom_window_636f31d214.jpeg",
    "/images/covers/Girl_looking_at_snail_cea84b3612.jpeg",
    "/images/covers/Girl_reading_magical_book_751cb84bfd.jpeg",
  ],
  nature: [
    "/images/covers/Bicycle_with_sunflowers_in_field_5085e3d5ea.jpeg",
    "/images/covers/Fishing_village_at_sunset_389cdd1a33.jpeg",
    "/images/covers/Giant_tree_with_treehouse_687f19d766.jpeg",
    "/images/covers/Piano_with_flowers_growing_d40a4436f2.jpeg",
  ],
  fantasy: [
    "/images/covers/Child_in_abandoned_classroom_618ee10cb9.jpeg",
    "/images/covers/Magical_star_factory_clock_tower_470a3ce89c.jpeg",
    "/images/covers/Open_book_with_3d_world_253932edd3.jpeg",
    "/images/covers/Seaplane_flying_over_cloud_sea_ab3f5e141a.jpeg",
    "/images/covers/Toys_in_block_city_dawn_2db8eadc99.jpeg",
  ],
  warm: [
    "/images/covers/Childs_chair_with_butterfly_0531c9761f.jpeg",
    "/images/covers/Embroidered_butterfly_on_linen_ee78ddccf1.jpeg",
    "/images/covers/Origami_sailboat_on_paper_sea_8425a5b689.jpeg",
    "/images/covers/Red_mitten_in_white_snow_0f5494ddd4.jpeg",
  ],
  style: [
    "/images/covers/__label_coverautumnleaftrain__subject_____demograp_a1178a7066.jpeg",
    "/images/covers/__label_covergrandmakitchenbaking__subject_____dem_ddd6136a8d.jpeg",
    "/images/covers/__label_covervintagehotairballoon__subject_____dem_0d0b2326d0.jpeg",
    "/images/covers/__label_covervintagehotairballoon__subject_____dem_a2fc29e392.jpeg",
    "/images/covers/__label_disneymoonladderdescending__scene_a_magica_eafde55f80.jpeg",
    "/images/covers/__label_ghiblisunflowerfieldbicycle__scene_an_oldf_9eabe17e1e.jpeg",
    "/images/covers/__label_pixarcloudhideseek__scene_high_above_the_e_882f236c2e.jpeg",
    "/images/covers/__label_pixarmoonlightsandcastle__scene_a_magnific_6421dabbff.jpeg",
    "/images/covers/__label_pixarpuddleexplorersrain__scene_a_rainy_su_824e247952.jpeg",
    "/images/covers/__label_pixarunderwaterballooncity__scene_deep_und_1cbec1bc6a.jpeg",
  ],
};

// All new category covers flattened
const ALL_CATEGORY_COVERS = Object.values(CATEGORY_COVERS).flat();

// Sprint 2-A: Child-centric keyword → cover category mapping
const TOPIC_TO_TONE: Record<string, CoverTone> = {
  자존감: "pink",
  성장: "green",
  감정표현: "blue",
  분노조절: "pink",
  우울극복: "blue",
  용기: "green",
  친구관계: "pink",
  가족사랑: "green",
};

// Topic → preferred category for new covers
const TOPIC_TO_CATEGORY: Record<string, CoverCategory> = {
  자존감: "warm",
  성장: "nature",
  감정표현: "child",
  분노조절: "animal",
  우울극복: "fantasy",
  용기: "child",
  친구관계: "animal",
  가족사랑: "warm",
};

/** Simple deterministic hash — always returns a positive integer */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Build a cover path for a given tone + index offset */
function coverPathForTone(tone: CoverTone, index: number): string {
  const info = COVER_COUNTS[tone];
  const safeIndex = info.startIndex + (index % info.count);
  return `/images/covers/cover_${tone}${String(safeIndex).padStart(2, "0")}.${info.ext}`;
}

/**
 * Return a deterministic default cover image path for a story.
 * 50% chance to pick from new category covers, 50% from classic tone covers.
 */
export function getDefaultCover(storyId: string, topic?: string | null): string {
  const hash = simpleHash(storyId);

  // Try category covers first (if topic maps to a category with images)
  if (topic && TOPIC_TO_CATEGORY[topic]) {
    const category = TOPIC_TO_CATEGORY[topic];
    const covers = CATEGORY_COVERS[category];
    if (covers.length > 0) {
      // Alternate between category and classic tone based on hash
      if (hash % 2 === 0) {
        return covers[hash % covers.length];
      }
    }
  }

  // Classic tone-based selection
  if (topic && TOPIC_TO_TONE[topic]) {
    return coverPathForTone(TOPIC_TO_TONE[topic], hash);
  }

  // Fallback: distribute across all covers (classic 45 + new category covers)
  const totalCovers = 45 + ALL_CATEGORY_COVERS.length;
  const index = hash % totalCovers;
  if (index < 16) return coverPathForTone("pink", index);
  if (index < 30) return coverPathForTone("green", index - 16);
  if (index < 45) return coverPathForTone("blue", index - 30);
  return ALL_CATEGORY_COVERS[index - 45];
}

/**
 * Resolve a story's cover image — returns the explicit cover or a deterministic default.
 * Safe to call with any combination of null/undefined values.
 */
export function resolveCover(
  coverImage: string | null | undefined,
  storyId: string,
  topic?: string | null,
): string {
  return coverImage || getDefaultCover(storyId, topic);
}

/**
 * Get all cover images organized by category (for CoverPicker UI).
 */
export function getAllCovers() {
  return {
    classic: {
      pink: Array.from({ length: 16 }, (_, i) =>
        `/images/covers/cover_pink${String(i + 1).padStart(2, "0")}.png`
      ),
      green: Array.from({ length: 14 }, (_, i) =>
        `/images/covers/cover_green${String(i + 1).padStart(2, "0")}.jpeg`
      ),
      blue: Array.from({ length: 15 }, (_, i) =>
        `/images/covers/cover_blue${String(i).padStart(2, "0")}.jpeg`
      ),
    },
    categories: CATEGORY_COVERS,
  };
}
