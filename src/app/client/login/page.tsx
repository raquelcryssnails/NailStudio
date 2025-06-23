
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2, UserPlus, Heart } from "lucide-react"; 
import { useRouter } from "next/navigation";
import Link from "next/link"; 
import { useSettings } from "@/contexts/SettingsContext";
import { DynamicCopyrightYear } from "@/components/shared/DynamicCopyrightYear";
import { cn } from "@/lib/utils";

const clientLoginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres." }),
});

type ClientLoginFormValues = z.infer<typeof clientLoginFormSchema>;

export default function ClientLoginPage() {
  const { loginClient, isClientAuthenticated, isLoadingClient, currentClient } = useClientAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { salonName, clientLoginTitle, clientLoginDescription } = useSettings();

  const form = useForm<ClientLoginFormValues>({
    resolver: zodResolver(clientLoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (isClientAuthenticated && !isLoadingClient && currentClient) {
      router.replace("/client/dashboard");
    }
  }, [isClientAuthenticated, isLoadingClient, currentClient, router]);

  const onSubmit = async (data: ClientLoginFormValues) => {
    const result = await loginClient(data.email, data.password);
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: result.error || "Ocorreu um erro. Tente novamente.",
      });
      form.resetField("password");
    } else {
      toast({
        title: "Login Bem-sucedido!",
        description: "Redirecionando para o seu painel...",
      });
    }
  };

  if (isLoadingClient && !currentClient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 font-body text-muted-foreground">
          Verificando...
        </p>
      </div>
    );
  }

  if (!isLoadingClient && isClientAuthenticated && currentClient) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 font-body text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl border border-border bg-animated-gradient">
        <CardHeader className="items-center text-center space-y-2 pt-8">
            <Heart className="h-10 w-10 text-primary animate-slow-pulse mb-2" />
            <CardTitle className="font-headline text-3xl text-gradient px-4 text-center">
                {clientLoginTitle || "Portal do Cliente"}
            </CardTitle>
            <CardDescription className="font-body text-base text-muted-foreground px-4 !mt-4">
                {clientLoginDescription || "Acesse para acompanhar seus selos de fidelidade e muito mais!"}
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seuemail@example.com"
                        {...field}
                        className="focus:ring-accent font-body text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-baseline">
                        <FormLabel className="font-body">Senha</FormLabel>
                        <Button variant="link" asChild className="text-xs font-body text-primary p-0 h-auto -mb-1">
                            <Link href="/client/forgot-password">Esqueceu a senha?</Link>
                        </Button>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="focus:ring-accent font-body text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit"
                className="w-full font-body text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                disabled={form.formState.isSubmitting || isLoadingClient}
              >
                {form.formState.isSubmitting || (isLoadingClient && !currentClient) ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Entrar
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center gap-2 pb-8">
            <p className="text-sm font-body text-muted-foreground">
                Não tem uma conta?
            </p>
            <Button variant="outline" asChild className="font-body border-primary text-primary hover:bg-primary/5">
                <Link href="/client/register">
                    <UserPlus className="mr-2 h-4 w-4" /> Criar Conta Agora
                </Link>
            </Button>
        </CardFooter>
      </Card>
      
      <DynamicCopyrightYear defaultSalonName={salonName || "Raquel Cryss Nails Design"} />
    </div>
  );
}

