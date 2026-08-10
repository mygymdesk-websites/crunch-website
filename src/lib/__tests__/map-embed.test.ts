import { describe, expect, it } from "vitest";

import { mapEmbedSrc } from "../location-format";

/**
 * What people actually paste into the map field.
 *
 * Google's "Embed a map" tab gives you a full `<iframe>` snippet, so that is
 * what lands in the box. Rendering that as an iframe's src makes the browser
 * resolve it as a relative path, which loads the site inside its own map
 * frame — the failure looked like "the map shows the website".
 */

const IFRAME =
  '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12" width="600" ' +
  'height="450" style="border:0;" allowfullscreen="" loading="lazy" ' +
  'referrerpolicy="no-referrer-when-downgrade"></iframe>';

describe("mapEmbedSrc", () => {
  it("pulls the src out of a pasted iframe snippet", () => {
    expect(mapEmbedSrc(IFRAME)).toBe(
      "https://www.google.com/maps/embed?pb=!1m18!1m12",
    );
  });

  it("accepts a bare embed URL unchanged", () => {
    const url = "https://www.google.com/maps/embed?pb=!1m18";
    expect(mapEmbedSrc(url)).toBe(url);
  });

  it("handles single quotes and odd spacing in the snippet", () => {
    expect(
      mapEmbedSrc("<iframe  loading='lazy'  src='https://google.com/maps/embed?pb=1'></iframe>"),
    ).toBe("https://google.com/maps/embed?pb=1");
  });

  it("rejects a share link, which is not an embed", () => {
    // This one is the trap: it looks right, and it renders a consent page
    // rather than a map. It belongs in the map LINK field instead.
    expect(mapEmbedSrc("https://maps.app.goo.gl/33Hd661qEar791Ze9")).toBeNull();
  });

  it("rejects a non-Google host", () => {
    // This value becomes the src of a frame on a public page, so anything
    // unexpected fails closed rather than embedding an arbitrary site.
    expect(mapEmbedSrc('<iframe src="https://example.com/maps/embed?x=1">')).toBeNull();
  });

  it("rejects a Google URL that is not an embed path", () => {
    expect(mapEmbedSrc("https://www.google.com/search?q=gym")).toBeNull();
  });

  it("treats blank and malformed input as no map", () => {
    expect(mapEmbedSrc("")).toBeNull();
    expect(mapEmbedSrc(null)).toBeNull();
    expect(mapEmbedSrc(undefined)).toBeNull();
    expect(mapEmbedSrc("not a url at all")).toBeNull();
  });
});
