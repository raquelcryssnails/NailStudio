
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
import { useToast } from "@/hooks/use-toast";
import { NailStudioLogo } from "@/components/icons/logo";
import { MailQuestion, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/config"; 
import { sendPasswordResetEmail } from "firebase/auth";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { DynamicCopyrightYear } from "@/components/shared/DynamicCopyrightYear";

const forgotPasswordFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export default function ClientForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isClientAuthenticated, isLoadingClient, currentClient } = useClientAuth();
  const { salonName } = useSettings();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    if (isClientAuthenticated && !isLoadingClient && currentClient) {
      router.replace("/client/dashboard");
    }
  }, [isClientAuthenticated, isLoadingClient, currentClient, router]);

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "E-mail de Redefinição Enviado",
        description: "Verifique sua caixa de entrada (e spam) para o link de redefinição de senha.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Forgot password error:", error);
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nenhuma conta encontrada com este e-mail.";
      }
      toast({
        variant: "destructive",
        title: "Falha ao Enviar E-mail",
        description: errorMessage,
      });
    }
  };
  
  if (isLoadingClient && !currentClient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl border border-border">
        <CardHeader className="items-center text-center space-y-3 pt-8">
          <NailStudioLogo className="h-14 w-auto mb-1" />
          <CardTitle className="font-headline text-3xl text-gradient">
            Recuperar Senha
          </CardTitle>
          <CardDescription className="font-body text-base text-muted-foreground px-4">
            Insira seu e-mail para enviarmos um link de redefinição.
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
                    <FormLabel className="font-body">E-mail de Cadastro</FormLabel>
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
              <Button 
                type="submit" 
                className="w-full font-body text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <MailQuestion className="mr-2 h-5 w-5" />
                )}
                Enviar Link de Redefinição
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center gap-2 pb-8">
            <p className="text-sm font-body text-muted-foreground">
                Lembrou sua senha?
            </p>
            <Button variant="link" asChild className="font-body text-primary p-0 h-auto">
                <Link href="/client/login">Voltar para Login</Link>
            </Button>
        </CardFooter>
      </Card>
      <DynamicCopyrightYear defaultSalonName={salonName || "NailStudio AI"} />
    </div>
  );
}
