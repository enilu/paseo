import type { AttachmentMetadata } from "@/attachments/types";

export const CUSTOM_BACKGROUND_ATTACHMENT_ID = "paseo-custom-background";
export const MAX_CUSTOM_BACKGROUND_BYTES = 20 * 1024 * 1024;
export const MIN_BACKGROUND_OPACITY = 0.2;
export const MAX_BACKGROUND_OPACITY = 1;
export const DEFAULT_BACKGROUND_OPACITY = 0.75;
export const MIN_BACKGROUND_BLUR = 0;
export const MAX_BACKGROUND_BLUR = 20;
export const DEFAULT_BACKGROUND_BLUR = 0;

const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface CustomBackgroundFile {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export type CustomBackgroundValidationError = "unsupported-type" | "too-large";

export function validateCustomBackgroundFile(
  file: CustomBackgroundFile,
): CustomBackgroundValidationError | null {
  if (!ACCEPTED_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return "unsupported-type";
  }
  if (file.bytes.byteLength > MAX_CUSTOM_BACKGROUND_BYTES) {
    return "too-large";
  }
  return null;
}

export function parseCustomBackgroundAttachment(value: unknown): AttachmentMetadata | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const attachment = value as Partial<AttachmentMetadata>;
  if (
    attachment.id !== CUSTOM_BACKGROUND_ATTACHMENT_ID ||
    typeof attachment.mimeType !== "string" ||
    typeof attachment.storageType !== "string" ||
    typeof attachment.storageKey !== "string" ||
    typeof attachment.createdAt !== "number"
  ) {
    return null;
  }
  if (
    attachment.storageType !== "web-indexeddb" &&
    attachment.storageType !== "desktop-file" &&
    attachment.storageType !== "native-file"
  ) {
    return null;
  }
  return attachment as AttachmentMetadata;
}

export function parseBackgroundOpacity(value: unknown): number | null {
  return parseClampedNumber(value, MIN_BACKGROUND_OPACITY, MAX_BACKGROUND_OPACITY);
}

export function parseBackgroundBlur(value: unknown): number | null {
  return parseClampedNumber(value, MIN_BACKGROUND_BLUR, MAX_BACKGROUND_BLUR);
}

function parseClampedNumber(value: unknown, min: number, max: number): number | null {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.min(max, Math.max(min, numeric));
}
