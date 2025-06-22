
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart3, User, CalendarDays, Briefcase, TrendingUp } from "lucide-react"; // Changed Percent to Briefcase
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getProfessionalsFS, getAppointmentsFS, getServicesFS } from "@/lib/firebase/firestoreService";
import type { Professional, Appointment, SalonService } from "@/types/firestore";
import { format, parseISO, startOfMonth, endOfMonth, getYear, getMonth, setYear, setMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface AppointmentDetail {
  id: string;
  date: string;
  clientName: string;
  serviceNames: string;
  appointmentValue: number;
}

interface ProfessionalPerformanceData {
  professionalId: string;
  professionalName: string;
  totalAppointmentsValue: number;
  appointments: AppointmentDetail[];
}

const currentYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i.toString(), // 0 for January, 11 for December
  label: format(setMonth(new Date(), i), "MMMM", { locale: ptBR }),
}));

export default function DetalhesAtendimentosProfissionalPage() { // Renamed component
  const [isLoading, setIsLoading] = React.useState(true);
  const [allProfessionalsForSelect, setAllProfessionalsForSelect] = React.useState<Professional[]>([]);
  const [professionalPerformance, setProfessionalPerformance] = React.useState<ProfessionalPerformanceData | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = React.useState<string>(getMonth(new Date()).toString());
  const [selectedProfessionalId, setSelectedProfessionalId] = React.useState<string>("all");
  const { toast } = useToast();

  const getServiceName = React.useCallback((serviceId: string, services: SalonService[]): string => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço Desconhecido";
  }, []);

  const formatCurrency = React.useCallback((value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, []);

  const fetchProfessionalPerformance = React.useCallback(async (year: number, month: number, profId: string) => {
    if (profId === "all") {
      setProfessionalPerformance(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setProfessionalPerformance(null);

    try {
      const [allProfessionals, allAppointments, allServices] = await Promise.all([
        getProfessionalsFS(), // Fetch professionals to get their names
        getAppointmentsFS(),
        getServicesFS(),
      ]);
      
      // Populate professional selector if not already done
      if (allProfessionalsForSelect.length === 0) {
        setAllProfessionalsForSelect(allProfessionals);
      }

      const selectedProfessional = allProfessionals.find(p => p.id === profId);
      if (!selectedProfessional) {
        toast({ variant: "destructive", title: "Erro", description: "Profissional selecionado não encontrado." });
        setIsLoading(false);
        return;
      }

      const targetDate = setYear(setMonth(new Date(), month), year);
      const periodStart = startOfMonth(targetDate);
      const periodEnd = endOfMonth(targetDate);

      let totalValue = 0;
      const performanceDetails: AppointmentDetail[] = [];

      allAppointments.forEach(apt => {
        if (!apt.date || !isValid(parseISO(apt.date))) {
            console.warn(`Appointment ${apt.id} has invalid date, skipping.`);
            return;
        }
        const appointmentDate = parseISO(apt.date);
        
        if (
          apt.status === "Concluído" &&
          apt.professionalId === profId &&
          appointmentDate >= periodStart &&
          appointmentDate <= periodEnd
        ) {
          if (!apt.totalAmount) {
            console.warn(`Appointment ${apt.id} (professional ${profId}) has no totalAmount, skipping for performance report.`);
            return;
          }
          
          const amountString = String(apt.totalAmount)
            .replace(/R\$\s*/, '')
            .replace(',', '.');
          
          const appointmentValue = parseFloat(amountString);

          if (isNaN(appointmentValue)) {
            console.warn(`Could not parse totalAmount for appointment ${apt.id}: Original was '${apt.totalAmount}', attempted to parse '${amountString}'. Skipping.`);
            return;
          }
            
          totalValue += appointmentValue;
          performanceDetails.push({
            id: apt.id,
            date: format(appointmentDate, "dd/MM/yyyy", { locale: ptBR }),
            clientName: apt.clientName,
            serviceNames: apt.serviceIds.map(id => getServiceName(id, allServices)).join(', ') || "N/A",
            appointmentValue: appointmentValue,
          });
        }
      });

      if (performanceDetails.length > 0) {
        setProfessionalPerformance({
          professionalId: profId,
          professionalName: selectedProfessional.name,
          totalAppointmentsValue: totalValue,
          appointments: performanceDetails.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()), // Sort by date descending for display
        });
      } else {
        // Set performance data with name but empty appointments if no relevant appointments found
        setProfessionalPerformance({
          professionalId: profId,
          professionalName: selectedProfessional.name,
          totalAppointmentsValue: 0,
          appointments: [],
        });
      }

    } catch (error) {
      console.error("Error fetching professional performance details:", error);
      toast({ variant: "destructive", title: "Erro ao buscar detalhes", description: "Não foi possível carregar os detalhes de atendimentos." });
      setProfessionalPerformance(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast, getServiceName, allProfessionalsForSelect.length]); // Added allProfessionalsForSelect.length to dependencies

  React.useEffect(() => {
    // Initial fetch or when filters change
    if (selectedProfessionalId !== "all") {
        fetchProfessionalPerformance(parseInt(selectedYear), parseInt(selectedMonth), selectedProfessionalId);
    } else {
        setProfessionalPerformance(null); // Clear data if "all" is selected
        setIsLoading(false); // Not loading if "all"
        // Fetch professionals for the select dropdown if it's empty
        if(allProfessionalsForSelect.length === 0) {
            const loadProfs = async () => {
                setIsLoading(true);
                try {
                    const profs = await getProfessionalsFS();
                    setAllProfessionalsForSelect(profs);
                } catch (e) {
                    toast({variant: "destructive", title: "Erro", description: "Não foi possível carregar a lista de profissionais."});
                } finally {
                    setIsLoading(false);
                }
            }
            loadProfs();
        }
    }
  }, [selectedYear, selectedMonth, selectedProfessionalId, fetchProfessionalPerformance, allProfessionalsForSelect.length, toast]);


  return (
    <div className="space-y-6">
       <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
              <Briefcase className="h-6 w-6" /> {/* Changed Icon */}
              Detalhes de Atendimentos por Profissional
            </CardTitle>
            <CardDescription className="font-body">
              Visualize os atendimentos concluídos e o valor total gerado por cada profissional no período selecionado.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger className="w-full sm:w-[200px] focus:ring-accent font-body">
                    <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="font-body">Selecione um Profissional</SelectItem>
                    {allProfessionalsForSelect.map(prof => (
                        <SelectItem key={prof.id} value={prof.id} className="font-body">{prof.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[180px] focus:ring-accent font-body">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value} className="font-body capitalize">{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[120px] focus:ring-accent font-body">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year} className="font-body">{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 font-body text-muted-foreground">Carregando detalhes...</p>
            </div>
          ) : selectedProfessionalId === "all" ? (
             <div className="text-center py-10">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-body text-muted-foreground">
                    Por favor, selecione um profissional para visualizar os detalhes dos atendimentos.
                </p>
            </div>
          ) : !professionalPerformance || professionalPerformance.appointments.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-body text-muted-foreground">
                Nenhum atendimento concluído encontrado para {professionalPerformance?.professionalName || "o profissional selecionado"} no período.
              </p>
            </div>
          ) : (
            <Card className="shadow-md rounded-lg border border-border">
                <CardHeader className="bg-muted/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                        <User className="h-5 w-5" /> {professionalPerformance.professionalName}
                    </CardTitle>
                    <div className="text-left sm:text-right">
                        <p className="font-body text-sm text-muted-foreground">Total Atendimentos Concluídos (Período):</p>
                        <p className="font-headline text-2xl font-semibold text-green-600">{formatCurrency(professionalPerformance.totalAppointmentsValue)}</p>
                    </div>
                </div>
                </CardHeader>
                <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="font-headline text-xs whitespace-nowrap">Data</TableHead>
                        <TableHead className="font-headline text-xs">Cliente</TableHead>
                        <TableHead className="font-headline text-xs min-w-[200px]">Serviço(s)</TableHead>
                        <TableHead className="font-headline text-xs text-right whitespace-nowrap">Valor Agend.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {professionalPerformance.appointments.map(detail => (
                        <TableRow key={detail.id}>
                            <TableCell className="font-body text-xs whitespace-nowrap">{detail.date}</TableCell>
                            <TableCell className="font-body text-xs">{detail.clientName}</TableCell>
                            <TableCell className="font-body text-xs">{detail.serviceNames}</TableCell>
                            <TableCell className="font-body text-xs text-right whitespace-nowrap">{formatCurrency(detail.appointmentValue)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
          )}
           <div className="mt-8 text-center">
             <Button variant="outline" asChild className="font-body">
                <Link href="/relatorios">
                    <BarChart3 className="mr-2 h-4 w-4" /> Voltar para Visão Geral de Relatórios
                </Link>
             </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

