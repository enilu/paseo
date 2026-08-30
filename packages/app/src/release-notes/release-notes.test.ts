import { describe, expect, test } from "vitest";
import { RELEASE_NOTES, releaseNoteText } from "./release-notes";

describe("release notes", () => {
  test("keeps intentional releases unique and newest first", () => {
    expect(RELEASE_NOTES.map((release) => release.id)).toEqual(["jiaxing-2026-08-30"]);
    expect(new Set(RELEASE_NOTES.map((release) => release.id)).size).toBe(RELEASE_NOTES.length);
    expect(RELEASE_NOTES[0]?.features).toHaveLength(8);
  });

  test("uses Chinese only for Chinese locales", () => {
    const text = { en: "Release notes", zhCN: "版本记录" };
    expect(releaseNoteText(text, "zh-CN")).toBe("版本记录");
    expect(releaseNoteText(text, "en-US")).toBe("Release notes");
    expect(releaseNoteText(text, "ja-JP")).toBe("Release notes");
  });
});
