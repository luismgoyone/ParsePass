/**
 * Measure extraction accuracy on your own resumes, with whichever provider is configured.
 * For each PDF/DOCX in a folder: extract the text, structure it with the model, and run the
 * honesty check. Prints a per-file summary; nothing is written or stored.
 *
 *   pnpm eval:extract ~/Desktop/resumes          # uses .env.local (GEMINI_API_KEY or ANTHROPIC_API_KEY)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";

import { diagnose } from "@/lib/ats/checks";
import { extractDocx } from "@/lib/ats/extract-docx";
import { extractPdf } from "@/lib/ats/extract-pdf";
import { extractResume } from "@/lib/extraction";
import { activeProvider } from "@/lib/extraction/provider";
import { checkHonesty } from "@/lib/resume/honesty";

// @next/env is CommonJS; this is how Next itself loads .env.local.
nextEnv.loadEnvConfig(process.cwd());

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: pnpm eval:extract <folder of .pdf/.docx resumes>");
  process.exit(1);
}
const provider = activeProvider();
if (!provider) {
  console.error("Set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local first.");
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /\.(pdf|docx)$/i.test(f));
console.log(`Provider: ${provider} · ${files.length} resumes in ${dir}\n`);

let clean = 0;
for (const file of files) {
  const bytes = new Uint8Array(readFileSync(join(dir, file)));
  const doc = file.toLowerCase().endsWith(".pdf")
    ? await extractPdf(bytes, file)
    : await extractDocx(bytes, file);
  const started = Date.now();
  try {
    const { resume, model, usage } = await extractResume(doc.sourceText, doc.links);
    const { flags, totals } = checkHonesty(resume, doc.sourceText);
    const t = (k: keyof typeof totals) => `${totals[k].verified}/${totals[k].checked}`;
    if (flags.length === 0) clean++;
    console.log(
      `${flags.length === 0 ? "PASS" : "FLAG"}  ${file}  (${model}, ${((Date.now() - started) / 1000).toFixed(1)}s, ${usage.inputTokens}+${usage.outputTokens} tokens, ATS score before ${diagnose(doc).score})`,
    );
    console.log(
      `      roles ${resume.experience.length} · companies ${t("company")} · titles ${t("title")} · dates ${t("date")} · skills ${t("skill")} · numbers ${t("number")}`,
    );
    for (const f of flags) console.log(`      ! ${f.path}: ${f.value}`);
  } catch (error) {
    console.log(`ERROR ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`\n${clean}/${files.length} resumes structured with nothing flagged.`);
