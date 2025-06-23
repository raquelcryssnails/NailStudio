"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2 } from "lucide-react";

/**
 * This page acts as a smart entry point for the /client route.
 * It redirects users to the appropriate page based on their authentication status.
 * - If logged in, redirects to /client/dashboard.
 * - If not logged in, redirects to /client/login.
 */
export default function ClientRootPage() {
  const { isClientAuthenticated, isLoadingClient } = useClientAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Wait until the authentication status is determined
    if (!isLoadingClient) {
      if (isClientAuthenticated) {
        router.replace("/client/dashboard");
      } else {
        router.replace("/client/login");
      }
    }
  }, [isClientAuthenticated, isLoadingClient, router]);

  // Display a loader while the redirect is being determined
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 font-body text-muted-foreground">Carregando portal do cliente...</p>
    </div>
  );
}
