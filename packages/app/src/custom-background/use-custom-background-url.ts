import { useAttachmentPreviewUrl } from "@/attachments/use-attachment-preview-url";
import type { AttachmentMetadata } from "@/attachments/types";

export function useCustomBackgroundUrl(attachment: AttachmentMetadata | null): string | null {
  return useAttachmentPreviewUrl(attachment);
}
