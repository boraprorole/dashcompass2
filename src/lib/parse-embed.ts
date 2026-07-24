// Safely extract iframe attributes from a user-pasted embed snippet.
// We never render raw HTML — we render a controlled <iframe> using only the
// fields we extract (src, width, height). Only https URLs are accepted.

export type ParsedEmbed = {
  src: string;
  width?: string;
  height?: string;
};

function getAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  return m?.[2] ?? m?.[3];
}

export function parseEmbed(input: string | null | undefined): ParsedEmbed | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If user pasted only a URL, accept it directly.
  if (/^https:\/\/\S+$/i.test(trimmed)) {
    return { src: trimmed };
  }

  const iframeMatch = trimmed.match(/<iframe\b[^>]*>/i);
  if (!iframeMatch) return null;

  const tag = iframeMatch[0];
  const src = getAttr(tag, "src");
  if (!src || !/^https:\/\//i.test(src)) return null;

  return {
    src,
    width: getAttr(tag, "width"),
    height: getAttr(tag, "height"),
  };
}
