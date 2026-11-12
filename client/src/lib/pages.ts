import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useSession } from "./session";
import type { CreatorPage } from "./page-model";

export function useMyPage() {
  const token = useSession();
  return useQuery({
    queryKey: ["creator-page", token],
    queryFn: async ({ signal }) => (await api.get<CreatorPage>("/users/me/page", { signal })).data,
    enabled: !!token,
  });
}

export async function uploadPageAsset(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image under 5MB.");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
  const form = new FormData();
  form.append("file", file);
  return (await api.post<{ url: string }>("/users/me/page/assets", form, {
    headers: { "Content-Type": "multipart/form-data" }, timeout: 35_000,
  })).data.url;
}
