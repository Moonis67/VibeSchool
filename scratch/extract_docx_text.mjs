import fs from "node:fs";

const xmlPath = process.argv[2] || "scratch/fyp2_template_xml/word/document.xml";
const xml = fs.readFileSync(xmlPath, "utf8");

const decode = (value) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const paragraphs = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
  .map((match) => {
    const paragraph = match[0];
    const text = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((textMatch) => decode(textMatch[1]))
      .join("");
    return text.replace(/\s+/g, " ").trim();
  })
  .filter(Boolean);

paragraphs.forEach((paragraph, index) => {
  console.log(`${String(index + 1).padStart(4, "0")} ${paragraph}`);
});
