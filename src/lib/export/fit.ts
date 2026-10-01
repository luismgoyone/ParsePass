import type { ExtractedDoc } from "@/lib/ats/types";

import type { Density } from "./pdf-document";

export interface Fitted {
  density: Density;
  bytes: Uint8Array;
  /** The rendered PDF, read back with the ATS extractor. */
  doc: ExtractedDoc;
}

/**
 * Render at standard density; only if that runs past one page, try compact and keep whichever
 * has fewer pages. Standard wins ties, so nobody gets smaller text for no gain.
 */
export async function fitToOnePage(
  render: (density: Density) => Promise<Uint8Array>,
  extract: (bytes: Uint8Array) => Promise<ExtractedDoc>,
): Promise<Fitted> {
  const standardBytes = await render("standard");
  const standard: Fitted = {
    density: "standard",
    bytes: standardBytes,
    doc: await extract(standardBytes),
  };
  if (standard.doc.pageCount <= 1) return standard;

  const compactBytes = await render("compact");
  const compact: Fitted = {
    density: "compact",
    bytes: compactBytes,
    doc: await extract(compactBytes),
  };
  return compact.doc.pageCount < standard.doc.pageCount ? compact : standard;
}
