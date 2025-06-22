
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Briefcase, UserPlus, Trash2, Loader2, Percent, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription as DialogPrimitiveDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"; // Renamed DialogDescription to avoid conflict
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogPrimitiveDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Renamed AlertDialogDescription
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { addProfessionalFS, getProfessionalsFS, deleteProfessionalFS } from "@/lib/firebase/firestoreService";
import type { Professional } from "@/types/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const professionalFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Nome do profissional é obrigatório." }),
  specialty: z.string().min(3, { message: "Especialidade é obrigatória." }),
  avatarUrl: z.string().url({ message: "URL do avatar inválida." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(30, "Dica para IA deve ter no máximo 30 caracteres.").optional(),
  commissionRate: z.coerce.number()
    .min(0, "Comissão não pode ser negativa.")
    .max(100, "Comissão não pode exceder 100.")
    .optional()
    .nullable()
    .transform(val => (val === null || val === undefined || isNaN(val)) ? null : val),
});

type ProfessionalFormValues = z.infer<typeof professionalFormSchema>;

const pastelCardColorPalettes = [
  { bg: 'bg-rose-50 dark:bg-rose-800/30', border: 'border-rose-400 dark:border-rose-600', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-50 dark:bg-sky-800/30', border: 'border-sky-400 dark:border-sky-600', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-teal-50 dark:bg-teal-800/30', border: 'border-teal-400 dark:border-teal-600', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-amber-50 dark:bg-amber-800/30', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-violet-50 dark:bg-violet-800/30', border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-lime-50 dark:bg-lime-800/30', border: 'border-lime-400 dark:border-lime-600', text: 'text-lime-700 dark:text-lime-300' },
];


export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = React.useState<Professional[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false); 
  const [editingProfessional, setEditingProfessional] = React.useState<Professional | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [professionalToDeleteId, setProfessionalToDeleteId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      name: "",
      specialty: "",
      avatarUrl: "",
      dataAiHint: "professional person",
      commissionRate: null,
    },
  });

  const fetchProfessionals = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProfessionals = await getProfessionalsFS();
      setProfessionals(fetchedProfessionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      toast({ variant: "destructive", title: "Erro ao buscar profissionais", description: "Não foi possível carregar os dados." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const handleAddNewProfessional = () => {
    setEditingProfessional(null); 
    form.reset({ name: "", specialty: "", avatarUrl: "", dataAiHint: "professional person", commissionRate: null });
    setIsModalOpen(true);
  };

  const handleDeleteProfessional = (profId: string) => {
    setProfessionalToDeleteId(profId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteProfessional = async () => {
    if (professionalToDeleteId) {
      try {
        await deleteProfessionalFS(professionalToDeleteId);
        toast({ title: "Profissional Removido", description: "Os dados do profissional foram removidos." });
        fetchProfessionals();
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover o profissional." });
      }
    }
    setProfessionalToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const onSubmitProfessional = async (data: ProfessionalFormValues) => {
    const professionalData: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      specialty: data.specialty,
      avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png`, 
      dataAiHint: data.dataAiHint || "professional person",
      commissionRate: data.commissionRate,
    };

    try {
      await addProfessionalFS(professionalData);
      toast({ title: "Profissional Adicionado", description: "Novo profissional cadastrado." });
      fetchProfessionals();
      setIsModalOpen(false);
      form.reset();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar os dados." });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
                    <Briefcase className="h-6 w-6" />
                    Equipe de Profissionais
                </CardTitle>
                <CardDescription className="font-body">
                    Gerencie os perfis e especialidades da sua equipe.
                </CardDescription>
            </div>
            <Button onClick={handleAddNewProfessional} className="bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 font-body">
                <UserPlus className="mr-2 h-4 w-4" /> Adicionar Profissional
            </Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 font-body text-muted-foreground">Carregando profissionais...</p>
                </div>
            ) : professionals.length === 0 ? (
                <p className="font-body text-muted-foreground text-center py-8">
                    Nenhum profissional cadastrado. Clique em "Adicionar Profissional" para começar.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professionals.map((prof, index) => {
                    const palette = pastelCardColorPalettes[index % pastelCardColorPalettes.length];
                    return (
                        <Card key={prof.id} className={cn("hover:shadow-md transition-shadow flex flex-col border-2 rounded-lg", palette.bg, palette.border)}>
                            <CardHeader className={cn("pb-3 pt-4", palette.text)}>
                                <CardTitle className="text-xl font-headline">{prof.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4 flex flex-col flex-grow">
                                <p className={cn("font-body text-sm", palette.text, "opacity-80")}>{prof.specialty}</p>
                                {typeof prof.commissionRate === 'number' && (
                                  <div className={cn("mt-2 flex items-center gap-1", palette.text)}>
                                    <Percent className="h-4 w-4 opacity-70" />
                                    <p className="font-body text-xs opacity-90">
                                        Comissão: {prof.commissionRate}%
                                    </p>
                                  </div>
                                )}
                            </CardContent>
                            <CardFooter className={cn("pt-3 border-t mt-auto", palette.border, "border-opacity-50")}>
                                <div className="flex w-full justify-end gap-2">
                                    <Button variant="outline" size="sm" asChild className={cn("font-body text-xs hover:border-primary/50 hover:text-primary/90", palette.border.replace('border-','border-').replace('-400','-500').replace('-600','-700'), palette.text, "hover:bg-opacity-20")}>
                                        <Link href={`/profissionais/${prof.id}`}>
                                            <Eye className="mr-1 h-3.5 w-3.5" /> Ver Detalhes
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteProfessional(prof.id)} title="Remover Profissional" className={cn("font-body text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-700/20")}>
                                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    );
                })}
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          setIsModalOpen(isOpen);
          if (!isOpen) {
            setEditingProfessional(null);
            form.reset();
          }
      }}>
        <DialogContent className="sm:max-w-[480px] bg-card p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-headline text-gradient">Adicionar Novo Profissional</DialogTitle>
            <DialogPrimitiveDescription className="font-body">
              Preencha os dados para cadastrar um novo profissional.
            </DialogPrimitiveDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProfessional)} className="flex flex-col max-h-[80vh]">
              <div className="space-y-4 py-2 px-6 overflow-y-auto flex-grow pr-[calc(1.5rem+8px)]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do profissional" {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Especialidade Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manicure e Nail Designer" {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">URL da Foto de Perfil (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com/foto.png" {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground font-body mt-1">Se não fornecer, um placeholder será usado.</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dataAiHint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Dica para IA (Placeholder)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: woman professional" {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
                       <p className="text-xs text-muted-foreground font-body mt-1">Máximo 2 palavras, para placeholder se URL não for provida ou falhar.</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Percentual de Comissão (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 10 (ou deixe em branco)"
                          {...field}
                          value={field.value === null ? '' : field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              field.onChange(null); 
                            } else {
                              const num = parseFloat(value);
                              field.onChange(isNaN(num) ? null : num);
                            }
                          }}
                          className="focus:ring-accent font-body"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground font-body mt-1">Deixe em branco ou 0 se não aplicável.</p>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4 p-6 border-t border-border mt-auto flex-shrink-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Adicionar Profissional
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-gradient">Confirmar Remoção</AlertDialogTitle>
            <AlertDialogPrimitiveDescription className="font-body">
              Tem certeza que deseja remover este profissional? Esta ação não poderá ser desfeita.
            </AlertDialogPrimitiveDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProfessionalToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProfessional} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    
    
