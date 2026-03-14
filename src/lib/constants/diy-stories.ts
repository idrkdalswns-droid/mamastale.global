/**
 * DIY 동화 만들기 — 6개 샘플 스토리 정의
 * 각 스토리는 public/images/diy/ 폴더의 이미지를 참조합니다.
 * DB 불필요 — 정적 데이터로 관리 (무료 서비스)
 */

export interface DIYStory {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  images: string[];
  accent: string;
}

const BASE = "/images/diy";

export const DIY_STORIES: DIYStory[] = [
  {
    id: "cotton-candy-bear",
    title: "거대한 솜사탕 엄마 곰",
    description: "솜사탕처럼 달콤한 엄마 곰과 아기 곰의 모험",
    thumbnail: `${BASE}/cotton-candy-bear/Mother_bear_and_baby_bear_e0a4506120.jpeg`,
    accent: "#E8A87C",
    images: [
      `${BASE}/cotton-candy-bear/Mother_bear_and_baby_bear_e0a4506120.jpeg`,
      `${BASE}/cotton-candy-bear/Bear_walking_towards_steel_machine_946a758a3c.jpeg`,
      `${BASE}/cotton-candy-bear/Mother_bear_running_hamster_wheel_e00573db8d.jpeg`,
      `${BASE}/cotton-candy-bear/Bear_arm_in_machine_c877138f00.jpeg`,
      `${BASE}/cotton-candy-bear/Bear_losing_ears_tail_machine_7d411eae9a.jpeg`,
      `${BASE}/cotton-candy-bear/Bear_shrinking_baby_pushed_back_ec1eb2f441.jpeg`,
      `${BASE}/cotton-candy-bear/Baby_bear_crying_alone_038a8774c0.jpeg`,
      `${BASE}/cotton-candy-bear/Baby_bear_crying_alone_788b02afa1.jpeg`,
      `${BASE}/cotton-candy-bear/Baby_bear_podo_glares_machine_28e6d9a59f.jpeg`,
      `${BASE}/cotton-candy-bear/Baby_bear_podo_exploding_machine_6839f56b10.jpeg`,
      `${BASE}/cotton-candy-bear/Baby_bear_hugging_lump_crying_c2a20075da.jpeg`,
      `${BASE}/cotton-candy-bear/Pebble_lump_on_ice_cave_dc67269e69.jpeg`,
      `${BASE}/cotton-candy-bear/Bears_rolling_in_mud_puddle_4ed463c1b6.jpeg`,
    ],
  },
  {
    id: "squirrel-popo",
    title: "다람쥐 포포와 파란 잎사귀",
    description: "포포와 엄마 다람쥐의 따뜻한 지브리풍 이야기",
    thumbnail: `${BASE}/squirrel-popo/Mother_squirrel_embracing_baby_3d1ff5b754.jpeg`,
    accent: "#7FBFB0",
    images: [
      `${BASE}/squirrel-popo/Mother_squirrel_embracing_baby_3d1ff5b754.jpeg`,
      `${BASE}/squirrel-popo/Mother_squirrel_watching_blue_leaf_8e1b545a84.jpeg`,
      `${BASE}/squirrel-popo/Mother_squirrel_running_with_leaf_1179382dbe.jpeg`,
      `${BASE}/squirrel-popo/Mother_squirrel_pulling_heavy_shoes_efd90c47af.jpeg`,
      `${BASE}/squirrel-popo/Baby_squirrel_falling_over_basket_9de14bd585.jpeg`,
      `${BASE}/squirrel-popo/Mother_squirrel_baby_sharing_acorn_0002d1fe4d.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__18258666e0.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__3b37565aab.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__44bef6af9e.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__76106068f2.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__76f4dd3db0.jpeg`,
      `${BASE}/squirrel-popo/A_masterpiece_illustration_in_studio_ghibli_style__ee16334ee3.jpeg`,
    ],
  },
  {
    id: "mole-family",
    title: "두더지 가족의 일상",
    description: "작지만 용감한 두더지 포포의 대모험",
    thumbnail: `${BASE}/mole-family/Baby_mole_leaping_into_sky_d28eb66cfc.jpeg`,
    accent: "#C4956A",
    images: [
      `${BASE}/mole-family/Tiny_popo_hugging_moms_glove_3c8a701a80.jpeg`,
      `${BASE}/mole-family/Baby_mole_pushing_giant_acorn_bfcfc3f7cc.jpeg`,
      `${BASE}/mole-family/Baby_mole_cowering_in_cave_25093d3d59.jpeg`,
      `${BASE}/mole-family/Baby_mole_stuck_in_mud_ae359de93f.jpeg`,
      `${BASE}/mole-family/Baby_mole_tumbling_down_hill_5d9bccdc44.jpeg`,
      `${BASE}/mole-family/Baby_mole_standing_on_cliff_d7aa83fef5.jpeg`,
      `${BASE}/mole-family/Baby_mole_falling_midair_54cca81dff.jpeg`,
      `${BASE}/mole-family/Baby_mole_leaping_into_sky_d28eb66cfc.jpeg`,
      `${BASE}/mole-family/__subject_a_single_bright_yellow_dandelion_sprout__7b0f2f0d04.jpeg`,
      `${BASE}/mole-family/__subject_tiny_baby_mole_popo_standing_on_tiptoes__d52469131e.jpeg`,
    ],
  },
  {
    id: "baby-fox",
    title: "아기 여우의 고민",
    description: "자라나는 감정을 수채화로 그린 아기 여우 이야기",
    thumbnail: `${BASE}/baby-fox/Baby_fox_looking_out_window_a606de8dae.jpeg`,
    accent: "#E07A5F",
    images: [
      `${BASE}/baby-fox/Baby_fox_looking_out_window_a606de8dae.jpeg`,
      `${BASE}/baby-fox/Baby_fox_crying_in_room_dacdea702f.jpeg`,
      `${BASE}/baby-fox/Baby_fox_looking_at_caterpillar_129f90343a.jpeg`,
      `${BASE}/baby-fox/Baby_fox_touching_plant_stem_396d2dad04.jpeg`,
      `${BASE}/baby-fox/Baby_fox_holding_plant_root_54b2f3f97b.jpeg`,
      `${BASE}/baby-fox/Giant_tree_overgrowing_living_room_3f76cd0167.jpeg`,
      `${BASE}/baby-fox/Medicine_mountain_over_sprout_a42caa2963.jpeg`,
      `${BASE}/baby-fox/Robot_shooting_light_at_plant_08bb9583f4.jpeg`,
      `${BASE}/baby-fox/Childrens_book_illustration_dynamic_watercolor_the_8e7f328a56.jpeg`,
      `${BASE}/baby-fox/Childrens_book_illustration_vibrant_watercolor_pom_0ed094f1d9.jpeg`,
      `${BASE}/baby-fox/Childrens_book_illustration_warm_watercolor_two_ad_972841e854.jpeg`,
      `${BASE}/baby-fox/Baby_fox_sleeping_with_parents_660571b528.jpeg`,
    ],
  },
  {
    id: "turtle-mama",
    title: "엄마 거북의 무거운 모터",
    description: "바닷속 거북이 가족의 사랑과 용기",
    thumbnail: `${BASE}/turtle-mama/Mom_and_pipi_rubbing_noses_c22e433693.jpeg`,
    accent: "#5A9E94",
    images: [
      `${BASE}/turtle-mama/Mom_and_pipi_rubbing_noses_c22e433693.jpeg`,
      `${BASE}/turtle-mama/Pipi_jumping_on_dad_turtle_b32b1c6644.jpeg`,
      `${BASE}/turtle-mama/Pipi_spinning_in_room_4f22a59541.jpeg`,
      `${BASE}/turtle-mama/Subject_mom_turtle_with_heavy_motor_circling_the_m_d6883ae9e8.jpeg`,
      `${BASE}/turtle-mama/Mom_turtle_angry_pipi_sad_ba597d2d61.jpeg`,
      `${BASE}/turtle-mama/Mom_turtle_staring_at_map_26ab35a831.jpeg`,
      `${BASE}/turtle-mama/Subject_pipi_the_baby_sea_turtle_looking_fascinate_2bd136b6ae.jpeg`,
      `${BASE}/turtle-mama/Subject_small_exhausted_mom_turtle_crying_in_the_m_02e901660d.jpeg`,
      `${BASE}/turtle-mama/Robot_crab_shooting_ink_chaos_5eb6fbf24b.jpeg`,
      `${BASE}/turtle-mama/Robot_crab_shooting_ink_chaos_d527a92d95.jpeg`,
      `${BASE}/turtle-mama/Subject_pipi_with_a_determined_cute_face_stuffing__038a800913.jpeg`,
      `${BASE}/turtle-mama/Subject_pipi_with_a_determined_cute_face_stuffing__e5cf1c0f94.jpeg`,
      `${BASE}/turtle-mama/Subject_closeup_of_pipi_hugging_moms_neck_tightly__123c0b41c9.jpeg`,
      `${BASE}/turtle-mama/Subject_closeup_of_pipi_hugging_moms_neck_tightly__68ad4da6b0.jpeg`,
      `${BASE}/turtle-mama/Subject_dad_waking_up_rubbing_his_eyes_pipi_playfu_17cee4189e.jpeg`,
    ],
  },
  {
    id: "submarine-mama",
    title: "잠수함 엄마 구출기",
    description: "엄마를 구하러 떠나는 딸의 따뜻한 수채화 모험",
    thumbnail: `${BASE}/submarine-mama/Mother_and_girl_touching_noses_4bdc233e1f.jpeg`,
    accent: "#8B6AAF",
    images: [
      `${BASE}/submarine-mama/A_beautiful_mother_wearing_a_soft_pastelpink_sweat_7dc2197a14.jpeg`,
      `${BASE}/submarine-mama/Rusted_diving_suit_doing_dishes_0e044f8a45.jpeg`,
      `${BASE}/submarine-mama/Rusted_iron_suit_mopping_floor_66a3731d0b.jpeg`,
      `${BASE}/submarine-mama/Rusted_diving_suit_crying_woman_56da4e0691.jpeg`,
      `${BASE}/submarine-mama/Girl_drawing_in_sketchbook_0497c8e22f.jpeg`,
      `${BASE}/submarine-mama/Girl_jumping_from_sofa_204495428b.jpeg`,
      `${BASE}/submarine-mama/Girl_jumping_from_sofa_699feca525.jpeg`,
      `${BASE}/submarine-mama/Girl_pushing_duck_tube_suit_65e6301ab5.jpeg`,
      `${BASE}/submarine-mama/Girl_pushing_duck_tube_suit_7f11eac19a.jpeg`,
      `${BASE}/submarine-mama/Girl_wrapping_hands_around_helmet_69084755c4.jpeg`,
      `${BASE}/submarine-mama/Explosion_of_household_items_flying_290645f7bd.jpeg`,
      `${BASE}/submarine-mama/Jia_a_4yearold_asian_girl_with_round_cheeks_and_sh_e96f887c40.jpeg`,
      `${BASE}/submarine-mama/Mother_and_girl_touching_noses_4bdc233e1f.jpeg`,
      `${BASE}/submarine-mama/Jia_a_4yearold_asian_girl_with_round_cheeks_and_sh_delpmaspu.png`,
    ],
  },
];

export function getDIYStory(id: string): DIYStory | undefined {
  return DIY_STORIES.find((s) => s.id === id);
}
