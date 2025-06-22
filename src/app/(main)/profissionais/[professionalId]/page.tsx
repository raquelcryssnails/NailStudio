
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getProfessionalFS, updateProfessionalFS, getAppointmentsFS, getServicesFS } from "@/lib/firebase/firestoreService";
import type { Professional, Appointment, SalonService } from "@/types/firestore";
import { Loader2, ArrowLeft, Edit3, Briefcase, DollarSign, Percent, CalendarDays, User, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const fallbackAvatarText = (name: string) => name ? name.substring(0, 2).toUpperCase() : "NS";

export default function ProfessionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const professionalId = params.professionalId as string;
  const { toast } = useToast();

  const [professional, setProfessional] = React.useState<Professional | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [services, setServices] = React.useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showServicesPerformed, setShowServicesPerformed] = React.useState(false);

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

  const fetchProfessionalDetails = React.useCallback(async () => {
    if (!professionalId) return;
    setIsLoading(true);
    try {
      const [profData, apptsData, servicesData] = await Promise.all([
        getProfessionalFS(professionalId),
        getAppointmentsFS(),
        getServicesFS(),
      ]);

      if (profData) {
        setProfessional(profData);
        form.reset({
          id: profData.id,
          name: profData.name,
          specialty: profData.specialty,
          avatarUrl: profData.avatarUrl || "",
          dataAiHint: profData.dataAiHint || "professional person",
          commissionRate: profData.commissionRate === undefined ? null : profData.commissionRate,
        });

        const professionalAppointments = apptsData.filter(
          (apt) => apt.professionalId === professionalId && apt.status === "Concluído"
        );
        setAppointments(professionalAppointments);
        setServices(servicesData);

      } else {
        toast({ variant: "destructive", title: "Erro", description: "Profissional não encontrado." });
        router.push("/profissionais");
      }
    } catch (error) {
      console.error("Error fetching professional details:", error);
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Não foi possível buscar os detalhes do profissional." });
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, toast, router, form]);

  React.useEffect(() => {
    fetchProfessionalDetails();
  }, [fetchProfessionalDetails]);

  const onSubmitEditProfessional = async (data: ProfessionalFormValues) => {
    if (!professional || !professional.id) return;

    const professionalData: Partial<Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>> = {
      name: data.name,
      specialty: data.specialty,
      avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png`,
      dataAiHint: data.dataAiHint || "professional person",
      commissionRate: data.commissionRate,
    };

    try {
      await updateProfessionalFS(professional.id, professionalData);
      toast({ title: "Profissional Atualizado", description: "Os dados foram atualizados com sucesso." });
      setIsEditModalOpen(false);
      fetchProfessionalDetails(); // Re-fetch to update display
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar as alterações." });
    }
  };

  const getServiceNameById = (serviceId: string): string => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço Desconhecido";
  };

  const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return "R$ 0,00";
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numValue)) return "R$ N/A";
    return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const totalServicesValue = React.useMemo(() => {
    return appointments.reduce((sum, apt) => {
        const amount = apt.totalAmount ? parseFloat(apt.totalAmount.replace(',', '.')) : 0;
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [appointments]);

  const totalCommissionValue = React.useMemo(() => {
    if (!professional || typeof professional.commissionRate !== 'number' || professional.commissionRate <= 0) {
      return 0;
    }
    return appointments.reduce((sum, apt) => {
      const amount = apt.totalAmount ? parseFloat(apt.totalAmount.replace(',', '.')) : 0;
      const commission = isNaN(amount) ? 0 : (amount * (professional.commissionRate! / 100));
      return sum + (isNaN(commission) ? 0 : commission);
    }, 0);
  }, [appointments, professional]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="font-body text-muted-foreground">Profissional não encontrado.</p>
        <Button onClick={() => router.push("/profissionais")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button onClick={() => router.push("/profissionais")} variant="outline" className="mb-6 font-body">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista de Profissionais
      </Button>

      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={professional.avatarUrl || undefined} alt={professional.name} data-ai-hint={professional.dataAiHint || "professional person"} />
              <AvatarFallback>{fallbackAvatarText(professional.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-headline text-3xl text-gradient">{professional.name}</CardTitle>
              <CardDescription className="font-body text-md text-muted-foreground">{professional.specialty}</CardDescription>
              {typeof professional.commissionRate === 'number' && (
                <div className="mt-1 flex items-center text-sm text-green-600 dark:text-green-400">
                  <Percent className="mr-1 h-4 w-4" />
                  <span>Comissão: {professional.commissionRate}%</span>
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)} className="font-body">
            <Edit3 className="mr-2 h-4 w-4" /> Editar Perfil
          </Button>
        </CardHeader>
      </Card>

      <Card className="shadow-md rounded-xl">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                    <Briefcase className="h-5 w-5"/> Resumo de Desempenho
                </CardTitle>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowServicesPerformed(!showServicesPerformed)}
                    className="font-body text-sm"
                >
                    {showServicesPerformed ? "Ocultar" : "Mostrar"} Serviços Realizados
                </Button>
            </div>
            <CardDescription className="font-body">
              Valores totais e comissões baseados nos serviços concluídos.
            </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
                <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-sm text-blue-700 dark:text-blue-300">Valor Total dos Serviços</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold font-headline text-blue-700 dark:text-blue-300">{formatCurrency(totalServicesValue)}</p>
                </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-sm text-green-700 dark:text-green-300">Comissão Total Estimada</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold font-headline text-green-700 dark:text-green-300">{formatCurrency(totalCommissionValue)}</p>
                </CardContent>
            </Card>
        </CardContent>
        {showServicesPerformed && (
            <CardFooter className="pt-4 border-t">
            {appointments.length > 0 ? (
                <div className="w-full">
                    <h3 className="font-headline text-md text-muted-foreground mb-2">Serviços Concluídos por {professional.name}:</h3>
                    <div className="max-h-96 overflow-y-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="font-body text-xs"><CalendarDays className="inline mr-1 h-3.5 w-3.5"/>Data</TableHead>
                            <TableHead className="font-body text-xs"><Users className="inline mr-1 h-3.5 w-3.5"/>Cliente</TableHead>
                            <TableHead className="font-body text-xs"><Briefcase className="inline mr-1 h-3.5 w-3.5"/>Serviço(s)</TableHead>
                            <TableHead className="font-body text-xs text-right"><DollarSign className="inline mr-1 h-3.5 w-3.5"/>Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {appointments.map(apt => (
                            <TableRow key={apt.id}>
                                <TableCell className="font-body text-xs whitespace-nowrap">{format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                <TableCell className="font-body text-xs">{apt.clientName}</TableCell>
                                <TableCell className="font-body text-xs">{apt.serviceIds.map(id => getServiceNameById(id)).join(", ")}</TableCell>
                                <TableCell className="font-body text-xs text-right">{formatCurrency(apt.totalAmount)}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <p className="font-body text-sm text-muted-foreground text-center w-full py-4">Nenhum serviço concluído encontrado para este profissional.</p>
            )}
            </CardFooter>
        )}
      </Card>

      {/* Edit Professional Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-headline text-gradient">Editar Perfil de {professional.name}</DialogTitle>
            <DialogDescription className="font-body">
              Altere os dados do profissional abaixo.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEditProfessional)} className="flex flex-col max-h-[80vh]">
              <div className="space-y-4 py-2 px-6 overflow-y-auto flex-grow pr-[calc(1.5rem+8px)]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} className="focus:ring-accent font-body"/>
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
                        <Input {...field} className="focus:ring-accent font-body"/>
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
                      <FormLabel className="font-body">URL da Foto de Perfil</FormLabel>
                      <FormControl>
                        <Input {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
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
                        <Input {...field} className="focus:ring-accent font-body"/>
                      </FormControl>
                      <FormMessage />
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
                          placeholder="Ex: 10"
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
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4 p-6 border-t border-border mt-auto flex-shrink-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


    