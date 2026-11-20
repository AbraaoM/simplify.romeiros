/**
 * PDF de texto simples (PDF 1.4, Helvetica, WinAnsi), sem dependência paga.
 * Serve para listas de passageiros. Não tenta layout gráfico complexo.
 */

const LINES_PER_PAGE = 40;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

export function buildSimplePdf(title: string, lines: string[]): Uint8Array {
  const pages = paginate(lines, LINES_PER_PAGE);
  const objects: string[] = [];
  const offsets: number[] = [0];

  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = 0; // placeholders filled after we know ids
  void fontId;

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontObject = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  pages.forEach((pageLines, pageIndex) => {
    const heading = pageIndex === 0 ? title : `${title} (${pageIndex + 1})`;
    const stream = pageStream(heading, pageLines);
    contentIds.push(
      add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
    );
    pageIds.push(-1);
  });

  const pagesId = add("placeholder");
  const catalogId = add("placeholder");

  const pageObjectIds: number[] = [];
  pages.forEach((_, index) => {
    const id = add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontObject} 0 R >> >> >>`,
    );
    pageObjectIds.push(id);
  });

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(lengthLatin1(output));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = lengthLatin1(output);
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return encodeLatin1(output);
}

function pageStream(title: string, lines: string[]): string {
  const commands = [
    "BT",
    "/F1 14 Tf",
    "50 800 Td",
    `(${pdfString(title)}) Tj`,
    "0 -24 Td",
    "/F1 10 Tf",
  ];
  for (const line of lines) {
    commands.push(`(${pdfString(line)}) Tj`, "0 -16 Td");
  }
  commands.push("ET");
  return commands.join("\n");
}

function paginate(lines: string[], size: number): string[][] {
  if (lines.length === 0) return [[""]];
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    pages.push(lines.slice(index, index + size));
  }
  return pages;
}

function pdfString(value: string): string {
  return winAnsi(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function winAnsi(value: string): string {
  const normalized = value.normalize("NFC");
  let out = "";
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    if (code <= 127 || (code >= 160 && code <= 255)) {
      out += char;
    } else {
      const mapped = ASCII_FALLBACK[char];
      out += mapped ?? "?";
    }
  }
  return out;
}

const ASCII_FALLBACK: Record<string, string> = {
  "–": "-",
  "—": "-",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "…": "...",
};

function encodeLatin1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function lengthLatin1(value: string): number {
  return value.length;
}
