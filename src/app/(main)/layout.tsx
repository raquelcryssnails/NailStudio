
"use client"

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// LucideIcon type is no longer needed for the main nav items
// import type { LucideIcon } from "lucide-react"; 
import {
  PanelLeft,
  Moon,
  Sun,
  LogOut, 
  Loader2, 
} from "lucide-react";

import { NailStudioLogo } from "@/components/icons/logo";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext"; 
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";


// Colorful SVG Icon Components
const DashboardIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Dashboard</title>
    <path fill="#5DADE2" d="M4 18h16v-2H4v2zm0-5h16v-2H4v2zm0-7v2h16V6H4z"/>
  </svg>
);
const AgendaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Agenda</title>
    <path fill="#58D68D" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zM7 12h5v5H7z"/>
  </svg>
);
const AgendaDiariaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Agenda Diária</title>
    <path fill="#88D6C0" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 5h5v2h-5V8zm0 4h5v2h-5v-2zm-2 4H5v-2h5v2zm-2-4H5v-2h5v2zM5 8h5v2H5V8z"/>
  </svg>
);
const ClientesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Clientes</title>
    <path fill="#F5B041" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);
const FidelidadeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Fidelidade</title>
    <path fill="#FF6B6B" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const ProfissionaisIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Profissionais</title>
    <path fill="#4ECDC4" d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
  </svg>
);
const PacotesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Pacotes</title>
    <path fill="#45B7D1" d="M21 16.5c.83 0 1.5-.67 1.5-1.5V6c0-1.1-.9-2-2-2H3.5c-.83 0-1.5.67-1.5 1.5v13.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5v-2.5H21v2.5zM12 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm7 1.5V15H3.5V6H11v2H5.5V15h11V8H13V6h6.5z"/>
  </svg>
);
const ServicosIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Serviços</title>
    <path fill="#FFA07A" d="M9.135 2.425L11.035 0 24 7.49l-2.89 2.17zm11.04-.43L12.315 10.8l-1.503 2.005.86 5.16 4.23 2.54 5.085-6.78zm-11.82 9.895l-1.42-1.42-7.07 7.07 1.41 1.41zm-2.09 6.325l1.42 1.41 7.07-7.07-1.41-1.41z"/>
  </svg>
);
const EstoqueIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Estoque</title>
    <path fill="#9D7FEA" d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h4v2h-4V4zm8 15H4V8h16v11z"/>
  </svg>
);

const FluxoCaixaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Fluxo de Caixa</title>
    <path fill="#FF8C00" d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99zM3 20h18v-2H3v2z"/>
  </svg>
);
const RelatoriosIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Relatórios</title>
    <path fill="hsl(var(--primary))" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-4h2v4zm4 0h-2v-2h2v2zm0-3h-2v-2h2v2zm4 0h-2v-4h2v4z"/>
  </svg>
);
const ConfiguracoesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <title>Configurações</title>
    <path fill="#777777" d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17.59 1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07.49-.12.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
  </svg>
);

interface NavItem {
  href: string;
  icon: (props: { className?: string }) => JSX.Element; // Updated to accept a component
  label: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: DashboardIcon, label: "Dashboard Executivo" },
  { href: "/agenda", icon: AgendaIcon, label: "Agenda Completa" },
  { href: "/agenda-diaria", icon: AgendaDiariaIcon, label: "Agenda Diária" },
  { href: "/clientes", icon: ClientesIcon, label: "Clientes" },
  { href: "/fidelidade", icon: FidelidadeIcon, label: "Fidelidade" },
  { href: "/profissionais", icon: ProfissionaisIcon, label: "Profissionais" },
  { href: "/pacotes", icon: PacotesIcon, label: "Pacotes" },
  { href: "/servicos", icon: ServicosIcon, label: "Serviços" },
  { href: "/estoque", icon: EstoqueIcon, label: "Estoque" },
  { href: "/fluxo-caixa", icon: FluxoCaixaIcon, label: "Fluxo de Caixa" }, 
  { href: "/relatorios", icon: RelatoriosIcon, label: "Relatórios" },
  { href: "/configuracoes", icon: ConfiguracoesIcon, label: "Configurações" },
];


function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isAdmin, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); 

  React.useEffect(() => {
    if (!authIsLoading) {
      if (!currentUser || !isAdmin) {
        if (pathname !== '/login') { 
          router.replace('/login');
        }
      }
    }
  }, [authIsLoading, currentUser, isAdmin, router, pathname]);

  if (authIsLoading || (!currentUser && pathname !== '/login')) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && pathname === '/login') { 
    return <>{children}</>;
  }
  
  if (currentUser && isAdmin) { 
    return <>{children}</>;
  }
  
  return ( 
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}


function MainLayoutContent({ children }: { children: React.ReactNode; }) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile, setOpenMobile } = useSidebar(); 
  const { currentTheme, toggleTheme } = useTheme(); 
  const { userName: settingsUserName, salonTagline, salonLogoUrl } = useSettings(); 
  const { logout, currentUser } = useAuth(); 

  const currentNavItem = navItems.find(item => {
    if (item.href === "/agenda") {
      return pathname === "/agenda";
    }
    // For other items, ensure an exact match or that it's a sub-route of the item's href
    // and not a more specific item. This handles cases like /agenda and /agenda-diaria.
    if (pathname === item.href) return true;
    if (pathname.startsWith(item.href + "/") && 
        !navItems.some(otherItem => otherItem.href.startsWith(item.href + "/") && pathname.startsWith(otherItem.href))
       ) {
      return true;
    }
    // Specific check for /agenda-diaria to be active only for itself
    if (item.href === "/agenda-diaria") {
        return pathname === "/agenda-diaria";
    }
    // Fallback for general startsWith, but prioritize exact matches and more specific sub-routes found above
    if (item.href !== "/agenda" && item.href !== "/agenda-diaria" && pathname.startsWith(item.href)) {
        // Ensure it's not matching a more specific route
        const isMoreSpecificMatch = navItems.some(other => 
            other.href.length > item.href.length && 
            other.href.startsWith(item.href) && 
            pathname.startsWith(other.href)
        );
        if (!isMoreSpecificMatch) return true;
    }
    return false;
  });


  const pageTitle = currentNavItem?.label || "NailStudio AI";
  const PageIconComponent = currentNavItem?.icon;
  
  const displayUserName = currentUser?.displayName || currentUser?.email || settingsUserName;


  const handleMenuButtonClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <React.Fragment> {/* Changed from ProtectedLayout to React.Fragment for direct rendering */}
      <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border shadow-lg bg-sidebar">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div
              className={cn(
                "p-1 rounded-lg flex items-center justify-center",
                "bg-card shadow-sm",
                "h-9 w-9" 
              )}
            >
              {salonLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogoUrl} alt="Salon Logo" className="h-7 w-7 object-contain" />
              ) : (
                <AgendaIcon className="h-7 w-7" />
              )}
            </div>
            <NailStudioLogo className="h-8 w-auto" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="px-2 py-2 mb-1">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/60 font-body">
              MENU PRINCIPAL
            </h2>
          </div>
          <SidebarMenu>
            {navItems.map((item) => {
              let isActive = false;
              if (item.href === "/agenda" || item.href === "/agenda-diaria") { 
                isActive = pathname === item.href;
              } else {
                isActive = pathname.startsWith(item.href);
              }
              const IconComponent = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} onClick={handleMenuButtonClick}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={cn(
                        "group text-sidebar-foreground transition-colors duration-200",
                        isActive
                          ? "data-[active=true]:text-primary data-[active=true]:bg-sidebar-accent" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      tooltip={{children: item.label, className: "font-headline"}}
                    >
                      <div
                        className={cn(
                          "rounded-lg transition-all duration-200 flex items-center justify-center",
                          (sidebarState === 'collapsed' && !isMobile) ? 'w-6 h-6 p-0.5' : 'p-1', 
                           isActive && "animate-heartbeat shadow-none"
                        )}
                      >
                        <IconComponent className={cn(
                          (sidebarState === 'collapsed' && !isMobile) ? 'h-6 w-6' : 'h-7 w-7' 
                        )} />
                      </div>
                      <span className="font-headline text-base">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <Separator className="my-2 bg-sidebar-border" />
        <SidebarFooter className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={currentUser?.photoURL || "https://placehold.co/40x40.png"} alt={displayUserName || "Admin"} data-ai-hint="user avatar beauty"/>
                    <AvatarFallback>{displayUserName ? displayUserName.substring(0,2).toUpperCase() : 'NS'}</AvatarFallback>
                </Avatar>
                {(sidebarState === 'expanded' || isMobile) && (
                  <div>
                      <p className="text-sm font-medium font-headline text-sidebar-foreground">{displayUserName || 'NailStudio AI'}</p>
                      <p className="text-xs text-sidebar-foreground/70 font-body">{salonTagline || 'Beauty Solutions'}</p>
                  </div>
                )}
            </div>
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={logout} className="w-auto text-sidebar-foreground hover:bg-sidebar-accent/20 font-body">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-sidebar-foreground hover:bg-sidebar-accent/20">
                    {currentTheme === 'dark' ? <Sun /> : <Moon /> }
                    <span className="sr-only">Toggle Theme</span>
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center md:hidden">
             <SidebarTrigger /> 
          </div>
          <div className="flex-1 flex items-center gap-3"> 
            {PageIconComponent && (
              <div className="p-2 bg-primary/10 border-2 border-primary/30 rounded-lg shadow-sm flex items-center justify-center">
                <PageIconComponent className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-xl font-semibold font-headline text-gradient">
              {pageTitle}
            </h1>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </div>
      </SidebarInset>
    </React.Fragment>
  );
}


export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultIsMobile = useIsMobile();
 
  return (
    <SettingsProvider>
      <ThemeProvider>
        <SidebarProvider defaultOpen={!defaultIsMobile}>
          <ProtectedLayout>
            <MainLayoutContent>{children}</MainLayoutContent>
          </ProtectedLayout>
        </SidebarProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
