
"use client";

import * as React from "react";
import { Users, CalendarCheck, DollarSign, Award, ScissorsIcon, BarChart, RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AiMarketingCard } from "@/components/dashboard/ai-marketing-card";
// AppointmentsToday is no longer imported or used here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAppointmentsFS, getClientsFS } from "@/lib/firebase/firestoreService"; // Removed getServicesFS
import type { Appointment, Client } from "@/types/firestore"; // Removed SalonService
import { useToast } from "@/hooks/use-toast";

const quickAccessLinks = [
  { href: "/agenda", label: "Agenda Completa", icon: CalendarCheck, color: "text-primary" }, // Updated label
  { href: "/clientes", label: "Novo Cliente", icon: Users, color: "text-accent" },
  { href: "/servicos", label: "Ver Serviços", icon: ScissorsIcon, color: "text-green-500" },
  { href: "/relatorios", label: "Ver Relatórios", icon: BarChart, color: "text-blue-500" },
];

function DynamicDateDisplay() {
  const [currentDate, setCurrentDate] = React.useState('');

  React.useEffect(() => {
    const today = new Date();
    const dayOfWeek = format(today, "EEEE", { locale: ptBR });
    const capitalizedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    const day = format(today, "d", { locale: ptBR });
    const month = format(today, "MMMM", { locale: ptBR });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = format(today, "yyyy", { locale: ptBR });
    setCurrentDate(`${capitalizedDayOfWeek}, ${day} de ${capitalizedMonth} de ${year}`);
  }, []); 

  if (!currentDate) {
    return <p className="text-md text-muted-foreground font-body mb-6 text-center md:text-left -mt-2 h-5"> </p>; 
  }

  return (
    <p className="text-md text-muted-foreground font-body mb-6 text-center md:text-left -mt-2">
      {currentDate}
    </p>
  );
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [appointmentsTodayCount, setAppointmentsTodayCount] = React.useState(0);
  const [totalClientsCount, setTotalClientsCount] = React.useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState("R$ 0,00");
  const [loyaltyClientsCount, setLoyaltyClientsCount] = React.useState(0);
  const [todaysAppointmentsListForMetric, setTodaysAppointmentsListForMetric] = React.useState<Appointment[]>([]); // Renamed for clarity
  // Removed clientsList and servicesList states as they are not used here anymore
  const { toast } = useToast();

  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      // Only fetch appointments and clients, services are not needed for this page anymore
      const [allAppointments, allClients] = await Promise.all([ 
        getAppointmentsFS(),
        getClientsFS(),
      ]);

      const todayFilteredAppointments = allAppointments.filter(apt => apt.date === todayStr);
      setAppointmentsTodayCount(todayFilteredAppointments.length);
      setTodaysAppointmentsListForMetric(todayFilteredAppointments); // Store for metric description

      setTotalClientsCount(allClients.length);

      const currentMonth = format(new Date(), "yyyy-MM");
      const revenue = allAppointments
        .filter(apt => apt.status === "Concluído" && apt.date.startsWith(currentMonth) && apt.totalAmount)
        .reduce((sum, apt) => sum + parseFloat(apt.totalAmount!.replace(',', '.')), 0);
      setMonthlyRevenue(`R$ ${revenue.toFixed(2).replace('.', ',')}`);
      
      const loyalty = allClients.filter(client => (client.stampsEarned || 0) > 0 || (client.purchasedPackages && client.purchasedPackages.length > 0)).length; 
      setLoyaltyClientsCount(loyalty);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar os dados do dashboard." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex justify-between items-center">
        <DynamicDateDisplay />
        <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading} className="font-body">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Agendamentos Hoje"
          value={isLoading ? "..." : appointmentsTodayCount}
          icon={CalendarCheck}
          description={isLoading ? "" : `${todaysAppointmentsListForMetric.filter(a => a.status === "Confirmado").length} confirmados`}
          iconClassName="text-primary"
        />
        <MetricCard
          title="Total de Clientes"
          value={isLoading ? "..." : totalClientsCount}
          icon={Users}
          description={isLoading ? "" : "Clientes cadastrados"}
          iconClassName="text-accent"
        />
        <MetricCard
          title="Faturamento do Mês"
          value={isLoading ? "..." : monthlyRevenue}
          icon={DollarSign}
          description={isLoading ? "" : "Receita de serviços concluídos"}
          iconClassName="text-green-500"
        />
        <MetricCard
          title="Clientes Fidelidade"
          value={isLoading ? "..." : loyaltyClientsCount}
          icon={Award}
          description={isLoading ? "" : "Com selos ou pacotes ativos"}
          iconClassName="text-yellow-500"
        />
      </div>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="font-headline text-gradient">Acesso Rápido</CardTitle>
          <CardDescription className="font-body">Atalhos para as funções mais usadas.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickAccessLinks.map(link => (
            <Button key={link.href} variant="outline" asChild className="flex flex-col h-auto items-center justify-center p-3 text-center hover:bg-accent/10 border-dashed border-border hover:border-accent">
              <Link href={link.href}>
                <link.icon className={`h-6 w-6 mb-1 ${link.color}`} />
                <span className="text-xs font-medium font-body text-foreground/80">{link.label}</span>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6 md:space-y-8">
        <AiMarketingCard />
        {/* AppointmentsToday component is removed from here */}
      </div>
    </div>
  );
}
