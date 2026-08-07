import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AttachmentMetadata } from "@/attachments/types";

interface CustomBackgroundState {
  attachment: AttachmentMetadata | null;
  url: string | null;
}

const CustomBackgroundContext = createContext<CustomBackgroundState>({
  attachment: null,
  url: null,
});

export function CustomBackgroundProvider({
  attachment,
  url,
  children,
}: CustomBackgroundState & { children: ReactNode }) {
  const value = useMemo(() => ({ attachment, url }), [attachment, url]);
  return (
    <CustomBackgroundContext.Provider value={value}>{children}</CustomBackgroundContext.Provider>
  );
}

export function useCustomBackground(): CustomBackgroundState {
  return useContext(CustomBackgroundContext);
}
