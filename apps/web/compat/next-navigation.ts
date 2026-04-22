"use client";

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: useCallback((href: string) => navigate(href), [navigate]),
    replace: useCallback((href: string) => navigate(href, { replace: true }), [navigate]),
    back: useCallback(() => navigate(-1), [navigate]),
    forward: useCallback(() => navigate(1), [navigate]),
    refresh: useCallback(() => window.location.reload(), []),
    prefetch: async () => undefined,
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}
