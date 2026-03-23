/**
 * DOCX document style constants.
 * Shared across all worksheet DOCX builders.
 *
 * @module worksheet/docx/styles
 */

// ─── Colors ───
export const DOCX_COLORS = {
  coral: "E07A5F",
  brown: "5A3E2B",
  brownLight: "8B6B57",
  brownPale: "C4A882",
  cream: "FBF5EC",
  creamDark: "FFF0E8",
  lavender: "C8B8D8",
  mint: "B8E0D2",
  mintDark: "3D6B5E",
  white: "FFFFFF",
  gray: "4A4A4A",
  lineGray: "E8D5C4",
  bgLight: "FAFAF5",
} as const;

// ─── A4 Page dimensions ───
// docx library uses twips (1 inch = 1440 twips, 1mm = ~56.7 twips)
const MM_TO_TWIPS = 56.7;

export const DOCX_PAGE = {
  width: Math.round(210 * MM_TO_TWIPS),   // A4 width: 210mm
  height: Math.round(297 * MM_TO_TWIPS),  // A4 height: 297mm
  margin: {
    top: Math.round(15 * MM_TO_TWIPS),
    right: Math.round(15 * MM_TO_TWIPS),
    bottom: Math.round(15 * MM_TO_TWIPS),
    left: Math.round(15 * MM_TO_TWIPS),
  },
} as const;

// ─── Fonts ───
export const DOCX_FONTS = {
  primary: "Noto Sans KR",
  fallback: "Apple SD Gothic Neo",
} as const;

// ─── Style IDs ───
export const DOCX_STYLE_IDS = {
  title: "WorksheetTitle",
  subtitle: "WorksheetSubtitle",
  body: "WorksheetBody",
  question: "WorksheetQuestion",
  instruction: "WorksheetInstruction",
  drawingGuide: "WorksheetDrawingGuide",
  sceneSummary: "WorksheetSceneSummary",
  footer: "WorksheetFooter",
  nameField: "WorksheetNameField",
  sectionHeading: "WorksheetSectionHeading",
} as const;
