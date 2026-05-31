"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function YearError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    router.replace("/app");
  }, [error, router]);

  return null;
}
