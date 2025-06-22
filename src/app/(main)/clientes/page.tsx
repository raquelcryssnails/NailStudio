
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Users, UserPlus, Search, Edit3, Trash2, Eye, Gift, Heart, Circle, PlusSquare, RotateCcw, Loader2, History, ShoppingBag, Star, MessageSquare, PackagePlus, Tag, Mail, Package as PackageIcon, Award, Save, PawPrint, Repeat, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { addClientFS, getClientsFS, updateClientFS, deleteClientFS, getAppointmentsFS, getServicesFS, getPackagesFS, getClientFS, addFinancialTransactionFS, addAppointmentFS, getProfessionalsFS, updateAppointmentFS } from "@/lib/firebase/firestoreService";
import type { Client, Appointment, SalonPackage, ClientPackageInstance, ClientPackageServiceItem, SalonService, Professional } from "@/types/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO, eachWeekOfInterval, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const clientFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Formato de e-mail inválido." }).toLowerCase(),
  phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos." }),
  stampsEarned: z.coerce.number().int().min(0, "Selos não podem ser negativos.").optional(),
  mimosRedeemed: z.coerce.number().int().min(0, "Mimos resgatados não podem ser negativos.").optional(),
  purchasedPackages: z.array(z.any()).optional(), 
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const recurringAppointmentSchema = z.object({
    serviceIds: z.array(z.string()).nonempty({ message: "Selecione pelo menos um serviço." }),
    professionalId: z.string().min(1, { message: "Selecione um profissional." }),
    dayOfWeek: z.coerce.number().min(0).max(6),
    startTime: z.string().min(1, { message: "Horário de início é obrigatório." }),
    endTime: z.string().min(1, { message: "Horário de término é obrigatório." }),
    endDate: z.date({ required_error: "Data final é obrigatória." }),
}).refine(data => {
    if (!data.startTime || !data.endTime) return true;
    const start = parseInt(data.startTime.replace(":", ""), 10);
    const end = parseInt(data.endTime.replace(":", ""), 10);
    return end > start;
}, {
    message: "Horário de término deve ser após o horário de início.",
    path: ["endTime"],
});

type RecurringAppointmentFormValues = z.infer<typeof recurringAppointmentSchema>;


const stampsNeededForHeart = 3;
const heartsNeededForMimo = 1;
const totalStampsOnCard = 12;

const cardColorPalettes = [
  { bg: 'bg-pink-50 dark:bg-pink-900/30', border: 'border-pink-500', accentBg: 'bg-pink-500' },
  { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-500', accentBg: 'bg-blue-500' },
  { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-500', accentBg: 'bg-green-500' },
  { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-500', accentBg: 'bg-yellow-500' },
  { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-500', accentBg: 'bg-purple-500' },
  { bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-500', accentBg: 'bg-indigo-500' },
  { bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-500', accentBg: 'bg-teal-500' },
];

interface SoldPackageToDeleteDetails {
  clientId: string;
  packageInstanceIndex: number;
  packageName: string;
  paidPrice: string;
}

const weekDays = [
    { label: "Domingo", value: 0 },
    { label: "Segunda-feira", value: 1 },
    { label: "Terça-feira", value: 2 },
    { label: "Quarta-feira", value: 3 },
    { label: "Quinta-feira", value: 4 },
    { label: "Sexta-feira", value: 5 },
    { label: "Sábado", value: 6 },
];

export default function ClientesPage() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [availablePackages, setAvailablePackages] = React.useState<SalonPackage[]>([]);
  const [availableServices, setAvailableServices] = React.useState<SalonService[]>([]);
  const [professionalsList, setProfessionalsList] = React.useState<Professional[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [clientToDeleteId, setClientToDeleteId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("dados");
  const [selectedPackageToSell, setSelectedPackageToSell] = React.useState<string>("");
  const [isUpdatingFidelity, setIsUpdatingFidelity] = React.useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = React.useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = React.useState<string | null>(null);
  
  const [isDeleteSoldPackageConfirmOpen, setIsDeleteSoldPackageConfirmOpen] = React.useState(false);
  const [soldPackageToDeleteDetails, setSoldPackageToDeleteDetails] = React.useState<SoldPackageToDeleteDetails | null>(null);


  const { toast } = useToast();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      stampsEarned: 0,
      mimosRedeemed: 0,
      purchasedPackages: [],
    },
  });

  const recurringForm = useForm<RecurringAppointmentFormValues>({
      resolver: zodResolver(recurringAppointmentSchema),
      defaultValues: {
        serviceIds: [],
        professionalId: "",
        dayOfWeek: 1, // Default to Monday
        startTime: "",
        endTime: "",
        endDate: addDays(new Date(), 90),
      }
  });


  const fetchAllData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedClients, fetchedAppointments, fetchedPackages, fetchedServices, fetchedProfessionals] = await Promise.all([
        getClientsFS(),
        getAppointmentsFS(),
        getPackagesFS(), 
        getServicesFS(),
        getProfessionalsFS(),
      ]);
      setClients(fetchedClients);
      setAppointments(fetchedAppointments);
      setAvailablePackages(fetchedPackages.filter(p => p.status === "Ativo"));
      setAvailableServices(fetchedServices);
      setProfessionalsList(fetchedProfessionals);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar todos os dados necessários." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  React.useEffect(() => {
    if (editingClient) {
      form.reset({
        id: editingClient.id,
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        stampsEarned: editingClient.stampsEarned || 0,
        mimosRedeemed: editingClient.mimosRedeemed || 0,
        purchasedPackages: editingClient.purchasedPackages || [],
      });
      recurringForm.reset();
      setSelectedPackageToSell("");
    } else {
      form.reset({ name: "", email: "", phone: "", stampsEarned: 0, mimosRedeemed: 0, purchasedPackages: [] });
    }
  }, [editingClient, form, recurringForm]);

  const handleAddNewClient = () => {
    setEditingClient(null);
    setActiveTab("dados");
    setIsModalOpen(true);
  };

  const handleOpenClientModal = (client: Client) => {
    setEditingClient(client);
    setActiveTab("dados");
    setIsModalOpen(true);
  };
  
  const handleDeleteClient = (clientId: string) => {
    setClientToDeleteId(clientId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (clientToDeleteId) {
      try {
        await deleteClientFS(clientToDeleteId);
        toast({ title: "Cliente Removido", description: "O cliente foi removido com sucesso." });
        fetchAllData();
      } catch (error) {
        console.error("Error deleting client:", error);
        toast({ variant: "destructive", title: "Erro ao remover cliente", description: "Não foi possível remover o cliente." });
      }
    }
    setClientToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const onSubmitClient = async (data: ClientFormValues) => {
    const clientDataToSave: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      stampsEarned: data.stampsEarned || 0,
      mimosRedeemed: data.mimosRedeemed || 0,
      purchasedPackages: editingClient?.purchasedPackages || [], 
    };

    try {
      if (editingClient && editingClient.id) {
        await updateClientFS(editingClient.id, clientDataToSave);
        toast({ title: "Cliente Atualizado", description: `${data.name} foi atualizado com sucesso.` });
      } else {
        const newClient = await addClientFS(clientDataToSave);
        toast({ title: "Cliente Adicionado", description: `${data.name} adicionado com sucesso.` });
        setEditingClient(newClient); 
      }
      fetchAllData();
    } catch (error) {
      console.error("Error saving client:", error);
      toast({ variant: "destructive", title: "Erro ao salvar cliente", description: "Não foi possível salvar os dados do cliente." });
    }
  };

  const handleSaveFidelityChanges = async () => {
    if (!editingClient || !editingClient.id) return;
    setIsUpdatingFidelity(true);
    try {
      const dataToSave = {
        stampsEarned: form.getValues('stampsEarned') || 0,
        mimosRedeemed: form.getValues('mimosRedeemed') || 0,
      };
      await updateClientFS(editingClient.id, dataToSave);
      setEditingClient(prev => prev ? { ...prev, ...dataToSave } : null);
      toast({ title: "Fidelidade Atualizada", description: `Dados de fidelidade de ${editingClient.name} salvos.` });
      fetchAllData(); 
    } catch (error) {
      console.error("Error saving fidelity changes:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar Fidelidade", description: "Não foi possível salvar as alterações de fidelidade." });
    } finally {
      setIsUpdatingFidelity(false);
    }
  };


  const handleSellPackageToClient = async () => {
    if (!editingClient || !editingClient.id || !selectedPackageToSell) {
      toast({ variant: "destructive", title: "Seleção Inválida", description: "Selecione um cliente e um pacote para vender." });
      return;
    }

    const pkgDetails = availablePackages.find(p => p.id === selectedPackageToSell);
    if (!pkgDetails) {
      toast({ variant: "destructive", title: "Pacote não encontrado", description: "O pacote selecionado não foi encontrado." });
      return;
    }

    const purchaseDate = new Date();
    const expiryDate = addDays(purchaseDate, pkgDetails.validityDays || 90);
    const purchaseDateFormatted = format(purchaseDate, "yyyy-MM-dd");

    const newClientPackage: ClientPackageInstance = {
      packageId: pkgDetails.id,
      packageName: pkgDetails.name,
      purchaseDate: purchaseDateFormatted,
      expiryDate: format(expiryDate, "yyyy-MM-dd"),
      services: pkgDetails.services.map(s => ({
        serviceId: s.serviceId,
        totalQuantity: s.quantity,
        remainingQuantity: s.quantity,
      })),
      status: 'Ativo',
      originalPrice: pkgDetails.originalPrice,
      paidPrice: pkgDetails.price,
    };

    const updatedPurchasedPackages = [...(editingClient.purchasedPackages || []), newClientPackage];

    try {
      await updateClientFS(editingClient.id, { purchasedPackages: updatedPurchasedPackages });
      toast({ title: "Pacote Vendido!", description: `Pacote "${pkgDetails.name}" vendido para ${editingClient.name}.` });
      
      await addFinancialTransactionFS({
        description: `Venda Pacote: ${pkgDetails.name} - Cliente: ${editingClient.name}`,
        amount: pkgDetails.price.replace(',', '.'),
        date: purchaseDateFormatted,
        category: "Venda de Pacote",
        type: "income"
      });
      toast({ title: "Receita Registrada", description: `Entrada de R$ ${pkgDetails.price} registrada no caixa.`});


      const refreshedClient = await getClientFS(editingClient.id);
      if (refreshedClient) {
        setEditingClient(refreshedClient);
        form.setValue("purchasedPackages", refreshedClient.purchasedPackages || []);

        const currentStamps = refreshedClient.stampsEarned || 0;
        if (currentStamps < totalStampsOnCard) {
          const newStampCount = currentStamps + 1;
          try {
            await updateClientFS(refreshedClient.id!, { stampsEarned: newStampCount });
            toast({ 
              title: "Selo Adicionado!", 
              description: `+1 selo pela compra do pacote para ${refreshedClient.name}. Total: ${newStampCount}.` 
            });
            setEditingClient(prev => prev ? { ...prev, stampsEarned: newStampCount } : null);
            form.setValue("stampsEarned", newStampCount);
          } catch (stampError) {
             console.error("Error awarding stamp for package purchase:", stampError);
             toast({ variant: "destructive", title: "Erro ao dar Selo", description: "Não foi possível adicionar o selo pela compra do pacote." });
          }
        } else {
           toast({ 
             title: "Cartão Completo!", 
             description: `${refreshedClient.name} já completou o cartão. Nenhum selo adicional pela compra do pacote.` 
           });
        }
      }
      
      fetchAllData(); 
      setSelectedPackageToSell(""); 
    } catch (error) {
      console.error("Error selling package to client or recording transaction:", error);
      toast({ variant: "destructive", title: "Erro ao Vender Pacote", description: "Não foi possível adicionar o pacote ao cliente ou registrar a transação." });
    }
  };

  const handleOpenDeleteSoldPackageDialog = (clientId: string, packageIndex: number, packageName: string, paidPrice: string) => {
    setSoldPackageToDeleteDetails({
      clientId,
      packageInstanceIndex: packageIndex,
      packageName,
      paidPrice,
    });
    setIsDeleteSoldPackageConfirmOpen(true);
  };

  const confirmDeleteSoldPackage = async () => {
    if (!soldPackageToDeleteDetails || !editingClient || !editingClient.id) return;

    const { clientId, packageInstanceIndex, packageName, paidPrice } = soldPackageToDeleteDetails;
    
    const clientBeforeUpdate = await getClientFS(clientId); // Get fresh client data
    if (!clientBeforeUpdate) {
        toast({ variant: "destructive", title: "Erro", description: "Cliente não encontrado para atualização." });
        setIsDeleteSoldPackageConfirmOpen(false);
        return;
    }

    const updatedPackages = clientBeforeUpdate.purchasedPackages?.filter((_, index) => index !== packageInstanceIndex);

    try {
      await updateClientFS(clientId, { purchasedPackages: updatedPackages });
      toast({ title: "Pacote Removido do Cliente", description: `Pacote "${packageName}" removido de ${clientBeforeUpdate.name}.` });

      const stornoAmountString = String(paidPrice).replace(',', '.');
      const stornoAmount = parseFloat(stornoAmountString);

      if (!isNaN(stornoAmount) && stornoAmount > 0) {
        await addFinancialTransactionFS({
          description: `Estorno Pacote: ${packageName} - Cliente: ${clientBeforeUpdate.name}`,
          amount: stornoAmount.toFixed(2), 
          date: format(new Date(), "yyyy-MM-dd"),
          category: "Estorno de Pacote",
          type: "expense"
        });
        toast({ title: "Estorno Registrado", description: `Estorno de R$ ${stornoAmount.toFixed(2).replace('.',',')} registrado no caixa.` });
      } else {
        console.warn(`Invalid paidPrice for storno: ${paidPrice}`);
        toast({ variant: "destructive", title: "Erro no Estorno", description: "Valor do pacote inválido para estorno financeiro."});
      }

      // Remove one stamp
      let updatedStamps = clientBeforeUpdate.stampsEarned || 0;
      if (updatedStamps > 0) {
        updatedStamps -= 1;
        await updateClientFS(clientId, { stampsEarned: updatedStamps });
        toast({ title: "Selo Removido", description: `1 selo foi removido de ${clientBeforeUpdate.name}. Total: ${updatedStamps}.` });
      }

      const refreshedClient = await getClientFS(clientId);
      if (refreshedClient) {
        setEditingClient(refreshedClient);
        form.setValue("purchasedPackages", refreshedClient.purchasedPackages || []);
        form.setValue("stampsEarned", refreshedClient.stampsEarned || 0);
      }
      fetchAllData(); 
    } catch (error) {
      console.error("Error deleting sold package, recording storno, or removing stamp:", error);
      toast({ variant: "destructive", title: "Erro ao Excluir Pacote Vendido", description: "Não foi possível excluir o pacote, registrar o estorno ou remover o selo." });
    } finally {
      setSoldPackageToDeleteDetails(null);
      setIsDeleteSoldPackageConfirmOpen(false);
    }
  };


  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientAppointments = React.useMemo(() => {
    if (!editingClient) return [];
    return appointments.filter(apt => apt.clientName.toLowerCase() === editingClient.name.toLowerCase())
                       .sort((a,b) => new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime());
  }, [appointments, editingClient]);

  const handleAddStampForClient = () => {
    if (editingClient && (form.getValues("stampsEarned") || 0) < totalStampsOnCard) {
      const currentStamps = form.getValues("stampsEarned") || 0;
      form.setValue("stampsEarned", currentStamps + 1, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleResetStampsForClient = () => {
    if (editingClient) {
      form.setValue("stampsEarned", 0, { shouldValidate: true, shouldDirty: true });
      form.setValue("mimosRedeemed", 0, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleRedeemMimo = async () => {
    if (!editingClient || !editingClient.id) return;

    const currentStamps = form.getValues('stampsEarned') || 0;
    const heartsEarned = Math.floor(currentStamps / stampsNeededForHeart);
    const mimosEarnedTotal = Math.floor(heartsEarned / heartsNeededForMimo);
    const currentMimosRedeemed = form.getValues('mimosRedeemed') || 0;
    const availableMimos = mimosEarnedTotal - currentMimosRedeemed;

    if (availableMimos <= 0) {
        toast({ variant: "destructive", title: "Sem Mimos", description: "Não há mimos disponíveis para resgate." });
        return;
    }

    setIsUpdatingFidelity(true);
    try {
        const newRedeemedCount = currentMimosRedeemed + 1;
        await updateClientFS(editingClient.id, { mimosRedeemed: newRedeemedCount });
        form.setValue('mimosRedeemed', newRedeemedCount, { shouldDirty: true, shouldValidate: true });
        setEditingClient(prev => prev ? { ...prev, mimosRedeemed: newRedeemedCount } : null);
        toast({ title: "Mimo Resgatado!", description: `${editingClient.name} resgatou um mimo.` });
        fetchAllData();
    } catch (error) {
        console.error("Error redeeming mimo:", error);
        toast({ variant: "destructive", title: "Erro ao Resgatar", description: "Não foi possível resgatar o mimo." });
    } finally {
        setIsUpdatingFidelity(false);
    }
  };
  
  const currentClientStamps = form.watch("stampsEarned") || 0;
  const heartsEarnedForClient = Math.floor(currentClientStamps / stampsNeededForHeart);
  const mimosEarnedTotalForClient = Math.floor(heartsEarnedForClient / heartsNeededForMimo);
  const mimosAlreadyRedeemedByClient = form.watch("mimosRedeemed") || 0;
  const mimosAvailableForClient = mimosEarnedTotalForClient - mimosAlreadyRedeemedByClient;

  const getServiceNameById = (serviceId: string): string => {
    const service = availableServices.find(s => s.id === serviceId);
    return service ? service.name : "Serviço Desconhecido";
  };
  
  const handleCreateRecurringAppointments = async (data: RecurringAppointmentFormValues) => {
      if (!editingClient) {
          toast({ variant: "destructive", title: "Cliente não selecionado."});
          return;
      }
      setIsCreatingRecurring(true);
      
      const appointmentsToCreate: Omit<Appointment, 'id'|'createdAt'|'updatedAt'>[] = [];
      const totalAmount = data.serviceIds.reduce((sum, sId) => {
          const service = availableServices.find(s => s.id === sId);
          return sum + (service ? parseFloat(service.price.replace(',', '.')) : 0);
      }, 0).toFixed(2);
      
      const weeklyIntervals = eachWeekOfInterval({
          start: startOfDay(new Date()),
          end: data.endDate
      }, { weekStartsOn: 1 });
      
      weeklyIntervals.forEach(weekStart => {
          const targetDay = addDays(weekStart, (data.dayOfWeek - 1 + 7) % 7); // Adjust for week start
          if (targetDay <= data.endDate && targetDay >= startOfDay(new Date())) {
              appointmentsToCreate.push({
                  clientName: editingClient.name,
                  serviceIds: data.serviceIds,
                  professionalId: data.professionalId,
                  date: format(targetDay, "yyyy-MM-dd"),
                  startTime: data.startTime,
                  endTime: data.endTime,
                  status: 'Agendado',
                  totalAmount,
              });
          }
      });
      
      try {
          await Promise.all(appointmentsToCreate.map(apt => addAppointmentFS(apt)));
          toast({ title: "Agendamentos Criados!", description: `${appointmentsToCreate.length} agendamentos recorrentes foram criados para ${editingClient.name}.` });
          recurringForm.reset();
          fetchAllData(); // To see new appointments in history
      } catch (error) {
          console.error("Error creating recurring appointments:", error);
          toast({ variant: "destructive", title: "Erro ao criar agendamentos", description: "Não foi possível salvar os agendamentos recorrentes." });
      } finally {
          setIsCreatingRecurring(false);
      }
  };

    const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: Appointment["status"]) => {
    setUpdatingAppointmentId(appointmentId);
    let overallToastMessage = "Status do agendamento atualizado.";
    let overallToastTitle = "Status Atualizado";

    try {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            toast({ variant: "destructive", title: "Erro", description: "Agendamento não encontrado." });
            setUpdatingAppointmentId(null);
            return;
        }

        await updateAppointmentFS(appointmentId, { status: newStatus });

        let packageServiceConsumedThisAppointment = false;
        let clientUpdatedDueToPackage = false;

        if (newStatus === "Concluído") {
            const client = clients.find(c => c.name.trim().toLowerCase() === appointment.clientName.trim().toLowerCase());

            if (client && client.id) {
                if (client.purchasedPackages && client.purchasedPackages.length > 0) {
                    const modifiableClientPackages = JSON.parse(JSON.stringify(client.purchasedPackages)) as Client["purchasedPackages"];

                    if (modifiableClientPackages) {
                        for (const serviceIdInAppointment of appointment.serviceIds) {
                            let serviceDebitedFromPackageThisIteration = false;
                            for (const pkgInstance of modifiableClientPackages) {
                                const isPkgActive = pkgInstance.status === 'Ativo';
                                const isPkgNotExpired = !pkgInstance.expiryDate || !isBefore(parseISO(pkgInstance.expiryDate), startOfDay(new Date()));

                                if (isPkgActive && isPkgNotExpired) {
                                    const serviceInPkgIndex = pkgInstance.services.findIndex(
                                        s => s.serviceId === serviceIdInAppointment && s.remainingQuantity > 0
                                    );

                                    if (serviceInPkgIndex !== -1) {
                                        pkgInstance.services[serviceInPkgIndex].remainingQuantity -= 1;
                                        packageServiceConsumedThisAppointment = true;
                                        clientUpdatedDueToPackage = true;
                                        serviceDebitedFromPackageThisIteration = true;
                                        const serviceDetails = availableServices.find(s => s.id === serviceIdInAppointment);
                                        const serviceName = serviceDetails ? serviceDetails.name : "Serviço Desconhecido";
                                        toast({
                                            title: "Serviço de Pacote Utilizado",
                                            description: `1x ${serviceName} debitado do pacote "${pkgInstance.packageName}". Restam: ${pkgInstance.services[serviceInPkgIndex].remainingQuantity}.`
                                        });
                                        if (pkgInstance.services.every(s => s.remainingQuantity === 0)) {
                                            pkgInstance.status = 'Utilizado';
                                            toast({
                                                title: "Pacote Concluído!",
                                                description: `O pacote "${pkgInstance.packageName}" foi totalmente utilizado.`
                                            });
                                        }
                                        break; 
                                    }
                                }
                            }
                            if(serviceDebitedFromPackageThisIteration) break;
                        }
                        if (clientUpdatedDueToPackage) {
                            await updateClientFS(client.id, { purchasedPackages: modifiableClientPackages });
                        }
                    }
                }
            }

            if (!packageServiceConsumedThisAppointment && client && client.id) {
                const currentStamps = client.stampsEarned || 0;
                if (currentStamps < totalStampsOnCard) {
                    const newStampsValue = currentStamps + 1;
                    await updateClientFS(client.id, { stampsEarned: newStampsValue });
                    toast({
                        title: "Selo Adicionado!",
                        description: `+1 selo para ${client.name}. Total: ${newStampsValue}.`
                    });
                }
            } else if (packageServiceConsumedThisAppointment && client) {
                 toast({
                    title: "Serviço de Pacote",
                    description: `Serviço consumido do pacote. Selo não adicionado.`
                });
            }

            if (appointment.totalAmount) {
                 const cleanedAmountString = String(appointment.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
                 const appointmentValue = parseFloat(cleanedAmountString);
                if (!isNaN(appointmentValue) && appointmentValue > 0) {
                    await addFinancialTransactionFS({
                        description: `Receita Serviço: ${appointment.clientName}`,
                        amount: appointmentValue.toFixed(2), 
                        date: appointment.date, 
                        category: "Serviços Prestados",
                        type: "income"
                    });
                    toast({
                        title: "Receita Registrada",
                        description: `R$ ${appointmentValue.toFixed(2).replace('.',',')} registrado no caixa.`
                    });
                }
            }
        }

        if (newStatus === "Confirmado") overallToastMessage = "Agendamento confirmado!";
        else if (newStatus === "Concluído") overallToastMessage = "Agendamento concluído com sucesso!";
        else if (newStatus === "Cancelado") {
            overallToastTitle = "Agendamento Cancelado";
            overallToastMessage = "O agendamento foi cancelado.";
        }

        toast({ title: overallToastTitle, description: overallToastMessage });
        fetchAllData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao Atualizar Status", description: error.message });
    } finally {
        setUpdatingAppointmentId(null);
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gestão de Clientes
            </CardTitle>
            <CardDescription className="font-body">
              Visualize, adicione e gerencie os dados dos seus clientes.
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Buscar cliente..." 
                className="pl-8 w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleAddNewClient} className="bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 whitespace-nowrap">
              <UserPlus className="mr-2 h-4 w-4" /> Adicionar Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 font-body text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : filteredClients.length === 0 && searchTerm === "" ? (
             <p className="font-body text-muted-foreground my-8 text-center">
              Nenhum cliente cadastrado. Clique em "Adicionar Cliente" para começar.
            </p>
          ) : filteredClients.length === 0 && searchTerm !== "" ? (
            <p className="font-body text-muted-foreground my-8 text-center">
              Nenhum cliente encontrado com o termo "{searchTerm}".
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredClients.map((client, index) => {
                const cardStyle = cardColorPalettes[index % cardColorPalettes.length];
                const hasPackages = (client.purchasedPackages?.length || 0) > 0;
                return (
                  <Card key={client.id} className={cn("flex flex-col rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 ease-in-out", cardStyle.bg, cardStyle.border, "border-t-4")}>
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className="text-lg font-headline text-foreground truncate">{client.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm flex-grow">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate font-body">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PackageIcon className={cn("h-4 w-4 shrink-0", hasPackages ? cardStyle.border.replace('border-','text-') : 'text-muted-foreground')} />
                        <span className="font-body">Pacotes: </span> 
                        <Badge 
                          variant={hasPackages ? "default" : "outline"}
                          className={cn(
                            "font-body text-xs",
                            hasPackages 
                              ? `${cardStyle.accentBg} text-white border-transparent` 
                              : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"
                          )}
                        >
                          {hasPackages ? `${client.purchasedPackages?.length} Comprado(s)` : 'Nenhum'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className={cn("h-4 w-4 shrink-0", (client.stampsEarned || 0) > 0 ? cardStyle.border.replace('border-','text-') : 'text-muted-foreground')} />
                        <span className="font-body">Selos: </span> 
                        <Badge 
                           variant="secondary"
                           className={cn(
                             "font-body text-xs",
                             (client.stampsEarned || 0) > 0
                               ? `${cardStyle.bg.replace('bg-','border-').replace('-50', '-200')} ${cardStyle.border.replace('border-','text-')}`
                               : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"
                           )}
                        >
                          {client.stampsEarned || 0}
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t mt-auto">
                      <div className="flex w-full justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenClientModal(client)} 
                          title="Gerenciar Cliente" 
                          className="font-body text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        >
                          <Edit3 className="mr-1 h-3.5 w-3.5" /> Gerenciar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)} title="Remover Cliente" className="font-body text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30">
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
            setEditingClient(null);
            form.reset();
            setActiveTab("dados");
            setSelectedPackageToSell("");
          }
        }}>
        <DialogContent className="sm:max-w-3xl bg-card p-0">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle className="font-headline text-gradient text-2xl">{editingClient ? `Gerenciar Cliente: ${editingClient.name}` : "Adicionar Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 border-b border-border">
                  <div className="w-full overflow-x-auto">
                    <TabsList className="inline-flex w-max items-center justify-start gap-2 bg-transparent p-1">
                        <Button variant={activeTab === 'dados' ? 'default' : 'ghost'} onClick={() => setActiveTab('dados')} className={cn("font-body text-xs sm:text-sm whitespace-nowrap", activeTab === 'dados' && 'bg-primary text-primary-foreground')}>Dados</Button>
                        <Button variant={activeTab === 'fidelidade' ? 'default' : 'ghost'} onClick={() => setActiveTab('fidelidade')} className={cn("font-body text-xs sm:text-sm whitespace-nowrap", activeTab === 'fidelidade' && 'bg-primary text-primary-foreground')}>Fidelidade</Button>
                        <Button variant={activeTab === 'pacotesCliente' ? 'default' : 'ghost'} onClick={() => setActiveTab('pacotesCliente')} className={cn("font-body text-xs sm:text-sm whitespace-nowrap", activeTab === 'pacotesCliente' && 'bg-primary text-primary-foreground')}>Pacotes</Button>
                        <Button variant={activeTab === 'agendamentoContinuo' ? 'default' : 'ghost'} onClick={() => setActiveTab('agendamentoContinuo')} className={cn("font-body text-xs sm:text-sm whitespace-nowrap", activeTab === 'agendamentoContinuo' && 'bg-primary text-primary-foreground')}><Repeat className="mr-1 h-4 w-4"/>Contínuo</Button>
                        <Button variant={activeTab === 'historico' ? 'default' : 'ghost'} onClick={() => setActiveTab('historico')} className={cn("font-body text-xs sm:text-sm whitespace-nowrap", activeTab === 'historico' && 'bg-primary text-primary-foreground')}>Histórico</Button>
                    </TabsList>
                  </div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
                    <TabsContent value="dados">
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitClient)} className="space-y-4 pt-2">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel className="font-body">Nome Completo</FormLabel><FormControl><Input placeholder="Nome do cliente" {...field} className="focus:ring-accent font-body"/></FormControl><FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel className="font-body">E-mail</FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} className="focus:ring-accent font-body"/></FormControl><FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel className="font-body">Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} className="focus:ring-accent font-body"/></FormControl><FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="stampsEarned" render={({ field }) => ( <FormItem> <FormLabel className="font-body">Selos Acumulados</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} className="focus:ring-accent font-body"/></FormControl><FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="mimosRedeemed" render={({ field }) => ( <FormItem> <FormLabel className="font-body">Mimos Resgatados</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} className="focus:ring-accent font-body"/></FormControl><FormMessage /> </FormItem> )}/>
                            <DialogFooter className="pt-6 border-t !mt-6">
                                <DialogClose asChild><Button type="button" variant="outline" className="font-body">Fechar Janela</Button></DialogClose>
                                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Salvar Dados Pessoais
                                </Button>
                            </DialogFooter>
                        </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="fidelidade">
                         {editingClient ? (
                            <Card className="bg-background/50 mt-2">
                                <CardHeader> <CardTitle className="font-headline text-xl text-primary">Cartão Fidelidade de {editingClient.name}</CardTitle> </CardHeader>
                                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div> <p className="font-body text-sm">Total de Selos: <span className="font-bold text-accent">{currentClientStamps} / {totalStampsOnCard}</span></p> </div>
                                        <div className="space-y-3 pt-4 border-t border-border"> 
                                        <p className="font-headline text-md">Recompensas Acumuladas:</p>
                                        <div className="flex items-center gap-2"> <span className="font-body text-sm">Corações (<Heart className="inline h-4 w-4 text-pink-500" />):</span> {Array.from({ length: heartsNeededForMimo }).map((_, i) => ( <Heart key={`client-heart-reward-${i}`} className={cn("h-7 w-7", i < (heartsEarnedForClient % heartsNeededForMimo) || (mimosEarnedTotalForClient > 0 && heartsEarnedForClient % heartsNeededForMimo === 0 && currentClientStamps > 0) ? "text-pink-500 fill-pink-500" : "text-pink-200" )}/> ))} </div>
                                        <div className="flex items-center gap-2"> <span className="font-body text-sm">Mimos Acumulados (<Gift className="inline h-4 w-4 text-purple-500" />):</span> {Array.from({ length: Math.max(1, mimosEarnedTotalForClient) }).map((_, i) => ( <Gift key={`client-mimo-reward-${i}`} className={cn("h-7 w-7", i < mimosEarnedTotalForClient ? "text-purple-500 fill-purple-500 animate-bounce" : "text-purple-200" )}/> ))} </div>
                                        <div className="mt-3">
                                            <p className="font-body text-sm">Mimos Disponíveis para Resgate: <span className="font-bold text-green-600">{mimosAvailableForClient}</span></p>
                                            <Button onClick={handleRedeemMimo} disabled={mimosAvailableForClient <= 0 || isUpdatingFidelity} className="mt-2 w-full sm:w-auto font-body bg-orange-500 hover:bg-orange-600 text-white">
                                                {isUpdatingFidelity && form.getValues("mimosRedeemed") !== mimosAlreadyRedeemedByClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Gift className="mr-2 h-4 w-4" />} Resgatar Mimo
                                            </Button>
                                        </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-headline text-md mb-2">Cartão de Selos:</p>
                                        <div className="grid grid-cols-6 gap-1 p-1.5 border border-border rounded-lg bg-muted/20">
                                        {Array.from({ length: totalStampsOnCard }).map((_, index) => {
                                            const stampNumber = index + 1; 
                                            const isEarned = stampNumber <= currentClientStamps; 
                                            const isMilestoneForHeart = stampNumber % stampsNeededForHeart === 0;
                                            
                                            let slotClasses = "aspect-square rounded-lg border-2 flex items-center justify-center transition-all duration-300 shadow-sm";
                                            let iconComponent;

                                            if (isEarned) {
                                                slotClasses = cn(slotClasses, "bg-pink-100 border-pink-400");
                                                if (isMilestoneForHeart) {
                                                    slotClasses = cn(slotClasses, "border-pink-600 ring-2 ring-pink-500 ring-offset-1 animate-pulse");
                                                    iconComponent = <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />;
                                                } else {
                                                    iconComponent = <PawPrint className="h-5 w-5 text-pink-500 fill-pink-500" />;
                                                }
                                            } else {
                                                slotClasses = cn(slotClasses, "bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700 border-dashed");
                                                if (isMilestoneForHeart) {
                                                    slotClasses = cn(slotClasses, "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-700/20");
                                                    iconComponent = <Star className="h-5 w-5 text-yellow-500 opacity-70" />;
                                                } else {
                                                    iconComponent = <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 opacity-70" />;
                                                }
                                            }
                                            return <div key={stampNumber} className={slotClasses} title={`Selo ${stampNumber}`}>{iconComponent}</div>;
                                        })}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex flex-col sm:flex-row justify-center sm:justify-end gap-3">
                                    <Button onClick={handleAddStampForClient} disabled={currentClientStamps >= totalStampsOnCard || isUpdatingFidelity} className="w-full sm:w-auto font-body bg-green-600 hover:bg-green-700 text-white"> 
                                        {isUpdatingFidelity && form.getValues("stampsEarned") !== currentClientStamps ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusSquare className="mr-2 h-4 w-4" />} Adicionar Selo 
                                    </Button>
                                    <Button onClick={handleResetStampsForClient} variant="outline" className="w-full sm:w-auto font-body" disabled={isUpdatingFidelity}> <RotateCcw className="mr-2 h-4 w-4" /> Resetar Selos e Mimos </Button>
                                    <Button onClick={handleSaveFidelityChanges} className="w-full sm:w-auto font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdatingFidelity}> 
                                        {isUpdatingFidelity ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Salvar Alterações de Fidelidade 
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : <p className="font-body text-muted-foreground text-center py-4">Selecione um cliente para ver os detalhes de fidelidade.</p>}
                    </TabsContent>
                     <TabsContent value="pacotesCliente">
                        {editingClient ? (
                            <div className="mt-2 space-y-4">
                                <h3 className="font-headline text-lg text-primary">Pacotes Adquiridos por {editingClient.name}</h3>
                                {(editingClient.purchasedPackages && editingClient.purchasedPackages.length > 0) ? (
                                    <div className="space-y-3">
                                        {editingClient.purchasedPackages.map((cpInstance, index) => (
                                            <Card key={index} className="bg-muted/30">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="font-headline text-md text-accent flex justify-between items-center">
                                                        {cpInstance.packageName}
                                                        <Badge className={cn("text-xs", cpInstance.status === "Ativo" ? "bg-green-100 text-green-700 border-green-300" : cpInstance.status === "Expirado" ? "bg-yellow-100 text-yellow-700 border-yellow-300" : "bg-red-100 text-red-700 border-red-300")}>
                                                            {cpInstance.status}
                                                        </Badge>
                                                    </CardTitle>
                                                    <CardDescription className="font-body text-xs">
                                                        Comprado em: {format(parseISO(cpInstance.purchaseDate), "dd/MM/yyyy", {locale: ptBR})} | Expira em: {format(parseISO(cpInstance.expiryDate), "dd/MM/yyyy", {locale: ptBR})}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="text-xs font-body">
                                                    <p>Preço Pago: R$ {cpInstance.paidPrice.replace('.',',')} {cpInstance.originalPrice && <span className="line-through text-muted-foreground ml-1">R$ {cpInstance.originalPrice.replace('.',',')}</span>}</p>
                                                    <p className="font-medium mt-1">Serviços Restantes:</p>
                                                    <ul className="list-disc pl-4">
                                                        {cpInstance.services.map(s => (
                                                            <li key={s.serviceId}>{getServiceNameById(s.serviceId)}: {s.remainingQuantity}/{s.totalQuantity}</li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                                <CardFooter className="pt-2 border-t mt-2">
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-xs text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-800/30"
                                                    onClick={() => editingClient && editingClient.id && handleOpenDeleteSoldPackageDialog(editingClient.id, index, cpInstance.packageName, cpInstance.paidPrice)}
                                                  >
                                                    <Trash2 className="mr-1 h-3 w-3" /> Excluir Pacote Comprado
                                                  </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-body text-muted-foreground text-center py-3">Nenhum pacote adquirido por este cliente.</p>
                                )}

                                <Card className="mt-6 border-dashed border-primary">
                                    <CardHeader>
                                        <CardTitle className="font-headline text-md text-primary flex items-center gap-2">
                                            <PackagePlus className="h-5 w-5"/> Adicionar Novo Pacote ao Cliente
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label htmlFor="selectPackageToSell" className="font-body">Selecionar Pacote Disponível</Label>
                                            <Select value={selectedPackageToSell} onValueChange={setSelectedPackageToSell}>
                                                <SelectTrigger id="selectPackageToSell" className="focus:ring-accent font-body">
                                                    <SelectValue placeholder="Escolha um pacote..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availablePackages.filter(p => p.status === "Ativo").map(pkg => (
                                                        <SelectItem key={pkg.id} value={pkg.id} className="font-body">
                                                            {pkg.name} (R$ {pkg.price.replace('.',',')})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            onClick={handleSellPackageToClient} 
                                            disabled={!selectedPackageToSell} 
                                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-body"
                                        >
                                            <Tag className="mr-2 h-4 w-4" /> Vender Pacote Selecionado
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : <p className="font-body text-muted-foreground text-center py-4">Selecione um cliente para gerenciar pacotes.</p>}
                    </TabsContent>
                    <TabsContent value="agendamentoContinuo">
                        {editingClient ? (
                            <Card className="bg-background/50 mt-2">
                                <CardHeader>
                                    <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                                        <Repeat className="h-5 w-5"/> Agendamento Contínuo
                                    </CardTitle>
                                    <CardDescription className="font-body">
                                        Crie agendamentos que se repetem toda semana para {editingClient.name}.
                                    </CardDescription>
                                </CardHeader>
                                <Form {...recurringForm}>
                                    <form onSubmit={recurringForm.handleSubmit(handleCreateRecurringAppointments)}>
                                        <CardContent className="space-y-4">
                                            <FormField
                                                control={recurringForm.control}
                                                name="serviceIds"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel className="font-body">Serviços</FormLabel>
                                                    <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                                                        {availableServices.map(service => (
                                                        <div key={service.id} className="flex flex-row items-center space-x-3">
                                                            <input
                                                                type="checkbox"
                                                                id={`rec-service-${service.id}`}
                                                                checked={field.value?.includes(service.id)}
                                                                onChange={(e) => {
                                                                    const currentSelectedIds = field.value || [];
                                                                    if (e.target.checked) {
                                                                        field.onChange([...currentSelectedIds, service.id]);
                                                                    } else {
                                                                        field.onChange(currentSelectedIds.filter(id => id !== service.id));
                                                                    }
                                                                }}
                                                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                                            />
                                                            <Label htmlFor={`rec-service-${service.id}`} className="font-normal font-body text-sm cursor-pointer">
                                                            {service.name}
                                                            </Label>
                                                        </div>
                                                        ))}
                                                    </div>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={recurringForm.control}
                                                name="professionalId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel className="font-body">Profissional</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="focus:ring-accent font-body"><SelectValue placeholder="Selecione o profissional" /></SelectTrigger></FormControl>
                                                        <SelectContent>{professionalsList.map(prof => (<SelectItem key={prof.id} value={prof.id} className="font-body">{prof.name}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={recurringForm.control} name="dayOfWeek" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-body">Dia da Semana</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                                            <FormControl><SelectTrigger className="focus:ring-accent font-body"><SelectValue/></SelectTrigger></FormControl>
                                                            <SelectContent>{weekDays.map(day => (<SelectItem key={day.value} value={String(day.value)} className="font-body">{day.label}</SelectItem>))}</SelectContent>
                                                        </Select>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}/>
                                                <FormField control={recurringForm.control} name="endDate" render={({ field }) => (
                                                    <FormItem className="flex flex-col"><FormLabel className="font-body">Repetir até</FormLabel>
                                                    <Popover><PopoverTrigger asChild><FormControl>
                                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data final</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus locale={ptBR}/>
                                                    </PopoverContent></Popover>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <FormField
                                                control={recurringForm.control}
                                                name="startTime"
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="font-body">Início</FormLabel>
                                                    <FormControl>
                                                      <Input type="time" {...field} className="focus:ring-accent font-body" />
                                                    </FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                              <FormField
                                                control={recurringForm.control}
                                                name="endTime"
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="font-body">Término</FormLabel>
                                                    <FormControl>
                                                      <Input type="time" {...field} className="focus:ring-accent font-body" />
                                                    </FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>
                                        </CardContent>
                                        <CardFooter className="border-t pt-4">
                                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-body" disabled={isCreatingRecurring}>
                                                {isCreatingRecurring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
                                                {isCreatingRecurring ? "Criando agendamentos..." : "Criar Agendamentos Recorrentes"}
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Form>
                            </Card>
                        ) : <p className="font-body text-muted-foreground text-center py-4">Selecione um cliente para configurar agendamentos recorrentes.</p>}
                    </TabsContent>
                    <TabsContent value="historico">
                         {editingClient ? (
                            clientAppointments.length > 0 ? (
                                <div className="mt-2 space-y-3">
                                    <h3 className="font-headline text-lg text-primary">Histórico de {editingClient.name}</h3>
                                    <div className="max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Serviço(s)</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clientAppointments.map(apt => (
                                                <TableRow key={apt.id}>
                                                    <TableCell className="font-body text-sm">{format(parseISO(apt.date), "dd/MM/yy", { locale: ptBR })} às {apt.startTime}</TableCell>
                                                    <TableCell className="font-body text-sm">{getServiceNameById(apt.serviceIds[0])}{apt.serviceIds.length > 1 ? ` +${apt.serviceIds.length - 1}` : ''}</TableCell>
                                                    <TableCell><Badge variant={apt.status === 'Concluído' ? 'default' : apt.status === 'Cancelado' ? 'destructive' : apt.status === 'Confirmado' ? 'secondary' : 'outline'} className={cn(apt.status === 'Confirmado' && 'bg-green-100 text-green-700 border-green-300')}>{apt.status}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1 min-w-max">
                                                            {updatingAppointmentId === apt.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    {apt.status === "Agendado" && (
                                                                        <Button variant="outline" size="sm" className="font-body text-xs whitespace-nowrap" onClick={() => handleUpdateAppointmentStatus(apt.id, "Confirmado")}>
                                                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-600" /> Confirmar
                                                                        </Button>
                                                                    )}
                                                                    {(apt.status === "Agendado" || apt.status === "Confirmado") && (
                                                                        <Button variant="outline" size="sm" className="font-body text-xs whitespace-nowrap" onClick={() => handleUpdateAppointmentStatus(apt.id, "Concluído")}>
                                                                            <Award className="mr-1 h-3.5 w-3.5 text-primary" /> Finalizar
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </div>
                            ) : <p className="font-body text-muted-foreground text-center py-4">Nenhum agendamento encontrado para este cliente.</p>
                        ) : <p className="font-body text-muted-foreground text-center py-4">Selecione um cliente para ver o histórico.</p>}
                    </TabsContent>
                </div>
            </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader> <AlertDialogTitle className="font-headline text-gradient">Confirmar Remoção de Cliente</AlertDialogTitle> <AlertDialogDescription className="font-body"> Tem certeza que deseja remover este cliente? Esta ação não poderá ser desfeita. </AlertDialogDescription> </AlertDialogHeader>
          <AlertDialogFooter> <AlertDialogCancel onClick={() => setClientToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction> </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteSoldPackageConfirmOpen} onOpenChange={setIsDeleteSoldPackageConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-gradient">Confirmar Exclusão do Pacote Comprado</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Tem certeza que deseja remover o pacote "{soldPackageToDeleteDetails?.packageName}" de {editingClient?.name}?
              <br/>Esta ação também registrará um estorno de R$ {soldPackageToDeleteDetails?.paidPrice.replace('.',',')} no caixa e removerá 1 selo de fidelidade.
              <br/>Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteSoldPackageConfirmOpen(false)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSoldPackage} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Exclusão, Estorno e Remoção de Selo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    
