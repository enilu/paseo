/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttachmentMetadata, AttachmentStore } from "@/attachments/types";
import { __setAttachmentStoreForTests } from "./store";
import { useAttachmentPreviewUrl } from "./use-attachment-preview-url";

function createAttachment(createdAt: number): AttachmentMetadata {
  return {
    id: "shared-id",
    mimeType: "image/png",
    storageType: "web-indexeddb",
    storageKey: "shared-key",
    createdAt,
  };
}

function createStore(overrides: Partial<AttachmentStore> = {}): AttachmentStore {
  return {
    storageType: "web-indexeddb",
    async save() {
      return createAttachment(1);
    },
    async encodeBase64() {
      return "";
    },
    async resolvePreviewUrl({ attachment }) {
      return `blob:${attachment.createdAt}`;
    },
    async releasePreviewUrl() {},
    async delete() {},
    async garbageCollect() {},
    ...overrides,
  };
}

describe("useAttachmentPreviewUrl", () => {
  afterEach(() => {
    __setAttachmentStoreForTests(null);
  });

  it("releases a URL that resolves after the hook is unmounted", async () => {
    let resolveUrl: (url: string) => void = () => undefined;
    const releasePreviewUrl = vi.fn(async () => undefined);
    const resolvePreviewUrl = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveUrl = resolve;
        }),
    );
    __setAttachmentStoreForTests(
      createStore({
        resolvePreviewUrl,
        releasePreviewUrl,
      }),
    );

    const { unmount } = renderHook(() => useAttachmentPreviewUrl(createAttachment(1)));
    await waitFor(() => expect(resolvePreviewUrl).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      resolveUrl("blob:late");
    });

    await waitFor(() =>
      expect(releasePreviewUrl).toHaveBeenCalledWith({
        attachment: createAttachment(1),
        url: "blob:late",
      }),
    );
  });

  it("refreshes the URL when fixed attachment storage is overwritten", async () => {
    const releasePreviewUrl = vi.fn(async () => undefined);
    const resolvePreviewUrl = vi.fn(
      async ({ attachment }: { attachment: AttachmentMetadata }) => `blob:${attachment.createdAt}`,
    );
    __setAttachmentStoreForTests(createStore({ resolvePreviewUrl, releasePreviewUrl }));

    const { result, rerender } = renderHook(
      ({ attachment }) => useAttachmentPreviewUrl(attachment),
      { initialProps: { attachment: createAttachment(1) } },
    );
    await waitFor(() => expect(result.current).toBe("blob:1"));

    rerender({ attachment: createAttachment(2) });
    await waitFor(() => expect(result.current).toBe("blob:2"));

    expect(resolvePreviewUrl).toHaveBeenCalledTimes(2);
    expect(releasePreviewUrl).toHaveBeenCalledWith({
      attachment: createAttachment(1),
      url: "blob:1",
    });
  });
});
