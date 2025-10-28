import fs from "fs";
import { Document, Packer, Paragraph, TextRun } from "docx";

const inputPath = "/workspace/transcripts/mcconaughey_bartlett_near_verbatim.txt";
const outputPath = "/workspace/transcripts/mcconaughey_bartlett_near_verbatim.docx";

const input = fs.readFileSync(inputPath, "utf8");
const lines = input.split(/\r?\n/);

const children = [];
for (const line of lines) {
  if (line.trim() === "") {
    children.push(new Paragraph(""));
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun(line)],
      })
    );
  }
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log(`Wrote DOCX to ${outputPath}`);
