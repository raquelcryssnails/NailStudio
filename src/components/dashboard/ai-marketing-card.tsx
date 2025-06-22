
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, Loader2, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateInstagramPost, type GenerateInstagramPostInput } from "@/ai/flows/generate-instagram-post";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSettings } from "@/contexts/SettingsContext";

const formSchema = z.object({
  serviceDescription: z.string().min(10, { message: "Descreva o serviço com pelo menos 10 caracteres." }).max(500),
  targetAudience: z.string().min(5, { message: "Descreva o público alvo." }).max(100),
  desiredTone: z.enum(["Amigável", "Profissional", "Divertido", "Luxuoso"]),
});

type FormValues = z.infer<typeof formSchema>;

export function AiMarketingCard() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedPost, setGeneratedPost] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { toast } = useToast();
  const { salonName } = useSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceDescription: "",
      targetAudience: "Mulheres entre 25-45 anos que buscam serviços de beleza de alta qualidade.",
      desiredTone: "Amigável",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setGeneratedPost("");
    try {
      const input: GenerateInstagramPostInput = {
        ...data,
        salonName: salonName || "NailStudio AI",
      };
      const result = await generateInstagramPost(input);
      setGeneratedPost(result.instagramPost);
    } catch (error) {
      console.error("Error generating Instagram post:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar post",
        description: "Não foi possível gerar o post. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPost = () => {
    navigator.clipboard.writeText(generatedPost);
    toast({
      title: "Post Copiado!",
      description: "O conteúdo do post foi copiado para a área de transferência.",
    });
  };
  
  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      form.reset();
      setGeneratedPost("");
    }
  };


  return (
    <Card className="shadow-xl rounded-xl overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-gradient">Marketing com IA</CardTitle>
        </div>
        <CardDescription className="font-body">
          Gere posts criativos para o Instagram do seu salão com o poder da Inteligência Artificial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 font-body">
          Clique no botão abaixo para criar um post personalizado sobre seus serviços, promoções ou novidades.
        </p>
      </CardContent>
      <CardFooter>
        <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-opacity duration-200 shadow-md">
              <Sparkles className="mr-2 h-4 w-4" /> Gerar Post do Instagram
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] bg-card rounded-lg shadow-2xl p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="font-headline text-2xl text-gradient">Criar Post para Instagram</DialogTitle>
              <DialogDescription className="font-body">
                Preencha os detalhes abaixo para a IA gerar um post incrível para você.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
                <div className="flex-grow overflow-y-auto px-6 py-2 space-y-6">
                  <FormField
                    control={form.control}
                    name="serviceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-headline text-card-foreground">Descrição do Serviço/Promoção</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: Nova coleção de esmaltes em gel com 20% de desconto esta semana!"
                            className="resize-none focus:ring-accent font-body"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetAudience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-headline text-card-foreground">Público Alvo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Mulheres modernas que amam unhas perfeitas" {...field} className="focus:ring-accent font-body"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desiredTone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-headline text-card-foreground">Tom da Mensagem</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="focus:ring-accent font-body">
                              <SelectValue placeholder="Selecione o tom" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Amigável" className="font-body">Amigável & Convidativo</SelectItem>
                            <SelectItem value="Profissional" className="font-body">Profissional & Elegante</SelectItem>
                            <SelectItem value="Divertido" className="font-body">Divertido & Descontraído</SelectItem>
                            <SelectItem value="Luxuoso" className="font-body">Luxuoso & Exclusivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {generatedPost && (
                    <div className="space-y-2">
                      <Label htmlFor="generatedPostOutput" className="font-headline text-card-foreground">Post Gerado:</Label>
                      <div className="relative">
                      <Textarea
                        id="generatedPostOutput"
                        readOnly
                        value={generatedPost}
                        className="bg-muted/50 border-muted-foreground/30 h-40 resize-none font-body"
                        rows={6}
                      />
                      <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopyPost}>
                          <Copy className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 border-t border-border mt-auto flex-shrink-0">
                   <DialogClose asChild>
                    <Button type="button" variant="outline" className="font-body">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-body">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {generatedPost ? "Gerar Novamente" : "Gerar Post"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

