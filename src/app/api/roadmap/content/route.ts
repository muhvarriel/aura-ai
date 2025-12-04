import { NextRequest, NextResponse } from "next/server";
import { generateLearningContentChain } from "@/infrastructure/ai/chains";

export const maxDuration = 60; // Timeout 60 detik

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, moduleTitle } = body;

    if (!topic || !moduleTitle) {
      return NextResponse.json(
        { error: "Topik dan Judul Modul wajib diisi." },
        { status: 400 },
      );
    }

    // Panggil Logic LangChain
    const data = await generateLearningContentChain(topic, moduleTitle);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API] Generate Content Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
