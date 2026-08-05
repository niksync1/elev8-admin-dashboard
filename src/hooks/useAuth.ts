"use client";

import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const supabase = getBrowserClient();

export function useLogin() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    setUser(data.user);
    router.push("/dashboard");
  };
}

export function useLogout() {
  const { clearUser } = useAuthStore();
  const router = useRouter();

  return async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/");
  };
}

export function useSession() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  const init = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser(data.session.user);
    } else {
      setLoading(false);
    }
  };

  return { user, loading, init };
}