
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NailStudioLogo } from "@/components/icons/logo";
import { LogIn, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres." }), // Firebase default min password length
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { login, currentUser, isAdmin, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (!authIsLoading && currentUser && isAdmin) {
      router.replace("/dashboard");
    }
  }, [currentUser, isAdmin, authIsLoading, router]);


  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data.email, data.password);
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
        description: "Redirecionando para o painel...",
      });
      // Redirection is handled by onAuthStateChanged or the effect above
    }
  };

  if (authIsLoading && !currentUser) { // Show loader only if loading initial auth state
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 font-body text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }
  
  if (!authIsLoading && currentUser && isAdmin) { // If already authenticated as admin, show loader while redirecting
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 font-body text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="items-center text-center space-y-3">
          <NailStudioLogo className="h-16 w-auto mb-2" />
          <CardTitle className="font-headline text-3xl text-gradient">
            Acesso Administrador
          </CardTitle>
          <CardDescription className="font-body text-base">
            Painel de gestão do NailStudio AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                        placeholder="admin@nailstudio.ai"
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
                    <FormLabel className="font-body">Senha</FormLabel>
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
              <Button type="submit" className="w-full font-body text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting || authIsLoading}>
                {form.formState.isSubmitting || authIsLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Entrar
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center block mt-4 pb-6">
            <p className="text-xs text-muted-foreground font-body">
                Certifique-se de que o usuário admin foi criado no Firebase Authentication.
            </p>
        </CardFooter>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground font-body">
        © {new Date().getFullYear()} NailStudio AI. Todos os direitos reservados.
      </p>
    </div>
  );
}
