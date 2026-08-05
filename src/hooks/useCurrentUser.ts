"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";

export function useCurrentUser() {
  const [role, setRole] = useState<"warehouse" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const supabase = getBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) setRole(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.warn(error.message);
          if (mounted) setRole(null);
          return;
        }

        if (mounted) setRole(data.role as "warehouse" | "admin");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { role, isLoading };
}