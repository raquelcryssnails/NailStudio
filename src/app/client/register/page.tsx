
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
import { NailStudioLogo } from "@/components/icons/logo";
import { UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addClientFS, getClientsFS } from "@/lib/firebase/firestoreService";
import { auth } from "@/lib/firebase/config"; 
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useSettings } from "@/contexts/SettingsContext";
import { DynamicCopyrightYear } from "@/components/shared/DynamicCopyrightYear";

const registerFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos." }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "Confirmação de senha é obrigatória." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function ClientRegisterPage() {
  const { isClientAuthenticated, isLoadingClient, currentClient, refreshCurrentClient } = useClientAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { salonName } = useSettings();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (isClientAuthenticated && !isLoadingClient && currentClient) {
      router.replace("/client/dashboard");
    }
  }, [isClientAuthenticated, isLoadingClient, currentClient, router]);

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      // Check if email already exists in Firestore clients collection
      const existingClients = await getClientsFS();
      const emailExists = existingClients.some(client => client.email.toLowerCase() === data.email.toLowerCase());

      if (emailExists) {
        toast({
          variant: "destructive",
          title: "E-mail já Cadastrado",
          description: "Este e-mail já pertence a um cliente. Tente fazer login ou use um e-mail diferente.",
        });
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.name });
      
      const clientDataForFirestore = {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        stampsEarned: 0,
        mimosRedeemed: 0,
        purchasedPackages: [],
      };
      await addClientFS(clientDataForFirestore);

      toast({
        title: "Cadastro Realizado com Sucesso!",
        description: "Você será redirecionado para o painel do cliente.",
      });
      
      await refreshCurrentClient(); 

    } catch (error: any) {
      console.error("Client registration error:", error);
      let errorMessage = "Ocorreu um erro durante o cadastro. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este e-mail já está cadastrado na autenticação. Tente fazer login.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Falha no Cadastro",
        description: errorMessage,
      });
    }
  };
  
  if (isLoadingClient && !isClientAuthenticated) { 
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
            Criar Conta de Cliente
          </CardTitle>
          <CardDescription className="font-body text-base text-muted-foreground px-4">
            Junte-se ao {salonName || "NailStudio AI"} e aproveite nossos benefícios!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} className="focus:ring-accent font-body text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seuemail@example.com" {...field} className="focus:ring-accent font-body text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Telefone (com DDD)</FormLabel>
                    <FormControl>
                      <Input placeholder="(XX) XXXXX-XXXX" {...field} className="focus:ring-accent font-body text-base" />
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
                      <Input type="password" placeholder="•••••••• (mínimo 6 caracteres)" {...field} className="focus:ring-accent font-body text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="focus:ring-accent font-body text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full font-body text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                disabled={form.formState.isSubmitting || (isLoadingClient && !currentClient)}
              >
                {form.formState.isSubmitting || (isLoadingClient && !currentClient && !isClientAuthenticated) ? ( 
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                Criar Minha Conta
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center gap-2 pb-8">
            <p className="text-sm font-body text-muted-foreground">
                Já tem uma conta?
            </p>
            <Button variant="link" asChild className="font-body text-primary p-0 h-auto">
                <Link href="/client/login">Faça Login Aqui</Link>
            </Button>
        </CardFooter>
      </Card>
      <DynamicCopyrightYear defaultSalonName={salonName || "NailStudio AI"} />
    </div>
  );
}
