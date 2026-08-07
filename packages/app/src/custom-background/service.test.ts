import { afterEach, describe, expect, it } from "vitest";
import { collectRetainedAttachmentIds } from "@/attachments/gc-retention";
import { __setAttachmentStoreForTests } from "@/attachments/store";
import type { AttachmentMetadata, AttachmentStore } from "@/attachments/types";
import { CUSTOM_BACKGROUND_ATTACHMENT_ID } from "./model";
import {
  removeReplacedCustomBackground,
  saveCustomBackground,
  syncCustomBackgroundGarbageCollectionRetention,
} from "./service";

function createAttachment(storageKey: string): AttachmentMetadata {
  return {
    id: CUSTOM_BACKGROUND_ATTACHMENT_ID,
    mimeType: storageKey.endsWith(".jpg") ? "image/jpeg" : "image/png",
    storageType: "desktop-file",
    storageKey,
    createdAt: 1,
  };
}

function createStore(deletedKeys: string[]): AttachmentStore {
  return {
    storageType: "desktop-file",
    async save(input) {
      return createAttachment(`C:/cache/${input.id}.png`);
    },
    async encodeBase64() {
      return "";
    },
    async resolvePreviewUrl() {
      return "file:///preview";
    },
    async delete({ attachment }) {
      deletedKeys.push(attachment.storageKey);
    },
    async garbageCollect() {},
  };
}

describe("custom background service", () => {
  afterEach(() => {
    syncCustomBackgroundGarbageCollectionRetention(true);
    __setAttachmentStoreForTests(null);
  });

  it("persists the background with its stable retained id", async () => {
    const deletedKeys: string[] = [];
    __setAttachmentStoreForTests(createStore(deletedKeys));

    const attachment = await saveCustomBackground({
      fileName: "background.png",
      mimeType: "image/png",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(attachment.id).toBe(CUSTOM_BACKGROUND_ATTACHMENT_ID);
  });

  it("deletes the previous local file when replacement changes storage paths", async () => {
    const deletedKeys: string[] = [];
    __setAttachmentStoreForTests(createStore(deletedKeys));

    await removeReplacedCustomBackground(
      createAttachment("C:/cache/paseo-custom-background.png"),
      createAttachment("C:/cache/paseo-custom-background.jpg"),
    );

    expect(deletedKeys).toEqual(["C:/cache/paseo-custom-background.png"]);
  });

  it("releases garbage-collection retention when no background is configured", () => {
    syncCustomBackgroundGarbageCollectionRetention(false);
    expect(collectRetainedAttachmentIds()).not.toContain(CUSTOM_BACKGROUND_ATTACHMENT_ID);

    syncCustomBackgroundGarbageCollectionRetention(true);
    expect(collectRetainedAttachmentIds()).toContain(CUSTOM_BACKGROUND_ATTACHMENT_ID);
  });
});
