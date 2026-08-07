import { describe, expect, it } from "vitest";
import {
  CUSTOM_BACKGROUND_ATTACHMENT_ID,
  MAX_CUSTOM_BACKGROUND_BYTES,
  parseBackgroundBlur,
  parseBackgroundOpacity,
  parseCustomBackgroundAttachment,
  validateCustomBackgroundFile,
} from "./model";

describe("custom background model", () => {
  it("accepts supported image files within the size limit", () => {
    expect(
      validateCustomBackgroundFile({
        fileName: "background.webp",
        mimeType: "image/webp",
        bytes: new Uint8Array(32),
      }),
    ).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(
      validateCustomBackgroundFile({
        fileName: "background.gif",
        mimeType: "image/gif",
        bytes: new Uint8Array(32),
      }),
    ).toBe("unsupported-type");
    expect(
      validateCustomBackgroundFile({
        fileName: "background.png",
        mimeType: "image/png",
        bytes: new Uint8Array(MAX_CUSTOM_BACKGROUND_BYTES + 1),
      }),
    ).toBe("too-large");
  });

  it("normalizes persisted controls and attachment metadata", () => {
    expect(parseBackgroundOpacity(9)).toBe(1);
    expect(parseBackgroundOpacity(0)).toBe(0.2);
    expect(parseBackgroundBlur(99)).toBe(20);
    expect(
      parseCustomBackgroundAttachment({
        id: CUSTOM_BACKGROUND_ATTACHMENT_ID,
        mimeType: "image/png",
        storageType: "web-indexeddb",
        storageKey: CUSTOM_BACKGROUND_ATTACHMENT_ID,
        createdAt: 1,
      }),
    ).not.toBeNull();
    expect(parseCustomBackgroundAttachment({ id: "other" })).toBeNull();
  });
});
