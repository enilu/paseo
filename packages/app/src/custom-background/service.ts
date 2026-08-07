import { retainAttachmentForGarbageCollection } from "@/attachments/gc-retention";
import { deleteAttachments, persistAttachmentFromBytes } from "@/attachments/service";
import type { AttachmentMetadata } from "@/attachments/types";
import { CUSTOM_BACKGROUND_ATTACHMENT_ID, type CustomBackgroundFile } from "./model";

let releaseGarbageCollectionRetention: (() => void) | null = retainAttachmentForGarbageCollection(
  CUSTOM_BACKGROUND_ATTACHMENT_ID,
);

export function syncCustomBackgroundGarbageCollectionRetention(enabled: boolean): void {
  if (enabled && !releaseGarbageCollectionRetention) {
    releaseGarbageCollectionRetention = retainAttachmentForGarbageCollection(
      CUSTOM_BACKGROUND_ATTACHMENT_ID,
    );
    return;
  }
  if (!enabled && releaseGarbageCollectionRetention) {
    releaseGarbageCollectionRetention();
    releaseGarbageCollectionRetention = null;
  }
}

export async function saveCustomBackground(
  file: CustomBackgroundFile,
): Promise<AttachmentMetadata> {
  return await persistAttachmentFromBytes({
    id: CUSTOM_BACKGROUND_ATTACHMENT_ID,
    bytes: file.bytes,
    mimeType: file.mimeType,
    fileName: file.fileName,
  });
}

export async function removeCustomBackground(attachment: AttachmentMetadata | null): Promise<void> {
  await deleteAttachments(attachment ? [attachment] : undefined);
}

export async function removeReplacedCustomBackground(
  previous: AttachmentMetadata | null,
  next: AttachmentMetadata,
): Promise<void> {
  if (
    !previous ||
    (previous.storageType === next.storageType && previous.storageKey === next.storageKey)
  ) {
    return;
  }
  await deleteAttachments([previous]);
}
