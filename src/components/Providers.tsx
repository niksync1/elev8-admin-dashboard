"use client";

import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  const [qc] = useState(() => queryClient);

  return (
    <QueryClientProvider client={qc}>
      {children}
    </QueryClientProvider>
  );
}