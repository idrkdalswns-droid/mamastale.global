/**
 * DOCX worksheet builder.
 * Client-side only — imported dynamically.
 *
 * Uses the `docx` library to generate A4-formatted DOCX files
 * for printable worksheets.
 *
 * @module worksheet/docx/builder
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  ShadingType,
  TableLayoutType,
} from "docx";
import type { ActivityType } from "../types";
import type { DerivedParams } from "../types";
import type {
  EmotionWorksheetOutput,
  PostReadingWorksheetOutput,
  ColoringWorksheetOutput,
  VocabularyWorksheetOutput,
  CharacterCardWorksheetOutput,
  StoryMapWorksheetOutput,
  WhatIfWorksheetOutput,
  SpeechBubbleWorksheetOutput,
  RoleplayScriptWorksheetOutput,
} from "../schemas";
import { DOCX_COLORS, DOCX_PAGE, DOCX_FONTS } from "./styles";

// ─── Unit helpers ───

/** Points to half-points (docx uses half-points for font size) */
function pt(points: number): number {
  return points * 2;
}

/** mm to twips */
function mmToTwips(mm: number): number {
  return Math.round(mm * 56.7);
}

// ─── Common Header Builder ───

function buildHeader(
  title: string,
  subtitle: string,
  nuriDomain: string,
  params: DerivedParams,
): Paragraph[] {
  return [
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: title,
          font: DOCX_FONTS.primary,
          size: pt(params.font_size_title_pt),
          bold: true,
          color: DOCX_COLORS.coral,
        }),
      ],
    }),
    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: subtitle,
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.9)),
          color: DOCX_COLORS.brownLight,
        }),
      ],
    }),
    // Nuri domain badge
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `  누리과정: ${nuriDomain}  `,
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.75)),
          bold: true,
          color: DOCX_COLORS.mintDark,
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: DOCX_COLORS.mint,
          },
        }),
      ],
    }),
    // Dashed divider
    dashedDivider(),
    // Name / Date fields
    new Paragraph({
      spacing: { before: 160, after: 240 },
      children: [
        new TextRun({
          text: "이름: ",
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.85)),
          color: DOCX_COLORS.brown,
        }),
        new TextRun({
          text: "________________",
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.85)),
          color: DOCX_COLORS.brownPale,
        }),
        new TextRun({
          text: "     날짜: ",
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.85)),
          color: DOCX_COLORS.brown,
        }),
        new TextRun({
          text: "________________",
          font: DOCX_FONTS.primary,
          size: pt(Math.round(params.font_size_body_pt * 0.85)),
          color: DOCX_COLORS.brownPale,
        }),
      ],
    }),
  ];
}

// ─── Common Footer Builder ───

function buildFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "마마스테일 \u00B7 엄마엄마동화 \u00B7 mamastale.com",
            font: DOCX_FONTS.primary,
            size: pt(9),
            color: DOCX_COLORS.brownPale,
          }),
        ],
      }),
    ],
  });
}

// ─── Common Helpers ───

/** Dashed divider line */
function dashedDivider(): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: {
      bottom: {
        style: BorderStyle.DASHED,
        size: 6,
        space: 1,
        color: DOCX_COLORS.brownPale,
      },
    },
    children: [],
  });
}

/** Section divider with spacing */
function sectionDivider(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 4,
        space: 1,
        color: DOCX_COLORS.lineGray,
      },
    },
    children: [],
  });
}

/** Drawing area — a dashed border table cell with prompt text */
function drawingAreaParagraph(prompt: string, heightPt?: number): Table {
  const cellHeight = heightPt ? mmToTwips(heightPt) : mmToTwips(50);

  const dashedBorder = {
    style: BorderStyle.DASHED,
    size: 4,
    color: DOCX_COLORS.brownPale,
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: cellHeight, rule: "atLeast" as const },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: dashedBorder,
              bottom: dashedBorder,
              left: dashedBorder,
              right: dashedBorder,
            },
            shading: {
              type: ShadingType.CLEAR,
              color: "auto",
              fill: DOCX_COLORS.white,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
                children: [
                  new TextRun({
                    text: prompt,
                    font: DOCX_FONTS.primary,
                    size: pt(10),
                    color: DOCX_COLORS.brownPale,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Question block: numbered question + writing lines */
function questionBlock(
  question: string,
  index: number,
  params: DerivedParams,
  writingLineCount?: number,
): Paragraph[] {
  const lineCount = writingLineCount ?? (params.writing_ratio > 0.3 ? 3 : 2);
  return [
    // Question text
    new Paragraph({
      spacing: { before: 200, after: 80 },
      shading: {
        type: ShadingType.CLEAR,
        color: "auto",
        fill: DOCX_COLORS.bgLight,
      },
      border: {
        left: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: DOCX_COLORS.coral,
          space: 8,
        },
      },
      children: [
        new TextRun({
          text: `${index + 1}. `,
          font: DOCX_FONTS.primary,
          size: pt(params.font_size_body_pt),
          bold: true,
          color: DOCX_COLORS.coral,
        }),
        new TextRun({
          text: question,
          font: DOCX_FONTS.primary,
          size: pt(params.font_size_body_pt),
          bold: true,
          color: DOCX_COLORS.brown,
        }),
      ],
    }),
    // Writing lines
    ...writingLines(lineCount, params),
  ];
}

/** Generate empty writing lines (underlines for answers) */
function writingLines(count: number, params: DerivedParams): Paragraph[] {
  return Array.from({ length: count }, () =>
    new Paragraph({
      spacing: {
        before: 40,
        after: 40,
      },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 3,
          space: 1,
          color: DOCX_COLORS.lineGray,
        },
      },
      children: [
        new TextRun({
          text: " ",
          font: DOCX_FONTS.primary,
          size: pt(params.font_size_body_pt * 1.5),
          color: DOCX_COLORS.white, // invisible spacer
        }),
      ],
    })
  );
}

/** Section heading (e.g., "감정 아이콘", "이야기를 떠올려봐요") */
function sectionHeading(text: string, params: DerivedParams): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({
        text,
        font: DOCX_FONTS.primary,
        size: pt(Math.round(params.font_size_body_pt * 1.1)),
        bold: true,
        color: DOCX_COLORS.coral,
      }),
    ],
  });
}

/** Instruction block with cream background */
function instructionParagraph(text: string, params: DerivedParams): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: {
      type: ShadingType.CLEAR,
      color: "auto",
      fill: DOCX_COLORS.creamDark,
    },
    children: [
      new TextRun({
        text: `  ${text}  `,
        font: DOCX_FONTS.primary,
        size: pt(Math.round(params.font_size_body_pt * 0.85)),
        color: DOCX_COLORS.brownLight,
      }),
    ],
  });
}

// ─── Emotion Renderer ───

function renderEmotionDocx(
  data: EmotionWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  // Instructions
  children.push(instructionParagraph(data.instructions, params));

  // Emotion icons table (4-column grid)
  children.push(sectionHeading("감정 아이콘", params));

  const icons = data.emotion_icons;
  const columns = 4;
  const rows: TableRow[] = [];

  for (let r = 0; r < Math.ceil(icons.length / columns); r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      const icon = icons[idx];
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
            left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
            right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
          },
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: DOCX_COLORS.white,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 40 },
              children: icon
                ? [
                    new TextRun({
                      text: getEmotionEmoji(icon.emotion),
                      font: DOCX_FONTS.primary,
                      size: pt(22),
                    }),
                  ]
                : [],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: icon
                ? [
                    new TextRun({
                      text: icon.label,
                      font: DOCX_FONTS.primary,
                      size: pt(Math.round(params.font_size_body_pt * 0.85)),
                      color: DOCX_COLORS.brown,
                    }),
                  ]
                : [],
            }),
          ],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows,
    })
  );

  // Emotion scenes
  for (let i = 0; i < data.emotion_scenes.length; i++) {
    const scene = data.emotion_scenes[i];

    children.push(sectionDivider());

    // Question
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        shading: {
          type: ShadingType.CLEAR,
          color: "auto",
          fill: DOCX_COLORS.bgLight,
        },
        border: {
          left: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: DOCX_COLORS.coral,
            space: 8,
          },
        },
        children: [
          new TextRun({
            text: `${i + 1}. `,
            font: DOCX_FONTS.primary,
            size: pt(params.font_size_body_pt),
            bold: true,
            color: DOCX_COLORS.coral,
          }),
          new TextRun({
            text: scene.question,
            font: DOCX_FONTS.primary,
            size: pt(params.font_size_body_pt),
            bold: true,
            color: DOCX_COLORS.brown,
          }),
        ],
      })
    );

    // Scene summary (small gray text)
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `(${scene.character}의 장면: ${scene.scene_summary})`,
            font: DOCX_FONTS.primary,
            size: pt(Math.round(params.font_size_body_pt * 0.8)),
            color: DOCX_COLORS.brownLight,
            italics: true,
          }),
        ],
      })
    );

    // Drawing area
    const drawingHeight = Math.round(50 * params.drawing_space_ratio);
    const drawingPrompt =
      params.instruction_complexity === "icon_only"
        ? "그려요!"
        : "감정 얼굴을 그려보세요";
    children.push(drawingAreaParagraph(drawingPrompt, drawingHeight));

    // Writing lines (if writing_ratio > 0.2)
    if (params.writing_ratio > 0.2) {
      children.push(...writingLines(2, params));
    }
  }

  // Body mapping (optional)
  if (data.body_mapping_prompt) {
    children.push(sectionDivider());
    children.push(sectionHeading("몸으로 느끼는 감정", params));
    children.push(instructionParagraph(data.body_mapping_prompt, params));
    children.push(
      drawingAreaParagraph("몸에서 감정이 느껴지는 곳에 색칠해보세요", 60)
    );
  }

  return children;
}

// ─── Post-Reading Renderer ───

function renderPostReadingDocx(
  data: PostReadingWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  // Instructions
  children.push(instructionParagraph(data.instructions, params));

  // Comprehension questions section
  children.push(sectionHeading("이야기를 떠올려봐요", params));

  for (let i = 0; i < data.comprehension_questions.length; i++) {
    const q = data.comprehension_questions[i];
    children.push(...questionBlock(q.question, i, params));
  }

  // Drawing section
  children.push(sectionDivider());
  children.push(sectionHeading(data.drawing_prompt, params));

  const drawingHeight = Math.round(80 * params.drawing_space_ratio);
  children.push(
    drawingAreaParagraph("자유롭게 그려보세요!", drawingHeight)
  );

  // Writing section
  children.push(sectionDivider());
  children.push(sectionHeading(data.writing_prompt, params));

  const lineCount = params.writing_ratio > 0.3 ? 6 : 3;
  children.push(...writingLines(lineCount, params));

  // Creative extension (optional)
  if (data.creative_extension) {
    children.push(sectionDivider());
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: "더 생각해볼까요?",
            font: DOCX_FONTS.primary,
            size: pt(Math.round(params.font_size_body_pt * 1.1)),
            bold: true,
            color: DOCX_COLORS.mintDark,
          }),
        ],
      })
    );
    children.push(instructionParagraph(data.creative_extension, params));
    children.push(...writingLines(3, params));
  }

  return children;
}

// ─── Emotion Emoji Mapper ───

function getEmotionEmoji(emotion: string): string {
  const map: Record<string, string> = {
    기쁨: "\u{1F60A}", 행복: "\u{1F60A}", 즐거움: "\u{1F604}",
    슬픔: "\u{1F622}", 우울: "\u{1F622}",
    화남: "\u{1F620}", 분노: "\u{1F620}",
    무서움: "\u{1F628}", 공포: "\u{1F628}", 두려움: "\u{1F628}",
    놀람: "\u{1F632}", 깜짝: "\u{1F632}",
    부끄러움: "\u{1F633}",
    걱정: "\u{1F61F}", 불안: "\u{1F61F}",
    외로움: "\u{1F97A}",
    자랑스러움: "\u{1F929}", 뿌듯함: "\u{1F929}",
    감사: "\u{1F970}", 사랑: "\u{1F970}",
  };
  return map[emotion] || "\u{1F4AD}";
}

// ─── Coloring Renderer ───

function renderColoringDocx(
  data: ColoringWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  for (let i = 0; i < data.coloring_scenes.length; i++) {
    const scene = data.coloring_scenes[i];
    if (i > 0) children.push(sectionDivider());
    children.push(sectionHeading(`🎨 장면 ${i + 1}`, params));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: scene.scene_description,
            font: DOCX_FONTS.primary,
            size: pt(params.font_size_body_pt),
            color: DOCX_COLORS.brown,
          }),
        ],
      })
    );

    // Elements grid (4 columns)
    const cols = 4;
    const elemRows: TableRow[] = [];
    for (let r = 0; r < Math.ceil(scene.elements.length / cols); r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < cols; c++) {
        const elem = scene.elements[r * cols + c];
        cells.push(
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
              left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
              right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: elem
                  ? [new TextRun({ text: elem, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), color: DOCX_COLORS.brown })]
                  : [],
              }),
            ],
          })
        );
      }
      elemRows.push(new TableRow({ children: cells }));
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: elemRows }));

    // Mood
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({ text: `분위기: ${scene.mood}`, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), color: DOCX_COLORS.brownLight, italics: true }),
        ],
      })
    );

    // Drawing area
    children.push(drawingAreaParagraph("🖍️ 자유롭게 색칠해보세요", Math.round(80 * params.drawing_space_ratio)));
  }

  if (data.color_suggestion) {
    children.push(sectionDivider());
    children.push(instructionParagraph(`🎨 색칠 팁: ${data.color_suggestion}`, params));
  }

  children.push(sectionDivider());
  children.push(sectionHeading("✏️ 자유 그리기", params));
  children.push(instructionParagraph(data.free_drawing_prompt, params));
  children.push(drawingAreaParagraph("자유롭게 그려보세요!", Math.round(70 * params.drawing_space_ratio)));

  return children;
}

// ─── Vocabulary Renderer ───

function renderVocabularyDocx(
  data: VocabularyWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  const categoryLabels: Record<string, string> = {
    emotion_word: "감정 낱말",
    action_word: "동작 낱말",
    noun: "이름 낱말",
    adjective: "꾸미는 낱말",
    onomatopoeia: "소리/모양 낱말",
  };

  for (let i = 0; i < data.words.length; i++) {
    const word = data.words[i];
    if (i > 0) children.push(sectionDivider());

    children.push(sectionHeading(`📚 ${word.word}`, params));
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `[${categoryLabels[word.category] || word.category}]`, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.75)), color: DOCX_COLORS.mintDark, bold: true }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `뜻: `, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), bold: true, color: DOCX_COLORS.brown }),
          new TextRun({ text: word.meaning, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `예문: `, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), bold: true, color: DOCX_COLORS.brown }),
          new TextRun({ text: `"${word.example_sentence}"`, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brownLight, italics: true }),
        ],
      })
    );
    children.push(drawingAreaParagraph(word.drawing_hint, Math.round(40 * params.drawing_space_ratio)));
  }

  // Word puzzle
  if (data.word_puzzle) {
    children.push(sectionDivider());
    children.push(sectionHeading("🧩 낱말 퍼즐", params));
    children.push(instructionParagraph(data.word_puzzle.question, params));

    if (data.word_puzzle.type === "matching") {
      // 2-column matching table
      const matchRows = data.word_puzzle.items.map(
        (item) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray } },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: item, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown })] })],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray }, right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray } },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [] })],
              }),
            ],
          })
      );
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: matchRows }));
      children.push(instructionParagraph("선으로 연결하세요!", params));
    } else {
      // fill_blank or initial_sound: item list + writing lines
      for (const item of data.word_puzzle.items) {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: `• ${item}`, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown })],
          })
        );
      }
      children.push(...writingLines(2, params));
    }
  }

  // Writing practice
  if (data.writing_practice_word) {
    children.push(sectionDivider());
    children.push(sectionHeading("✍️ 따라 써봐요", params));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: data.writing_practice_word, font: DOCX_FONTS.primary, size: pt(28), bold: true, color: DOCX_COLORS.coral }),
        ],
      })
    );
    children.push(...writingLines(4, params));
  }

  return children;
}

// ─── Character Card Renderer ───

function renderCharacterCardDocx(
  data: CharacterCardWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  for (let i = 0; i < data.characters.length; i++) {
    const char = data.characters[i];
    if (i > 0) children.push(sectionDivider());

    children.push(sectionHeading(`⭐ ${char.name} (${char.role})`, params));
    children.push(drawingAreaParagraph(char.drawing_prompt, Math.round(60 * params.drawing_space_ratio)));

    // Info table
    const infoBorder = { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray };
    const infoRows: { label: string; value: string }[] = [
      { label: "외모", value: char.appearance },
      { label: "성격", value: char.personality.join(", ") },
      { label: "좋아하는 것", value: char.favorite_thing },
      { label: "감정 키워드", value: char.emotion_keyword },
    ];
    if (char.relationship) {
      infoRows.push({ label: "관계", value: char.relationship });
    }

    const tableRows = infoRows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: { top: infoBorder, bottom: infoBorder, left: infoBorder, right: infoBorder },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark },
              children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: row.label, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), bold: true, color: DOCX_COLORS.brown })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: { top: infoBorder, bottom: infoBorder, left: infoBorder, right: infoBorder },
              children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: row.value, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), color: DOCX_COLORS.brown })] })],
            }),
          ],
        })
    );
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: tableRows }));
  }

  if (data.comparison_question) {
    children.push(sectionDivider());
    children.push(...questionBlock(data.comparison_question, 0, params, 3));
  }

  return children;
}

// ─── Story Map Renderer ───

function renderStoryMapDocx(
  data: StoryMapWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  for (let i = 0; i < data.phases.length; i++) {
    const phase = data.phases[i];
    if (i > 0) {
      // Arrow connector
      const label = data.connection_labels?.[i - 1];
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({
              text: label ? `⬇️ ${label}` : "⬇️",
              font: DOCX_FONTS.primary,
              size: pt(Math.round(params.font_size_body_pt * 0.9)),
              color: DOCX_COLORS.coral,
              bold: true,
            }),
          ],
        })
      );
    }

    children.push(sectionHeading(`${i + 1}. ${phase.phase_name}`, params));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: phase.summary, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown })],
      })
    );
    if (phase.characters_involved.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "등장인물: ", font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), bold: true, color: DOCX_COLORS.brownLight }),
            new TextRun({ text: phase.characters_involved.join(", "), font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), color: DOCX_COLORS.brownLight }),
          ],
        })
      );
    }
    children.push(drawingAreaParagraph(phase.drawing_prompt, Math.round(50 * params.drawing_space_ratio)));
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [new TextRun({ text: `감정: ${phase.emotion_tone}`, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), color: DOCX_COLORS.mintDark, italics: true })],
      })
    );
  }

  if (params.writing_ratio > 0.2) {
    children.push(sectionDivider());
    children.push(sectionHeading("이야기를 다시 말해볼까요?", params));
    children.push(...writingLines(4, params));
  }

  return children;
}

// ─── What-If Renderer ───

function renderWhatIfDocx(
  data: WhatIfWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  // Scenario block
  children.push(sectionHeading(`🤔 만약에... (${data.scenario.character})`, params));
  children.push(instructionParagraph(data.scenario.scene_summary, params));
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 160 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.bgLight },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: DOCX_COLORS.coral, space: 8 } },
      children: [new TextRun({ text: data.scenario.dilemma, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), bold: true, color: DOCX_COLORS.brown })],
    })
  );

  // Perspective questions
  const typeLabels: Record<string, string> = {
    feeling: "💗 감정",
    action: "🏃 행동",
    empathy: "🤝 공감",
    creative: "✨ 상상",
  };

  for (let i = 0; i < data.perspective_questions.length; i++) {
    const q = data.perspective_questions[i];
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 40 },
        children: [new TextRun({ text: typeLabels[q.type] || q.type, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), color: DOCX_COLORS.mintDark, bold: true })],
      })
    );
    children.push(...questionBlock(q.question, i, params));
  }

  // Drawing
  children.push(sectionDivider());
  children.push(sectionHeading("🖍️ 그려볼까요?", params));
  children.push(instructionParagraph(data.drawing_prompt, params));
  children.push(drawingAreaParagraph("자유롭게 그려보세요!", Math.round(60 * params.drawing_space_ratio)));

  // My story
  if (data.my_story_prompt) {
    children.push(sectionDivider());
    children.push(sectionHeading("📝 나의 이야기", params));
    children.push(instructionParagraph(data.my_story_prompt, params));
    children.push(...writingLines(4, params));
  }

  return children;
}

// ─── Speech Bubble Renderer ───

function getBubbleBorder(bubbleType: string) {
  switch (bubbleType) {
    case "thought":
      return { style: BorderStyle.DASHED, size: 6, color: DOCX_COLORS.brownPale };
    case "shout":
      return { style: BorderStyle.SINGLE, size: 12, color: DOCX_COLORS.coral };
    default: // speech
      return { style: BorderStyle.SINGLE, size: 6, color: DOCX_COLORS.lineGray };
  }
}

function getBubbleTypeEmoji(bubbleType: string): string {
  switch (bubbleType) {
    case "thought": return "💭";
    case "shout": return "📢";
    default: return "💬";
  }
}

function getCharacterEmoji(name: string): string {
  const map: Record<string, string> = {
    엄마: "👩", 아빠: "👨", 할머니: "👵", 할아버지: "👴",
    토끼: "🐰", 곰: "🐻", 여우: "🦊", 양: "🐑", 새: "🐦",
    고양이: "🐱", 강아지: "🐶", 사자: "🦁", 요정: "🧚",
  };
  for (const [key, emoji] of Object.entries(map)) {
    if (name.includes(key)) return emoji;
  }
  return "🧒";
}

function renderSpeechBubbleDocx(
  data: SpeechBubbleWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  for (const pair of data.dialogue_pairs) {
    const border = getBubbleBorder(pair.bubble_type);
    const charEmoji = getCharacterEmoji(pair.character);
    const typeEmoji = getBubbleTypeEmoji(pair.bubble_type);

    const charCell = new TableCell({
      width: { size: 20, type: WidthType.PERCENTAGE },
      borders: { top: border, bottom: border, left: border, right: border },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 20 },
          children: [new TextRun({ text: charEmoji, font: DOCX_FONTS.primary, size: pt(18) })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: pair.character, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), bold: true, color: DOCX_COLORS.brown })],
        }),
      ],
    });

    const bubbleContent = pair.is_empty
      ? `${typeEmoji} 여기에 대사를 써보세요!`
      : `${typeEmoji} ${pair.line}`;

    const bubbleBorder = pair.is_empty
      ? { style: BorderStyle.DASHED, size: 6, color: DOCX_COLORS.brownPale }
      : border;

    const bubbleCell = new TableCell({
      width: { size: 80, type: WidthType.PERCENTAGE },
      borders: { top: bubbleBorder, bottom: bubbleBorder, left: bubbleBorder, right: bubbleBorder },
      children: [
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: bubbleContent,
              font: DOCX_FONTS.primary,
              size: pt(params.font_size_body_pt),
              color: pair.is_empty ? DOCX_COLORS.brownPale : DOCX_COLORS.brown,
              italics: pair.is_empty,
              bold: pair.bubble_type === "shout" && !pair.is_empty,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: pair.emotion,
              font: DOCX_FONTS.primary,
              size: pt(Math.round(params.font_size_body_pt * 0.75)),
              color: DOCX_COLORS.brownLight,
              italics: true,
            }),
          ],
        }),
        ...(pair.is_empty ? writingLines(2, params) : []),
      ],
    });

    const cells = pair.position === "right" ? [bubbleCell, charCell] : [charCell, bubbleCell];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [new TableRow({ children: cells })],
      })
    );

    // Spacing between pairs
    children.push(new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }));
  }

  if (data.free_dialogue_prompt) {
    children.push(sectionDivider());
    children.push(sectionHeading("✏️ 나만의 대화 만들기", params));
    children.push(instructionParagraph(data.free_dialogue_prompt, params));
    children.push(drawingAreaParagraph("💬 첫 번째 대사를 써보세요", 30));
    children.push(drawingAreaParagraph("💬 두 번째 대사를 써보세요", 30));
  }

  return children;
}

// ─── Roleplay Script Renderer ───

const SPEAKER_COLORS = [DOCX_COLORS.coral, DOCX_COLORS.mintDark, "6D4C91", DOCX_COLORS.brownLight];

function renderRoleplayScriptDocx(
  data: RoleplayScriptWorksheetOutput,
  params: DerivedParams,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  children.push(instructionParagraph(data.instructions, params));

  // Cast table
  children.push(sectionHeading("🎭 등장인물", params));
  const castBorder = { style: BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.lineGray };
  const castHeaderRow = new TableRow({
    children: [
      new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "이름", font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), bold: true, color: DOCX_COLORS.brown })] })] }),
      new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "역할", font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), bold: true, color: DOCX_COLORS.brown })] })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "👗 의상", font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.85)), bold: true, color: DOCX_COLORS.brown })] })] }),
    ],
  });
  const castDataRows = data.characters_list.map(
    (ch) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: ch.name, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), bold: true, color: DOCX_COLORS.brown })] })] }),
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: ch.role_description, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.9)), color: DOCX_COLORS.brown })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: { top: castBorder, bottom: castBorder, left: castBorder, right: castBorder }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: ch.costume_hint, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.9)), color: DOCX_COLORS.brownLight })] })] }),
        ],
      })
  );
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: [castHeaderRow, ...castDataRows] }));

  // Props
  if (data.props_list.length > 0) {
    children.push(sectionHeading("📦 준비물", params));
    for (const prop of data.props_list) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: `☐ ${prop}`, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown })],
        })
      );
    }
  }

  // Scenes
  for (let i = 0; i < data.scenes.length; i++) {
    const scene = data.scenes[i];
    children.push(sectionDivider());
    children.push(sectionHeading(`🎬 ${scene.scene_title}`, params));

    // Narrator
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 120 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: DOCX_COLORS.creamDark },
        children: [
          new TextRun({ text: `(내레이터) `, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.9)), bold: true, color: DOCX_COLORS.brownLight }),
          new TextRun({ text: scene.narrator_line, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.9)), color: DOCX_COLORS.brown, italics: true }),
        ],
      })
    );

    // Lines
    for (let j = 0; j < scene.lines.length; j++) {
      const line = scene.lines[j];
      const speakerColor = SPEAKER_COLORS[j % SPEAKER_COLORS.length];

      if (line.stage_direction) {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            indent: { left: 400 },
            children: [new TextRun({ text: `(${line.stage_direction})`, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), color: DOCX_COLORS.brownPale, italics: true })],
          })
        );
      }

      const lineChildren = [
        new TextRun({ text: `${line.speaker}: `, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), bold: true, color: speakerColor }),
        new TextRun({ text: `"${line.line}"`, font: DOCX_FONTS.primary, size: pt(params.font_size_body_pt), color: DOCX_COLORS.brown }),
      ];
      if (line.emotion_cue) {
        lineChildren.push(
          new TextRun({ text: ` (${line.emotion_cue})`, font: DOCX_FONTS.primary, size: pt(Math.round(params.font_size_body_pt * 0.8)), color: DOCX_COLORS.brownPale, italics: true })
        );
      }

      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: lineChildren }));
    }
  }

  // Discussion
  if (data.discussion_after) {
    children.push(sectionDivider());
    children.push(sectionHeading("💬 이야기 나누기", params));
    children.push(instructionParagraph(data.discussion_after, params));
    children.push(...writingLines(3, params));
  }

  return children;
}

// ─── Main Export ───

export async function buildWorksheetDocx(
  activityType: ActivityType,
  data: Record<string, unknown>,
  title: string,
  nuriDomain: string,
  params: DerivedParams,
): Promise<Blob> {
  // 1. Build activity-specific content paragraphs
  let contentParagraphs: (Paragraph | Table)[];

  switch (activityType) {
    case "emotion":
      contentParagraphs = renderEmotionDocx(
        data as unknown as EmotionWorksheetOutput,
        params,
      );
      break;
    case "post_reading":
      contentParagraphs = renderPostReadingDocx(
        data as unknown as PostReadingWorksheetOutput,
        params,
      );
      break;
    case "coloring":
      contentParagraphs = renderColoringDocx(
        data as unknown as ColoringWorksheetOutput,
        params,
      );
      break;
    case "vocabulary":
      contentParagraphs = renderVocabularyDocx(
        data as unknown as VocabularyWorksheetOutput,
        params,
      );
      break;
    case "character_card":
      contentParagraphs = renderCharacterCardDocx(
        data as unknown as CharacterCardWorksheetOutput,
        params,
      );
      break;
    case "story_map":
      contentParagraphs = renderStoryMapDocx(
        data as unknown as StoryMapWorksheetOutput,
        params,
      );
      break;
    case "what_if":
      contentParagraphs = renderWhatIfDocx(
        data as unknown as WhatIfWorksheetOutput,
        params,
      );
      break;
    case "speech_bubble":
      contentParagraphs = renderSpeechBubbleDocx(
        data as unknown as SpeechBubbleWorksheetOutput,
        params,
      );
      break;
    case "roleplay_script":
      contentParagraphs = renderRoleplayScriptDocx(
        data as unknown as RoleplayScriptWorksheetOutput,
        params,
      );
      break;
    default:
      throw new Error(`DOCX 빌더 미지원 활동 유형: ${activityType}`);
  }

  // 2. Build header paragraphs
  const subtitle = (data as Record<string, unknown>).subtitle as string ?? "";
  const headerParagraphs = buildHeader(title, subtitle, nuriDomain, params);

  // 3. Assemble Document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: DOCX_FONTS.primary,
            size: pt(params.font_size_body_pt),
            color: DOCX_COLORS.gray,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: DOCX_PAGE.width,
              height: DOCX_PAGE.height,
              orientation: "portrait" as const,
            },
            margin: DOCX_PAGE.margin,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "마마스테일 활동지",
                    font: DOCX_FONTS.primary,
                    size: pt(8),
                    color: DOCX_COLORS.brownPale,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: buildFooter(),
        },
        children: [
          ...headerParagraphs,
          ...contentParagraphs,
        ],
      },
    ],
  });

  // 4. Pack to Blob
  return Packer.toBlob(doc);
}
