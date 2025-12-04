import { NextRequest, NextResponse } from "next/server";
import { generateSyllabusChain } from "@/infrastructure/ai/chains";

// Set runtime ke 'edge' jika menggunakan model ringan,
// tapi untuk LangChain komplek disarankan 'nodejs' (default) agar stabil.
// Kecuali Anda deploy ke Vercel Edge functions, biarkan default.
export const maxDuration = 60; // Timeout 60 detik (Penting untuk AI generation)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topik wajib diisi dan harus berupa teks." },
        { status: 400 },
      );
    }

    // Panggil Logic LangChain di Infrastructure Layer
    const data = await generateSyllabusChain(topic);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API] Generate Syllabus Error:", error);

    // Error handling yang aman
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
