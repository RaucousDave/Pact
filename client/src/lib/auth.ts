import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { session, useSession } from "./session";

export interface Credentials {
  email: string;
  password: string;
}
export interface Registration extends Credentials {
  display_name: string;
  handle: string;
}
interface AuthResponse {
  token: string;
  handle: string;
  public_key: string;
}
export interface Creator {
  id: number;
  email: string;
  handle: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

export interface ProfileUpdate {
  display_name?: string;
  bio?: string;
}

export const isValidHandle = (handle: string) =>
  /^[a-z0-9_]{3,20}$/.test(handle) &&
  !["admin", "api", "dashboard", "login", "register", "account", "preview", "onboarding", "signup", "auth", "assets"].includes(handle);

export function useAuth(mode: "signup" | "login") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (details: Registration | Credentials) => {
      const { data } = await api.post<AuthResponse>(
        `/auth/${mode === "signup" ? "register" : "login"}`,
        details,
        {
          // Registration funds a wallet and establishes its USDC trustline.
          timeout: mode === "signup" ? 120_000 : 20_000,
        },
      );
      if (!data.token) throw new Error("Missing authentication token");
      return data;
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: ["creator"] });
      session.set(data.token);
    },
  });
}

export function useCreator() {
  const token = useSession();
  return useQuery({
    queryKey: ["creator", token],
    queryFn: async ({ signal }) =>
      (await api.get<Creator>("/users/me", { signal })).data,
    enabled: !!token,
  });
}

export function useProfileUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: ProfileUpdate) =>
      (await api.patch<Creator>("/users/me", profile)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator"] }),
  });
}

export function useAvatarUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (
        await api.post<{ avatar_url: string }>("/users/me/avatar", form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 35_000,
        })
      ).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator"] }),
  });
}

export function useHandleAvailability(handle: string) {
  return useQuery({
    queryKey: ["handle-availability", handle],
    queryFn: async ({ signal }) =>
      (
        await api.post<{ available: boolean; handle: string }>(
          "/auth/check-handle",
          { handle },
          { signal },
        )
      ).data,
    enabled: isValidHandle(handle),
    staleTime: 10_000,
  });
}
