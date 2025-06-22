
"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, PlusCircle, Users, Square, Columns3, View, Clock, CheckCircle2, XCircle, CalendarIcon as CalendarNavIcon, Edit3, Trash2, ChevronsUpDown, Award, CreditCard, Loader2, Coffee, AlertTriangle } from "lucide-react"; // Renamed CalendarIcon to CalendarNavIcon, added AlertTriangle
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isToday, parseISO, startOfDay, parse, isBefore, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // This is the main Calendar component
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { addAppointmentFS, getAppointmentsFS, updateAppointmentFS, deleteAppointmentFS, getServicesFS, getClientsFS, updateClientFS, addClientFS, addFinancialTransactionFS, getPackagesFS, getProfessionalsFS } from "@/lib/firebase/firestoreService"; // Added getPackagesFS and getProfessionalsFS
import type { Appointment, SalonService as Service, Client, SalonPackage, Professional } from "@/types/firestore"; // Added SalonPackage and Professional
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription as ShadAlertDescription } from "@/components/ui/alert"; // Renamed to avoid conflict
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSettings, type DayOpeningHours } from "@/contexts/SettingsContext";


const statusStyles: Record<Appointment["status"], { icon: React.ElementType,bgColor: string, textColor: string, borderColor: string }> = {
  "Agendado": { icon: Clock, bgColor: "bg-blue-100 dark:bg-blue-900/50", textColor: "text-blue-700 dark:text-blue-300", borderColor: "border-blue-300 dark:border-blue-700" },
  "Confirmado": { icon: CheckCircle2, bgColor: "bg-green-100 dark:bg-green-900/50", textColor: "text-green-700 dark:text-green-300", borderColor: "border-green-300 dark:border-green-700" },
  "Concluído": { icon: Award, bgColor: "bg-pink-100 dark:bg-pink-900/50", textColor: "text-pink-700 dark:text-pink-300", borderColor: "border-pink-300 dark:border-pink-700" },
  "Cancelado": { icon: XCircle, bgColor: "bg-yellow-100 dark:bg-yellow-900/50", textColor: "text-yellow-700 dark:text-yellow-300", borderColor: "border-yellow-300 dark:border-yellow-700" },
};

const appointmentFormSchema = z.object({
  id: z.string().optional(),
  clientName: z.string().min(2, { message: "Nome do cliente é obrigatório." }),
  serviceIds: z.array(z.string()).nonempty({ message: "Selecione pelo menos um serviço." }),
  professionalId: z.string().min(1, { message: "Selecione um profissional." }),
  date: z.date({ required_error: "Data é obrigatória." }),
  startTime: z.string().min(1, { message: "Horário de início é obrigatório." }),
  endTime: z.string().min(1, { message: "Horário de término é obrigatório." }),
  status: z.enum(["Agendado", "Confirmado", "Concluído", "Cancelado"]).optional(),
  totalAmount: z.string().optional(),
}).refine(data => {
    if (!data.startTime || !data.endTime) return true;
    const start = parseInt(data.startTime.replace(":", ""), 10);
    const end = parseInt(data.endTime.replace(":", ""), 10);
    return end > start;
}, {
    message: "Horário de término deve ser após o horário de início.",
    path: ["endTime"],
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

const newClientFormSchema = z.object({
  name: z.string().min(2, { message: "Nome do cliente é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos (com DDD)." }).optional().or(z.literal('')),
});
type NewClientFormValues = z.infer<typeof newClientFormSchema>;


type ViewMode = "daily" | "3days" | "weekly";

const TOTAL_STAMPS_ON_CARD = 12;

interface PackageAlert {
  serviceId: string;
  serviceName: string;
}

export default function AgendaPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [servicesList, setServicesList] = React.useState<Service[]>([]);
  const [clientsList, setClientsList] = React.useState<Client[]>([]);
  const [professionalsList, setProfessionalsList] = React.useState<Professional[]>([]);
  const [availablePackagesList, setAvailablePackagesList] = React.useState<SalonPackage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentDisplayDate, setCurrentDisplayDate] = React.useState(startOfDay(new Date()));
  const [selectedProfessional, setSelectedProfessional] = React.useState<string | "all">("all");
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [appointmentToDeleteId, setAppointmentToDeleteId] = React.useState<string | null>(null);
  const [isClientComboboxOpen, setIsClientComboboxOpen] = React.useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = React.useState<string | null>(null);
  const [packageAlerts, setPackageAlerts] = React.useState<PackageAlert[]>([]);

  const [isNewClientModalOpen, setIsNewClientModalOpen] = React.useState(false);
  const [isCalendarPopoverOpen, setIsCalendarPopoverOpen] = React.useState(false); 

  const [viewMode, setViewMode] = React.useState<ViewMode>("weekly");
  const { toast } = useToast();
  const { openingHours } = useSettings();

  const timeSlots = React.useMemo(() => {
    if (!openingHours || openingHours.length === 0) {
      // Default hardcoded range if settings are not available
      return Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
        const hour = 7 + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      });
    }

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return 0;
      return h * 60 + m;
    };

    let minStartMinutes = 7 * 60; // 07:00
    let maxEndMinutes = 22 * 60; // 22:00

    const openDays = openingHours.filter(d => d.isOpen && d.openTime && d.closeTime);
    if (openDays.length > 0) {
      minStartMinutes = Math.min(...openDays.map(d => timeToMinutes(d.openTime)));
      maxEndMinutes = Math.max(...openDays.map(d => timeToMinutes(d.closeTime)));
    }

    const slots = [];
    let currentTime = minStartMinutes;
    while (currentTime <= maxEndMinutes) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      currentTime += 30;
    }

    return slots.length > 0 ? slots : Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
      const hour = 7 + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });
  }, [openingHours]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientName: "",
      serviceIds: [],
      professionalId: professionalsList.length > 0 ? professionalsList[0].id : "",
      date: currentDisplayDate,
      startTime: "",
      endTime: "",
      status: "Agendado",
      totalAmount: "0,00",
    },
  });

  const newClientForm = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const selectedServiceIdsFromForm = form.watch('serviceIds');
  const selectedClientNameFromForm = form.watch('clientName');

  React.useEffect(() => {
    if (selectedServiceIdsFromForm && selectedServiceIdsFromForm.length > 0 && servicesList.length > 0) {
      let total = 0;
      selectedServiceIdsFromForm.forEach(serviceId => {
        const service = servicesList.find(s => s.id === serviceId);
        if (service && service.price) {
          const priceString = String(service.price).replace(',', '.');
          const priceValue = parseFloat(priceString);
          if (!isNaN(priceValue)) {
            total += priceValue;
          }
        }
      });
      form.setValue('totalAmount', total.toFixed(2).replace('.', ','), { shouldValidate: false, shouldDirty: false });
    } else {
      form.setValue('totalAmount', "0,00", { shouldValidate: false, shouldDirty: false });
    }
  }, [selectedServiceIdsFromForm, servicesList, form]);

  React.useEffect(() => {
    if (!selectedClientNameFromForm || !selectedServiceIdsFromForm || selectedServiceIdsFromForm.length === 0 || clientsList.length === 0 || availablePackagesList.length === 0 || servicesList.length === 0) {
      setPackageAlerts([]);
      return;
    }

    const client = clientsList.find(c => c.name.toLowerCase() === selectedClientNameFromForm.toLowerCase());
    if (!client) {
      setPackageAlerts([]);
      return;
    }

    const newAlerts: PackageAlert[] = [];

    selectedServiceIdsFromForm.forEach(serviceId => {
      const serviceDetails = servicesList.find(s => s.id === serviceId);
      if (!serviceDetails) return;

      const isServiceGenerallyInPackages = availablePackagesList.some(pkgDef =>
        pkgDef.services.some(s => s.serviceId === serviceId)
      );

      if (isServiceGenerallyInPackages) {
        const clientHasCoveringPackage = client.purchasedPackages?.some(purchasedPkg => {
          if (purchasedPkg.status !== 'Ativo') return false;
          if (purchasedPkg.expiryDate && isBefore(parseISO(purchasedPkg.expiryDate), startOfDay(new Date()))) return false;
          return purchasedPkg.services.some(pkgServiceItem =>
            pkgServiceItem.serviceId === serviceId && pkgServiceItem.remainingQuantity > 0
          );
        });

        if (!clientHasCoveringPackage) {
          newAlerts.push({ serviceId, serviceName: serviceDetails.name });
        }
      }
    });
    setPackageAlerts(newAlerts);

  }, [selectedClientNameFromForm, selectedServiceIdsFromForm, clientsList, availablePackagesList, servicesList]);


  const fetchPageData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedAppointments, fetchedServices, fetchedClients, fetchedPackages, fetchedProfessionals] = await Promise.all([
        getAppointmentsFS(),
        getServicesFS(),
        getClientsFS(),
        getPackagesFS(),
        getProfessionalsFS(),
      ]);
      setAppointments(fetchedAppointments);
      setServicesList(fetchedServices);
      setClientsList(fetchedClients);
      setProfessionalsList(fetchedProfessionals);
      setAvailablePackagesList(fetchedPackages.filter(p => p.status === 'Ativo'));

      // Set default professional if none is selected or if the list was previously empty
      if (selectedProfessional === "all" && fetchedProfessionals.length > 0) {
        // No change needed for filter if "all" is selected
      } else if (selectedProfessional !== "all" && !fetchedProfessionals.find(p => p.id === selectedProfessional) && fetchedProfessionals.length > 0) {
        setSelectedProfessional(fetchedProfessionals[0].id); // Default to first if current selection invalid
      } else if (selectedProfessional === "all" && fetchedProfessionals.length === 0){
        // Handled by UI
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar todos os dados da agenda." });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedProfessional]);

  React.useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  React.useEffect(() => {
    if (!isAppointmentModalOpen) {
        form.reset({
            clientName: "",
            serviceIds: [],
            professionalId: selectedProfessional === "all" 
                ? (professionalsList.length > 0 ? professionalsList[0].id : "") 
                : (professionalsList.find(p=>p.id === selectedProfessional) ? selectedProfessional : (professionalsList.length > 0 ? professionalsList[0].id : "")),
            date: currentDisplayDate,
            startTime: "",
            endTime: "",
            status: "Agendado",
            totalAmount: "0,00",
        });
        setEditingAppointment(null);
        setPackageAlerts([]); 
    } else {
      // When modal opens, ensure professionalId in form is valid
      const currentProfId = form.getValues("professionalId");
      if (!professionalsList.find(p => p.id === currentProfId) && professionalsList.length > 0) {
        form.setValue("professionalId", 
          selectedProfessional === "all" 
            ? professionalsList[0].id 
            : (professionalsList.find(p=>p.id === selectedProfessional) ? selectedProfessional : professionalsList[0].id)
        );
      } else if (professionalsList.length === 0) {
        form.setValue("professionalId", "");
      }
    }
  }, [currentDisplayDate, selectedProfessional, form, isAppointmentModalOpen, professionalsList]);


  const weekStartsOn = 1; // Monday

  const daysInView = React.useMemo(() => {
    const start = viewMode === "weekly" ? startOfWeek(currentDisplayDate, { weekStartsOn }) : currentDisplayDate;
    const end = viewMode === "weekly" ? endOfWeek(currentDisplayDate, { weekStartsOn }) :
                viewMode === "3days" ? addDays(currentDisplayDate, 2) : currentDisplayDate;
    return eachDayOfInterval({ start, end });
  }, [currentDisplayDate, viewMode, weekStartsOn]);

  const handlePreviousPeriod = () => {
    const daysToSubtract = viewMode === "weekly" ? 7 : viewMode === "3days" ? 3 : 1;
    setCurrentDisplayDate(subDays(currentDisplayDate, daysToSubtract));
  };

  const handleNextPeriod = () => {
    const daysToAdd = viewMode === "weekly" ? 7 : viewMode === "3days" ? 3 : 1;
    setCurrentDisplayDate(addDays(currentDisplayDate, daysToAdd));
  };

  const handleToday = () => {
    setCurrentDisplayDate(startOfDay(new Date()));
  };

  const timeToSlotIndex = React.useCallback((time: string): number => {
    if (!time) return -1;
    return timeSlots.indexOf(time);
  }, [timeSlots]);

  const getAppointmentsForDay = React.useCallback((day: Date) => {
    return appointments.filter(
      (apt) => apt.date === format(day, "yyyy-MM-dd") && (selectedProfessional === "all" || apt.professionalId === selectedProfessional)
    );
  }, [appointments, selectedProfessional]);

  const isSlotOverlappingAppointment = React.useCallback((_day: Date, slotTime: string, appointmentsOnDay: Appointment[]): boolean => {
    const currentSlotStartIndex = timeToSlotIndex(slotTime);
    if (currentSlotStartIndex === -1) return true;

    for (const apt of appointmentsOnDay) {
        const aptStartIndex = timeToSlotIndex(apt.startTime);
        const aptEndIndex = timeToSlotIndex(apt.endTime);
        if (aptStartIndex === -1 || aptEndIndex === -1) continue;
        if (currentSlotStartIndex >= aptStartIndex && currentSlotStartIndex < aptEndIndex) {
            return true;
        }
    }
    return false;
  }, [timeToSlotIndex]);

  const isPastSlot = React.useCallback((slotDate: Date, slotTime: string): boolean => {
    const now = new Date();
    const [hours, minutes] = slotTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return true;
    }
    const fullSlotDateTime = new Date(slotDate);
    fullSlotDateTime.setHours(hours, minutes, 0, 0);
    return isBefore(fullSlotDateTime, now);
  }, []);


  const handleSlotClick = (date: Date, startTime: string) => {
    if (isPastSlot(date, startTime)) {
      toast({
        variant: "destructive",
        title: "Horário Indisponível",
        description: "Não é possível agendar em datas ou horários passados.",
      });
      return;
    }
    setEditingAppointment(null);
    form.reset({
      clientName: "",
      serviceIds: [],
      professionalId: selectedProfessional === "all" 
          ? (professionalsList.length > 0 ? professionalsList[0].id : "") 
          : (professionalsList.find(p=>p.id === selectedProfessional) ? selectedProfessional : (professionalsList.length > 0 ? professionalsList[0].id : "")),
      date: date,
      startTime: startTime,
      endTime: "",
      status: "Agendado",
      totalAmount: "0,00",
    });
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);
    form.reset({
        id: apt.id,
        clientName: apt.clientName,
        serviceIds: apt.serviceIds,
        professionalId: apt.professionalId,
        date: parse(apt.date, "yyyy-MM-dd", new Date()),
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        totalAmount: apt.totalAmount?.replace('.', ',') || "0,00",
    });
    setIsAppointmentModalOpen(true);
  };

  const handleDeleteAppointment = (aptId: string) => {
    setAppointmentToDeleteId(aptId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (appointmentToDeleteId) {
        try {
            await deleteAppointmentFS(appointmentToDeleteId);
            toast({ title: "Agendamento Removido", description: "O agendamento foi removido." });
            fetchPageData();
        } catch (error) {
            console.error("Error deleting appointment:", error);
            toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover o agendamento." });
        }
    }
    setAppointmentToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };


  const onSubmitAppointment = async (data: AppointmentFormValues) => {
    const appointmentDataToSave = {
      clientName: data.clientName,
      serviceIds: data.serviceIds,
      date: format(data.date, "yyyy-MM-dd"),
      startTime: data.startTime,
      endTime: data.endTime,
      professionalId: data.professionalId,
      status: data.status || "Agendado",
      totalAmount: data.totalAmount?.replace(',', '.') || "0.00",
    };

    try {
      if (editingAppointment && editingAppointment.id) {
        await updateAppointmentFS(editingAppointment.id, appointmentDataToSave);
        toast({ title: "Agendamento Atualizado", description: `Agendamento de ${data.clientName} atualizado.` });
      } else {
        await addAppointmentFS(appointmentDataToSave);
        toast({ title: "Agendamento Criado", description: `Agendamento para ${data.clientName} criado.` });
      }
      fetchPageData();
      setIsAppointmentModalOpen(false);
      form.reset();
      setEditingAppointment(null);
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar o agendamento." });
    }
  };

  const onSubmitNewClient = async (data: NewClientFormValues) => {
    try {
      const newClientData = {
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        stampsEarned: 0,
        mimosRedeemed: 0,
        purchasedPackages: []
      };
      const addedClient = await addClientFS(newClientData);
      toast({ title: "Cliente Adicionado", description: `${addedClient.name} foi cadastrado com sucesso.` });

      await fetchPageData();
      form.setValue("clientName", addedClient.name, { shouldValidate: true });

      setIsNewClientModalOpen(false);
      newClientForm.reset();
    } catch (error) {
      console.error("Error adding new client:", error);
      toast({ variant: "destructive", title: "Erro ao Adicionar Cliente", description: "Não foi possível cadastrar o novo cliente." });
    }
  };


 const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: Appointment["status"]) => {
    setUpdatingAppointmentId(appointmentId);
    let overallToastMessage = "Status do agendamento atualizado.";
    let overallToastTitle = "Status Atualizado";
    console.log(`[AgendaPage] handleUpdateStatus called for appointment ID: ${appointmentId}, new status: ${newStatus}`);
    console.log(`[AgendaPage] Current clientsList length: ${clientsList?.length}, servicesList length: ${servicesList?.length}`);


    try {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            console.error(`[AgendaPage] Appointment ${appointmentId} not found.`);
            toast({ variant: "destructive", title: "Erro", description: "Agendamento não encontrado." });
            setUpdatingAppointmentId(null);
            return;
        }
         console.log(`[AgendaPage] Appointment found:`, appointment);

        await updateAppointmentFS(appointmentId, { status: newStatus });

        let packageServiceConsumedThisAppointment = false;
        let clientUpdatedDueToPackage = false;

        if (newStatus === "Concluído") {
            const client = clientsList.find(c => c.name.trim().toLowerCase() === appointment.clientName.trim().toLowerCase());
            console.log(`[AgendaPage] Handling status "Concluído" for client: "${appointment.clientName}". Client found in list:`, client ? client.name : "Nenhum cliente encontrado com este nome exato.");

            if (client && client.id) {
                console.log(`[AgendaPage - PackageCheck] Client ${client.name} (ID: ${client.id}) found. Checking packages...`);
                if (client.purchasedPackages && client.purchasedPackages.length > 0) {
                    console.log(`[AgendaPage - PackageCheck] Client has ${client.purchasedPackages.length} package(s).`);
                    const modifiableClientPackages = JSON.parse(JSON.stringify(client.purchasedPackages)) as Client["purchasedPackages"];

                    if (modifiableClientPackages) {
                        for (const serviceIdInAppointment of appointment.serviceIds) {
                            console.log(`[AgendaPage - PackageCheck] Checking serviceIdInAppointment: ${serviceIdInAppointment} from current appointment.`);
                            let serviceDebitedFromPackageThisIteration = false;
                            for (const pkgInstance of modifiableClientPackages) {
                                console.log(`[AgendaPage - PackageCheck] Evaluating package: "${pkgInstance.packageName}", Status: ${pkgInstance.status}, Expiry: ${pkgInstance.expiryDate}`);
                                const isPkgActive = pkgInstance.status === 'Ativo';
                                const isPkgNotExpired = !pkgInstance.expiryDate || !isBefore(parseISO(pkgInstance.expiryDate), startOfDay(new Date()));
                                console.log(`[AgendaPage - PackageCheck] Package "${pkgInstance.packageName}" IsActive: ${isPkgActive}, IsNotExpired: ${isPkgNotExpired}`);

                                if (isPkgActive && isPkgNotExpired) {
                                    const serviceInPkgIndex = pkgInstance.services.findIndex(
                                        s => s.serviceId === serviceIdInAppointment && s.remainingQuantity > 0
                                    );
                                    console.log(`[AgendaPage - PackageCheck] Service ${serviceIdInAppointment} found in package "${pkgInstance.packageName}" at index ${serviceInPkgIndex}. Remaining quantity: ${serviceInPkgIndex !== -1 ? pkgInstance.services[serviceInPkgIndex].remainingQuantity : 'N/A'}`);

                                    if (serviceInPkgIndex !== -1) {
                                        console.log(`[AgendaPage - PackageCheck] Debiting service ${serviceIdInAppointment} from package "${pkgInstance.packageName}".`);
                                        pkgInstance.services[serviceInPkgIndex].remainingQuantity -= 1;
                                        packageServiceConsumedThisAppointment = true;
                                        clientUpdatedDueToPackage = true;
                                        serviceDebitedFromPackageThisIteration = true;
                                        const serviceDetails = servicesList.find(s => s.id === serviceIdInAppointment);
                                        const serviceName = serviceDetails ? serviceDetails.name : "Serviço Desconhecido";
                                        toast({
                                            title: "Serviço de Pacote Utilizado",
                                            description: `1x ${serviceName} debitado do pacote "${pkgInstance.packageName}" de ${client.name}. Restam: ${pkgInstance.services[serviceInPkgIndex].remainingQuantity}.`
                                        });
                                        const allServicesInPackageUsed = pkgInstance.services.every(s => s.remainingQuantity === 0);
                                        if (allServicesInPackageUsed) {
                                            pkgInstance.status = 'Utilizado';
                                            toast({
                                                title: "Pacote Concluído!",
                                                description: `O pacote "${pkgInstance.packageName}" de ${client.name} foi totalmente utilizado.`
                                            });
                                        }
                                        break; 
                                    }
                                }
                            }
                            if(serviceDebitedFromPackageThisIteration) {
                                console.log(`[AgendaPage - PackageCheck] Service ${serviceIdInAppointment} was debited from a package. Setting packageServiceConsumedThisAppointment = true and breaking from appointment services loop.`);
                                break; 
                            } else {
                                console.log(`[AgendaPage - PackageCheck] Service ${serviceIdInAppointment} was NOT debited from any package in this iteration.`);
                            }
                        }
                        if (clientUpdatedDueToPackage) {
                            console.log(`[AgendaPage - PackageCheck] Updating client's packages in Firestore.`);
                            await updateClientFS(client.id, { purchasedPackages: modifiableClientPackages });
                        }
                    }
                } else {
                     console.log(`[AgendaPage - PackageCheck] Client ${client.name} has no purchased packages.`);
                }
            } else {
                 console.warn(`[AgendaPage] Client "${appointment.clientName}" not found in clientsList. Length of clientsList: ${clientsList?.length}. Cannot process packages or stamps.`);
                 if (newStatus === "Concluído") {
                    toast({
                        variant: "default", 
                        title: "Atenção: Cliente não Encontrado",
                        description: `O cliente "${appointment.clientName}" não foi encontrado no cadastro para processar pacotes ou selos de fidelidade. Verifique se o nome no agendamento corresponde exatamente ao nome no cadastro de clientes.`
                    });
                }
            }
            console.log(`[AgendaPage] Before awarding stamp logic: packageServiceConsumedThisAppointment = ${packageServiceConsumedThisAppointment}, client exists = ${!!client}, client.id exists = ${!!client?.id}`);
            
            if (!packageServiceConsumedThisAppointment && client && client.id) {
                const currentStamps = client.stampsEarned || 0;
                console.log(`[AgendaPage] Client ${client.name} has ${currentStamps} stamps. TOTAL_STAMPS_ON_CARD is ${TOTAL_STAMPS_ON_CARD}.`);
                if (currentStamps < TOTAL_STAMPS_ON_CARD) {
                    const newStampsValue = currentStamps + 1;
                    await updateClientFS(client.id, { stampsEarned: newStampsValue });
                    toast({
                        title: "Selo Adicionado!",
                        description: `+1 selo de fidelidade para ${client.name}. Total: ${newStampsValue}.`
                    });
                    console.log(`[AgendaPage] Awarded stamp to ${client.name}. New total: ${newStampsValue}`);
                } else {
                    toast({
                        title: "Cartão Completo!",
                        description: `${client.name} já completou o cartão fidelidade. Nenhum selo adicional.`
                    });
                    console.log(`[AgendaPage] Card already full for ${client.name}. No stamp awarded.`);
                }
            } else if (packageServiceConsumedThisAppointment && client) { 
                 toast({
                    title: "Serviço de Pacote",
                    description: `Serviço(s) consumido(s) do pacote de ${client.name}. Selo não adicionado.`
                });
                console.log(`[AgendaPage] Stamp not awarded for ${client.name} because it was a package service (packageServiceConsumedThisAppointment = ${packageServiceConsumedThisAppointment}).`);
            } else if (!client && !packageServiceConsumedThisAppointment && newStatus === "Concluído") {
                 toast({
                    variant: "default",
                    title: "Atenção: Cliente não Encontrado (Selo)",
                    description: `O cliente "${appointment.clientName}" não foi encontrado no cadastro para adicionar o selo de fidelidade. Verifique se o nome no agendamento corresponde exatamente ao nome no cadastro de clientes.`
                });
                console.warn(`[AgendaPage] Stamp not awarded for appointment client "${appointment.clientName}" because client was not found in clientsList for stamp awarding.`);
            }


            // Record income financial transaction
            if (appointment.totalAmount) {
                 const cleanedAmountString = String(appointment.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
                 const appointmentValue = parseFloat(cleanedAmountString);
                 console.log(`[AgendaPage] Attempting to record financial transaction. Original totalAmount: '${appointment.totalAmount}', Cleaned: '${cleanedAmountString}', Parsed: ${appointmentValue}`);

                if (!isNaN(appointmentValue) && appointmentValue > 0) {
                    const serviceNames = appointment.serviceIds.map(id => {
                        const service = servicesList.find(s => s.id === id);
                        return service ? service.name : "Serviço";
                    }).join(', ');

                    await addFinancialTransactionFS({
                        description: `Receita Serviços: ${appointment.clientName} - ${serviceNames}`,
                        amount: appointmentValue.toFixed(2), 
                        date: appointment.date, 
                        category: "Serviços Prestados",
                        type: "income"
                    });
                    toast({
                        title: "Receita Registrada",
                        description: `R$ ${appointmentValue.toFixed(2).replace('.',',')} de ${appointment.clientName} registrado no caixa.`
                    });
                    console.log(`[AgendaPage] Financial transaction of ${appointmentValue.toFixed(2)} recorded for ${appointment.clientName}.`);
                } else {
                    console.warn(`[AgendaPage] Could not parse totalAmount for financial transaction. Original: '${appointment.totalAmount}', Cleaned: '${cleanedAmountString}', Parsed: ${appointmentValue}`);
                }
            } else {
                console.warn(`[AgendaPage] No totalAmount found for appointment ${appointment.id}. Financial transaction not recorded.`);
            }
        }

        if (newStatus === "Confirmado") overallToastMessage = "Agendamento confirmado com sucesso!";
        else if (newStatus === "Concluído") {
            overallToastMessage = packageServiceConsumedThisAppointment
                ? "Agendamento (com serviço de pacote) concluído!"
                : "Agendamento concluído com sucesso!";
        } else if (newStatus === "Cancelado") {
            overallToastTitle = "Agendamento Cancelado";
            overallToastMessage = "Agendamento cancelado.";
        }

        toast({ title: overallToastTitle, description: overallToastMessage, variant: newStatus === "Cancelado" ? "destructive" : "default"});
        fetchPageData();
    } catch (error: any) {
        console.error(`Error updating appointment status to ${newStatus} for apt ${appointmentId}:`, error.message, error.stack);
        toast({ variant: "destructive", title: "Erro ao Atualizar Status", description: `Não foi possível atualizar o status do agendamento. ${error.message}` });
    } finally {
        setUpdatingAppointmentId(null);
    }
};


  const formatDateRange = () => {
    if (!daysInView.length) return "";
    const firstDay = daysInView[0];
    const lastDay = daysInView[daysInView.length - 1];

    if (viewMode === "daily") {
      return format(firstDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    if (format(firstDay, "MMMM", { locale: ptBR }) === format(lastDay, "MMMM", { locale: ptBR })) {
      return `${format(firstDay, "d", { locale: ptBR })} - ${format(lastDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    }
    return `${format(firstDay, "d MMM", { locale: ptBR })} - ${format(lastDay, "d MMM, yyyy", { locale: ptBR })}`;
  };

  const todayButtonText = format(new Date(), "EEEE", { locale: ptBR });


  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 border-2 border-primary/30 rounded-lg shadow-sm flex items-center justify-center">
             <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-headline text-gradient">Agenda</h1>
            <p className="text-sm text-muted-foreground font-body">Visualize e gerencie seus compromissos e horários.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'daily' ? 'default' : 'outline'} onClick={() => setViewMode('daily')} className={cn("font-body", viewMode === 'daily' && "bg-primary text-primary-foreground hover:bg-primary/90")}><Square className="mr-2 h-4 w-4" />Diário</Button>
          <Button variant={viewMode === '3days' ? 'default' : 'outline'} onClick={() => setViewMode('3days')} className={cn("font-body", viewMode === '3days' && "bg-primary text-primary-foreground hover:bg-primary/90")}><Columns3 className="mr-2 h-4 w-4" />3 Dias</Button>
          <Button variant={viewMode === 'weekly' ? 'default' : 'outline'} onClick={() => setViewMode('weekly')} className={cn("font-body", viewMode === 'weekly' && "bg-primary text-primary-foreground hover:bg-primary/90")}><View className="mr-2 h-4 w-4" />Semanal</Button>

          <Dialog open={isAppointmentModalOpen} onOpenChange={(isOpen) => {
            setIsAppointmentModalOpen(isOpen);
            if (!isOpen) {
              setEditingAppointment(null);
              form.reset();
              setPackageAlerts([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="font-body bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="font-headline text-gradient">{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
                <DialogDescription className="font-body">
                  {editingAppointment ? "Altere os dados do agendamento." : "Preencha os dados para criar um novo agendamento."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitAppointment)} className="flex flex-col max-h-[85vh] h-full">
                  <div className="space-y-4 py-2 px-6 overflow-y-auto flex-grow pr-[calc(1.5rem+8px)]">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-body">Nome do Cliente</FormLabel>
                          <Popover open={isClientComboboxOpen} onOpenChange={setIsClientComboboxOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isClientComboboxOpen}
                                  className={cn(
                                    "w-full justify-between font-body focus:ring-accent",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? clientsList.find(
                                        (client) => client.name.toLowerCase() === field.value.toLowerCase()
                                      )?.name || field.value
                                    : "Buscar cliente ou digitar novo nome..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[420px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Buscar cliente ou digitar novo nome..."
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                />
                                <CommandList>
                                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                  <CommandGroup heading="Clientes Existentes">
                                    {clientsList.map((client) => (
                                      <CommandItem
                                        value={client.name}
                                        key={client.id}
                                        onSelect={(currentValue) => {
                                          form.setValue("clientName", currentValue, { shouldValidate: true });
                                          setIsClientComboboxOpen(false);
                                        }}
                                      >
                                        {client.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                  {field.value && !clientsList.some(c => c.name.toLowerCase() === field.value.toLowerCase()) && (
                                      <CommandGroup heading="Novo Cliente">
                                          <CommandItem
                                            onSelect={() => {
                                                newClientForm.reset({ name: field.value, email: "", phone: "" });
                                                setIsNewClientModalOpen(true);
                                                setIsClientComboboxOpen(false);
                                            }}
                                            value={`__CREATE__${field.value}`}
                                            className="cursor-pointer text-green-600 hover:!text-green-700 dark:text-green-400 dark:hover:!text-green-500"
                                            >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            <span>Cadastrar: "{field.value}"</span>
                                          </CommandItem>
                                      </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serviceIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-body">Serviços</FormLabel>
                          <FormControl>
                            <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                              {servicesList.map(service => (
                                <FormField
                                  key={service.id}
                                  control={form.control}
                                  name="serviceIds"
                                  render={({ field: checkboxField }) => {
                                    return (
                                      <FormItem
                                        key={service.id}
                                        className="flex flex-row items-center space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={checkboxField.value?.includes(service.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? checkboxField.onChange([...checkboxField.value, service.id])
                                                : checkboxField.onChange(
                                                    checkboxField.value?.filter(
                                                      (value) => value !== service.id
                                                    )
                                                  )
                                            }}
                                            className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal font-body text-sm cursor-pointer">
                                          {service.name}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {packageAlerts.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {packageAlerts.map(alert => (
                                <Alert key={alert.serviceId} variant="default" className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-600">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                    <ShadAlertDescription className="font-body text-yellow-700 dark:text-yellow-300 text-xs">
                                        O cliente selecionado não possui um pacote ativo que inclua o serviço "{alert.serviceName}". O valor integral será aplicado.
                                    </ShadAlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}


                    <div className="mt-3">
                        <div className="flex items-center gap-2">
                           <CreditCard className="h-5 w-5 text-muted-foreground" />
                           <Label className="font-body text-muted-foreground">Valor Total Estimado</Label>
                        </div>
                        <p className="font-headline text-2xl text-accent mt-1 ml-1">
                            R$ {form.watch('totalAmount') || "0,00"}
                        </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="professionalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-body">Profissional</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="focus:ring-accent font-body">
                                <SelectValue placeholder="Selecione o profissional" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {professionalsList.length === 0 && (
                                <SelectItem value="" disabled className="font-body">Nenhum profissional cadastrado</SelectItem>
                              )}
                              {professionalsList.map(prof => (
                                <SelectItem key={prof.id} value={prof.id} className="font-body">{prof.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-body">Data</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal focus:ring-accent font-body",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Escolha uma data</span>
                                  )}
                                  <CalendarNavIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < startOfDay(new Date()) && !isToday(date) && !editingAppointment // Allow today even if time has passed for editing
                                }
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-body">Início</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="focus:ring-accent font-body"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-body">Término</FormLabel>
                             <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="focus:ring-accent font-body"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {editingAppointment && (
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-body">Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="focus:ring-accent font-body">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.keys(statusStyles).map(statusKey => (
                                            <SelectItem key={statusKey} value={statusKey as Appointment["status"]} className="font-body">{statusKey}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                  </div>
                  <DialogFooter className="pt-4 p-6 border-t border-border mt-auto flex-shrink-0">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingAppointment ? "Salvar Alterações" : "Salvar Agendamento"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-card rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedProfessional} onValueChange={(value) => setSelectedProfessional(value as string | "all")}>
            <SelectTrigger className="w-full md:w-[200px] font-body">
              <SelectValue placeholder="Todos Profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">Todos Profissionais</SelectItem>
              {professionalsList.map(prof => (
                <SelectItem key={prof.id} value={prof.id} className="font-body">{prof.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Button variant="outline" onClick={handlePreviousPeriod} size="icon"><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="outline" onClick={handleToday} className="font-body px-4 capitalize">{todayButtonText}</Button>

          <Popover open={isCalendarPopoverOpen} onOpenChange={setIsCalendarPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="font-body px-3">
                <CalendarNavIcon className="mr-2 h-4 w-4" /> Calendário
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={currentDisplayDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDisplayDate(startOfDay(date));
                  }
                  setIsCalendarPopoverOpen(false);
                }}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={handleNextPeriod} size="icon"><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <div className="text-center md:text-right">
          <p className="font-headline text-lg text-primary capitalize">
            {formatDateRange()}
          </p>
        </div>
      </div>

      <Card className="flex-grow shadow-lg rounded-xl overflow-hidden">
        {isLoading ? (
            <div className="flex justify-center items-center h-full"><p className="font-body text-muted-foreground p-8">Carregando agenda...</p></div>
        ) : (
        <div className={cn(
            "grid h-full",
            viewMode === "weekly" ? "grid-cols-[auto_repeat(7,1fr)]" :
            viewMode === "3days" ? "grid-cols-[auto_repeat(3,1fr)]" :
            "grid-cols-[auto_repeat(1,1fr)]"
          )}>
          <div className="col-start-1 border-r border-border bg-muted/30 dark:bg-muted/10">
            <div className="h-16 border-b border-border"></div>
            {timeSlots.map(slot => (
              <div key={slot} className="h-16 flex items-center justify-center text-xs font-body text-muted-foreground border-b border-border pr-2 text-right">
                {slot}
              </div>
            ))}
          </div>

          {daysInView.map((day, dayIndex) => {
            const appointmentsOnThisDay = getAppointmentsForDay(day);
            const dayOfWeekNumber = getDay(day);
            const daySettings = openingHours.find(oh => oh.dayOfWeek === dayOfWeekNumber);
            const isDayEffectivelyOpen = daySettings ? daySettings.isOpen : false;

            return (
            <div key={day.toString()} className={cn("border-r border-border", dayIndex === daysInView.length -1 && "border-r-0")}>
              <div className={cn(
                  "h-16 flex flex-col items-center justify-center border-b border-border sticky top-0 z-10",
                  isToday(day) ? "bg-primary/10 dark:bg-primary/20" : "bg-muted/30 dark:bg-muted/10"
                )}>
                <p className={cn("text-xs font-body uppercase", isToday(day) ? "text-primary font-bold" : "text-muted-foreground")}>
                  {format(day, "E", { locale: ptBR })}
                </p>
                <p className={cn("text-2xl font-headline", isToday(day) ? "text-primary" : "text-foreground")}>
                  {format(day, "d")}
                </p>
              </div>
              <div
                className="relative grid h-[calc(4rem_*_var(--time-slots-count))]"
                style={{ '--time-slots-count': timeSlots.length, gridTemplateRows: `repeat(${timeSlots.length}, 4rem)` } as React.CSSProperties}
              >
                 {timeSlots.map((slot, slotIdx) => {
                    let slotStyling = "relative border-b border-border/50 h-16";
                    let showPlusButton = false;

                    const isThisSlotInThePast = isPastSlot(day, slot);
                    const isSlotOverlapping = isSlotOverlappingAppointment(day, slot, appointmentsOnThisDay);

                    if (isDayEffectivelyOpen && daySettings) {
                        const slotTimeIdx = timeToSlotIndex(slot);
                        const openTimeIdx = timeToSlotIndex(daySettings.openTime);
                        const closeTimeIdx = timeToSlotIndex(daySettings.closeTime);
                        const isWithinOperatingHours = slotTimeIdx >= openTimeIdx && slotTimeIdx < closeTimeIdx;

                        if (isWithinOperatingHours) {
                            if (!isSlotOverlapping && !isThisSlotInThePast) {
                                showPlusButton = true;
                            } else if (isThisSlotInThePast) {
                                slotStyling = cn(slotStyling, "bg-gray-100 dark:bg-gray-800/40 opacity-60 cursor-not-allowed");
                            } else if (isSlotOverlapping) {
                                // slotStyling = cn(slotStyling, "opacity-80"); // Keep it without additional styling if overlapping
                            }
                        } else {
                            slotStyling = cn(slotStyling, "bg-muted/20 dark:bg-white/5 opacity-50 cursor-not-allowed");
                        }
                    } else {
                        slotStyling = cn(slotStyling, "bg-red-50 dark:bg-red-900/20 opacity-60 cursor-not-allowed");
                    }

                    return (
                        <div key={`slot-${dayIndex}-${slotIdx}`} className={slotStyling}>
                            {showPlusButton && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-0 m-auto h-8 w-8"
                                    onClick={() => handleSlotClick(day, slot)}
                                    aria-label={`Agendar para ${format(day, "dd/MM")} às ${slot}`}
                                >
                                    <PlusCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                                </Button>
                            )}
                        </div>
                    );
                 })}
                {appointmentsOnThisDay.map(apt => {
                  const startSlot = timeToSlotIndex(apt.startTime);
                  const endSlot = timeToSlotIndex(apt.endTime);

                  if (startSlot < 0 || startSlot >= timeSlots.length || endSlot <= startSlot) return null;

                  const durationSlots = Math.max(0.5, endSlot - startSlot);
                  const aptStyle = statusStyles[apt.status];
                  const AptIcon = aptStyle.icon;
                  const professional = professionalsList.find(p => p.id === apt.professionalId);


                  const displayServiceName = apt.serviceIds.length > 0 && servicesList.find(s => s.id === apt.serviceIds[0])
                    ? servicesList.find(s => s.id === apt.serviceIds[0])!.name
                    : apt.serviceIds.length > 1 ? 'Serviços Múltiplos' : 'Serviço';

                  return (
                    <div
                      key={apt.id}
                      className={cn(
                        "absolute w-[calc(100%-4px)] ml-[2px] p-2 rounded-md shadow text-xs font-body overflow-hidden border-l-4 cursor-pointer",
                        aptStyle.bgColor,
                        aptStyle.textColor,
                        aptStyle.borderColor
                      )}
                      style={{
                        top: `calc(${startSlot} * 4rem)`,
                        height: `calc(${durationSlots} * 4rem)`,
                      }}
                      title={`${apt.clientName} - ${displayServiceName}\n${apt.startTime} - ${apt.endTime}${apt.totalAmount ? `\nValor: R$ ${apt.totalAmount.replace('.',',')}` : ''}`}
                      onClick={() => handleEditAppointment(apt)}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <AptIcon className="h-3 w-3 shrink-0" />
                        <span className="font-bold truncate">{apt.clientName}</span>
                      </div>
                      {selectedProfessional === "all" && professional?.name && (
                        <p className="text-[0.65rem] truncate text-muted-foreground dark:text-gray-400">Prof: {professional.name}</p>
                      )}
                      <p className="truncate">{displayServiceName} {apt.serviceIds.length > 1 ? ` (+${apt.serviceIds.length -1})` : ''}</p>
                      <p className="text-[0.65rem]">{apt.startTime} - {apt.endTime}</p>
                      {apt.totalAmount && <p className="text-[0.65rem] font-semibold">R$ {apt.totalAmount.replace('.',',')}</p>}
                       <div className="absolute bottom-1 right-1 flex space-x-0.5">
                            {updatingAppointmentId === apt.id ? (
                               <Loader2 className="h-3.5 w-3.5 animate-spin self-center mx-auto text-primary" />
                            ) : (
                                <>
                                    {apt.status === "Agendado" && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-card/30" title="Confirmar" onClick={(e) => { e.stopPropagation(); handleUpdateAppointmentStatus(apt.id, "Confirmado"); }}>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                                    </Button>
                                    )}
                                    {(apt.status === "Agendado" || apt.status === "Confirmado") && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-card/30" title="Finalizar" onClick={(e) => { e.stopPropagation(); handleUpdateAppointmentStatus(apt.id, "Concluído"); }}>
                                        <Award className="h-3.5 w-3.5 text-pink-600 dark:text-pink-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-card/30" title="Cancelar" onClick={(e) => { e.stopPropagation(); handleUpdateAppointmentStatus(apt.id, "Cancelado"); }}>
                                        <XCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                                        </Button>
                                    </>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-card/30" title="Editar" onClick={(e) => { e.stopPropagation(); handleEditAppointment(apt); }}>
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-card/30" title="Remover" onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(apt.id); }}>
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )})}
        </div>
        )}
      </Card>

       <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-gradient">Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Tem certeza que deseja remover este agendamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAppointment} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Client Registration Dialog */}
      <Dialog open={isNewClientModalOpen} onOpenChange={(isOpen) => {
        setIsNewClientModalOpen(isOpen);
        if (!isOpen) newClientForm.reset();
      }}>
        <DialogContent className="sm:max-w-[480px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-gradient">Cadastrar Novo Cliente</DialogTitle>
            <DialogDescription className="font-body">
              Preencha os dados abaixo para cadastrar o novo cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...newClientForm}>
            <form onSubmit={newClientForm.handleSubmit(onSubmitNewClient)} className="space-y-4 py-2">
              <FormField
                control={newClientForm.control}
                name="name"
                render={({ field: newClientField }) => (
                  <FormItem>
                    <FormLabel className="font-body">Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do cliente" {...newClientField} className="focus:ring-accent font-body" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newClientForm.control}
                name="email"
                render={({ field: newClientField }) => (
                  <FormItem>
                    <FormLabel className="font-body">E-mail (opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...newClientField} className="focus:ring-accent font-body" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newClientForm.control}
                name="phone"
                render={({ field: newClientField }) => (
                  <FormItem>
                    <FormLabel className="font-body">Telefone (opcional, com DDD)</FormLabel>
                    <FormControl>
                      <Input placeholder="(XX) XXXXX-XXXX" {...newClientField} className="focus:ring-accent font-body" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => newClientForm.reset()} className="font-body">Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={newClientForm.formState.isSubmitting}>
                    {newClientForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar Cliente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
