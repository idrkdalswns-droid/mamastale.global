import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Scene } from "@/lib/types/story";

// Register Korean fonts from Google Fonts CDN
Font.register({
  family: "NanumMyeongjo",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/nanummyeongjo/v22/9Btx3DZF0dXLMZlywRbVRNhxy1LreHQ8jnYf.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/nanummyeongjo/v22/9Bty3DZF0dXLMZlywRbVRNhxy2pLU7etqAOhMkA.ttf",
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf",
      fontWeight: 300,
    },
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozeLTq8H4hfeE.ttf",
      fontWeight: 400,
    },
  ],
});

// Disable hyphenation for Korean text
Font.registerHyphenationCallback((word) => [word]);

const phaseColors: Record<number, { bg: string; accent: string }> = {
  1: { bg: "#EEF6F3", accent: "#7FBFB0" },
  2: { bg: "#FEF7ED", accent: "#E07A5F" },
  3: { bg: "#F4EEF8", accent: "#8B6AAF" },
  4: { bg: "#FFF6EE", accent: "#C4956A" },
};

function getScenePhaseColor(sceneNumber: number) {
  if (sceneNumber <= 2) return phaseColors[1]; // 도입
  if (sceneNumber <= 4) return phaseColors[2]; // 갈등
  if (sceneNumber <= 6) return phaseColors[3]; // 시도
  if (sceneNumber <= 8) return phaseColors[4]; // 해결
  return { bg: "#FBF5EC", accent: "#C4956A" }; // 교훈
}

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "NanumMyeongjo",
    position: "relative",
  },
  coverPage: {
    padding: 60,
    fontFamily: "NanumMyeongjo",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBF5EC",
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: "#5A3E2B",
    marginBottom: 16,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: "#8B6F55",
    marginBottom: 8,
    textAlign: "center",
  },
  coverBrand: {
    fontSize: 11,
    fontWeight: 400,
    color: "#C4A882",
    marginTop: 40,
    letterSpacing: 3,
    textAlign: "center",
  },
  coverDate: {
    fontSize: 10,
    fontWeight: 300,
    color: "#A08060",
    marginTop: 8,
    fontFamily: "NotoSansKR",
    textAlign: "center",
  },
  sceneHeader: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0D8D0",
  },
  sceneNumber: {
    fontSize: 10,
    fontFamily: "NotoSansKR",
    fontWeight: 300,
    color: "#A08060",
    letterSpacing: 2,
    marginBottom: 6,
  },
  sceneTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#5A3E2B",
  },
  sceneText: {
    fontSize: 14,
    fontWeight: 400,
    color: "#5A3E2B",
    lineHeight: 2.2,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#C4A882",
    fontFamily: "NotoSansKR",
    fontWeight: 300,
  },
  endPage: {
    padding: 60,
    fontFamily: "NanumMyeongjo",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBF5EC",
  },
  endEmoji: {
    fontSize: 40,
    marginBottom: 20,
    textAlign: "center",
  },
  endTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#5A3E2B",
    marginBottom: 16,
    textAlign: "center",
  },
  endText: {
    fontSize: 12,
    fontWeight: 400,
    color: "#8B6F55",
    lineHeight: 2.4,
    textAlign: "center",
  },
  decorLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E07A5F",
    marginBottom: 20,
  },
});

interface StoryPDFProps {
  title: string;
  scenes: Scene[];
  authorName: string;
  createdAt: string;
}

export function StoryPDFDocument({
  title,
  scenes,
  authorName,
  createdAt,
}: StoryPDFProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A5" style={styles.coverPage}>
        <View style={styles.decorLine} />
        <Text style={styles.coverTitle}>{title}</Text>
        <Text style={styles.coverSubtitle}>{authorName}의 마음 동화</Text>
        <Text style={styles.coverBrand}>MAMASTALE</Text>
        <Text style={styles.coverDate}>{createdAt}</Text>
      </Page>

      {/* Scene Pages */}
      {scenes.map((scene) => {
        const colors = getScenePhaseColor(scene.sceneNumber);
        return (
          <Page
            key={scene.sceneNumber}
            size="A5"
            style={[styles.page, { backgroundColor: colors.bg }]}
          >
            <View style={styles.sceneHeader}>
              <Text style={styles.sceneNumber}>
                장면 {String(scene.sceneNumber).padStart(2, "0")}
              </Text>
              <Text style={[styles.sceneTitle, { color: colors.accent }]}>
                {scene.title}
              </Text>
            </View>
            <Text style={styles.sceneText}>{scene.text}</Text>
            <Text style={styles.footer}>
              mamastale — {scene.sceneNumber} / {scenes.length}
            </Text>
          </Page>
        );
      })}

      {/* End Page */}
      <Page size="A5" style={styles.endPage}>
        <Text style={styles.endEmoji}>✨</Text>
        <Text style={styles.endTitle}>축하합니다</Text>
        <Text style={styles.endText}>
          {`당신은 방금 당신의 고통을\n당신의 사랑스러운 동화로 변환했습니다.\n\n이 동화는 단순한 이야기가 아니에요.\n이건 당신의 여정입니다.\n당신의 강함의 기록입니다.\n당신의 사랑의 증거입니다.\n\n이제 이 동화를 아기에게 읽어주세요.\n그리고 당신 자신에게도 읽어주세요.`}
        </Text>
        <Text
          style={[
            styles.coverBrand,
            { marginTop: 30, fontSize: 9, color: "#C4A882" },
          ]}
        >
          MAMASTALE · 나의 과거가 아이의 동화가 되다
        </Text>
      </Page>
    </Document>
  );
}
