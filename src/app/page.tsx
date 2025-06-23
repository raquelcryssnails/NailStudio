
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NailStudioLogo } from "@/components/icons/logo";
import { ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { DynamicCopyrightYear } from "@/components/shared/DynamicCopyrightYear";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-lg text-center shadow-xl rounded-xl border border-border">
        <CardHeader className="items-center space-y-3 pt-10">
          <NailStudioLogo className="h-16 w-auto mb-2" />
          <CardTitle className="font-headline text-4xl text-gradient">
            Bem-vindo(a) ao NailStudio AI
          </CardTitle>
          <CardDescription className="font-body text-lg text-muted-foreground px-4 !mt-4">
            Selecione como você gostaria de acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 pb-10 px-8">
          {/* Admin Card */}
          <Link href="/login" passHref>
            <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full flex flex-col justify-between border-primary/20 hover:border-primary/50">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-full mb-3">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-headline text-xl text-primary">
                  Acesso Administrador
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Acesso restrito, somente Administradores podem acessar.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Client Card */}
          <Link href="/client/login" passHref>
            <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full flex flex-col justify-between border-accent/20 hover:border-accent/50">
              <CardHeader className="items-center">
                <div className="p-3 bg-accent/10 rounded-full mb-3">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-headline text-xl text-accent">
                  Portal do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Para visualizar seu histórico, agendamentos e programa de fidelidade.
                </p>
              </CardContent>
            </Card>
          </Link>
        </CardContent>
      </Card>
      <DynamicCopyrightYear />
    </div>
  );
}
