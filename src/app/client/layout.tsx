
"use client";

import * as React from "react";
import Link from "next/link";
import { NailStudioLogo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { ClientAuthProvider, useClientAuth } from "@/contexts/ClientAuthContext";
import { LogOut, Loader2, Home, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext"; // Import global SettingsProvider

// Define public paths for client area that do not require authentication
const PUBLIC_CLIENT_PATHS = ['/client/login', '/client/register', '/client/forgot-password'];

function ClientAreaContent({ children }: { children: React.ReactNode }) {
  const { isClientAuthenticated, clientLogout, isLoadingClient, currentClient, currentAuthUser } = useClientAuth();
  const { salonName } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoadingClient) {
      if (!isClientAuthenticated && !PUBLIC_CLIENT_PATHS.includes(pathname)) {
        router.replace('/client/login');
      } else if (isClientAuthenticated && PUBLIC_CLIENT_PATHS.includes(pathname)) {
        // If authenticated and on a public page (login/register/forgot), redirect to dashboard
        router.replace('/client/dashboard');
      }
    }
  }, [isLoadingClient, isClientAuthenticated, pathname, router]);

  if (isLoadingClient && !PUBLIC_CLIENT_PATHS.includes(pathname)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const showHeaderAndFooter = isClientAuthenticated && currentAuthUser && !PUBLIC_CLIENT_PATHS.includes(pathname);
  const clientDisplayName = currentClient?.name || currentAuthUser?.email || "Cliente";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {showHeaderAndFooter && (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/client/dashboard" className="flex items-center gap-2">
              <NailStudioLogo className="h-10 w-auto" />
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
               <Link href="/client/dashboard" passHref>
                  <Button variant={pathname === "/client/dashboard" ? "secondary" : "ghost"} size="sm" className="font-body text-sm hidden sm:inline-flex items-center">
                    <Home className="mr-1.5 h-4 w-4"/> Painel
                  </Button>
               </Link>
               <div className="flex items-center gap-1 text-sm text-muted-foreground font-body hidden md:flex">
                <UserCircle className="h-4 w-4" />
                <span>{clientDisplayName}</span>
               </div>
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={clientLogout}
                  className="font-body text-sm"
                >
                  <LogOut className="mr-1.5 h-4 w-4" /> Sair
                </Button>
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">
        {/* Render children only if loading is complete OR if it's a public page */}
        {(PUBLIC_CLIENT_PATHS.includes(pathname) || !isLoadingClient) ? children : (
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
             {/* This loader will show if not a public path and still loading */}
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}
      </main>
      {(PUBLIC_CLIENT_PATHS.includes(pathname) && !isClientAuthenticated) && (
         <footer className="py-6 text-center text-xs text-muted-foreground font-body">
            {salonName || "NailStudio AI"} - Portal do Cliente
        </footer>
      )}
       {showHeaderAndFooter && (
         <footer className="py-6 text-center text-xs text-muted-foreground font-body border-t border-border">
            {salonName || "NailStudio AI"} - Seu espaço de beleza e bem-estar.
        </footer>
      )}
    </div>
  );
}


export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthProvider>
        <ClientAreaContent>{children}</ClientAreaContent>
    </ClientAuthProvider>
  );
}
