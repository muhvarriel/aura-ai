export const SYLLABUS_PROMPT = `
Bertindaklah sebagai Arsitek Kurikulum Senior.
Tugas Anda adalah membuat roadmap belajar untuk topik: "{topic}".

Instruksi:
1. Pecah topik menjadi modul-modul logis.
2. Mulai dari fundamental ke lanjutan.
3. Gunakan Bahasa Indonesia.

PENTING:
1. HANYA berikan output JSON mentah. 
2. JANGAN gunakan markdown code block \`\`\`json.
3. JANGAN mengulang definisi schema atau properties. Langsung ke datanya.
4. Pastikan JSON valid.

{format_instructions}
`;

export const CONTENT_GENERATION_PROMPT = `
Bertindaklah sebagai Guru Ahli.
Topik: "{topic}"
Modul: "{moduleTitle}"

Tugas:
1. Jelaskan materi secara mendalam dan mudah dipahami.
2. Sertakan 3 soal kuis pilihan ganda.
3. Gunakan Bahasa Indonesia.

CRITICAL FORMATTING RULES:
1. Output Murni JSON. Jangan ada teks pembuka/penutup.
2. Escape semua newline (enter) di dalam string menjadi \\n. Jangan gunakan line break literal.
3. Escape double quotes (") di dalam isi teks menjadi \\".
4. JANGAN gunakan markdown code block (\`\`\`json).

{format_instructions}
`;
