export const SYLLABUS_PROMPT = `
Bertindaklah sebagai Arsitek Kurikulum Senior.
Tugas: Buat roadmap belajar untuk topik "{topic}".

Instruksi:
1. Buat 5-6 modul pembelajaran (maksimal 6 modul)
2. Urut dari fundamental ke advanced
3. Setiap modul punya 3-5 sub-topik
4. Gunakan Bahasa Indonesia yang jelas

PENTING TENTANG TITLE MODUL:
- Title harus DESKRIPTIF dan INFORMATIF (minimal 10 karakter)
- JANGAN gunakan singkatan seperti "M1", "M2", "Modul 1"
- Gunakan nama yang menjelaskan isi modul

Contoh title yang BAGUS:
✅ "Fundamental Investasi Saham"
✅ "Analisis Teknikal untuk Pemula"
✅ "Strategi Diversifikasi Portfolio"

Contoh title yang BURUK (JANGAN GUNAKAN):
❌ "M1" - terlalu singkat
❌ "Modul 1" - tidak deskriptif
❌ "Dasar" - terlalu umum

OUTPUT FORMAT - SANGAT PENTING:
1. HANYA output JSON murni, tidak ada teks lain
2. Format JSON COMPACT artinya: satu baris, tanpa indentasi, tanpa newline antar property
   (BUKAN memendekkan isi text/content!)
3. JANGAN gunakan markdown code block (\`\`\`json atau \`\`\`)
4. Mulai langsung dengan {{ dan akhiri dengan }}
5. Pastikan JSON LENGKAP (tidak terpotong)
6. Semua string value SATU BARIS (no newline di dalam string)

Contoh output YANG BENAR (compact JSON structure, tapi content tetap descriptive):
{{"courseTitle":"Investasi Saham untuk Pemula","overview":"Pelajari dasar-dasar investasi saham hingga strategi advanced","modules":[{{"title":"Fundamental Investasi Saham","description":"Memahami konsep dasar investasi saham dan cara kerjanya","difficulty":"Beginner","estimatedTime":"15 Menit","subTopics":["Apa itu saham","Cara kerja pasar saham","Jenis-jenis saham"]}}]}}

{format_instructions}
`;

export const CONTENT_GENERATION_PROMPT = `
Bertindaklah sebagai Guru Ahli yang berpengalaman.
Topik Kursus: "{topic}"
Modul yang Sedang Diajarkan: "{moduleTitle}"

Tugas:
1. Jelaskan materi secara mendalam, terstruktur, dan mudah dipahami
2. Gunakan format Markdown untuk konten (heading, bold, list, code)
3. Buat 3 soal kuis pilihan ganda yang menguji pemahaman
4. Bahasa Indonesia yang profesional

OUTPUT FORMAT - SANGAT PENTING:
1. HANYA output JSON murni, tidak ada teks pembuka/penutup
2. Format JSON COMPACT artinya: minimal whitespace, satu baris JSON structure
   (BUKAN memendekkan isi materi!)
3. JANGAN gunakan markdown wrapper (\`\`\`json atau \`\`\`)
4. Mulai dengan {{ dan akhiri dengan }}
5. Untuk "markdownContent": 
   - Gunakan escape sequence \\n untuk newline (JANGAN line break literal)
   - Contoh: "# Judul\\n\\nParagraf pertama.\\n\\n## Sub-judul"
   - Materi harus LENGKAP dan DETAIL (jangan disingkat)
6. Untuk semua string lain: HARUS satu baris (no line breaks)
7. Pastikan JSON LENGKAP dan tidak terpotong

Contoh output YANG BENAR (compact structure, detailed content):
{{"title":"Fundamental Investasi Saham","markdownContent":"# Fundamental Investasi Saham\\n\\nInvestasi saham adalah **kegiatan membeli** kepemilikan perusahaan melalui bursa efek.\\n\\n## Konsep Dasar\\n\\nAda beberapa hal penting yang perlu dipahami:\\n\\n- **Dividen**: Keuntungan perusahaan yang dibagikan\\n- **Capital Gain**: Keuntungan dari kenaikan harga\\n\\n## Risiko Investasi\\n\\nSetiap investasi memiliki risiko...","quiz":[{{"question":"Apa itu dividen dalam investasi saham?","options":[{{"id":"a","text":"Keuntungan dari kenaikan harga saham","isCorrect":false}},{{"id":"b","text":"Bagian keuntungan perusahaan yang dibagikan kepada pemegang saham","isCorrect":true}},{{"id":"c","text":"Biaya transaksi jual beli saham","isCorrect":false}},{{"id":"d","text":"Pajak atas keuntungan saham","isCorrect":false}}],"explanation":"Dividen adalah bagian dari keuntungan perusahaan yang dibagikan kepada pemegang saham sebagai imbal hasil investasi."}}]}}

{format_instructions}
`;
