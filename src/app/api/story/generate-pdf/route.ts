import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { StoryPDFDocument } from "@/lib/pdf/generator";
import { z } from "zod";

const pdfRequestSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      title: z.string(),
      text: z.string(),
      imagePrompt: z.string().optional(),
    })
  ),
  title: z.string().optional(),
  authorName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pdfRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid story data" },
        { status: 400 }
      );
    }

    const { scenes, title, authorName } = parsed.data;

    const pdfBuffer = await renderToBuffer(
      StoryPDFDocument({
        title: title || "나의 치유 동화",
        scenes,
        authorName: authorName || "어머니",
        createdAt: new Date().toLocaleDateString("ko-KR"),
      })
    );

    const uint8 = new Uint8Array(pdfBuffer);
    return new Response(uint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mamastale-story.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
