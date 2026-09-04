"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ interval = 60 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (interval <= 0) return;
    const id = setInterval(() => router.refresh(), interval * 1000);
    return () => clearInterval(id);
  }, [interval, router]);

  return null;
}
