
"use client";

import * as React from "react";
import { CalendarClock, RefreshCw, Loader2, CalendarIcon as CalendarNavIcon } from "lucide-react"; // Added CalendarNavIcon
import { AppointmentsToday } from "@/components/dashboard/appointments-today";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover
import { Calendar } from "@/components/ui/calendar"; // Added Calendar
import { format, startOfDay, isToday } from 'date-fns'; // Added startOfDay, isToday
import { getAppointmentsFS, getClientsFS, getServicesFS } from "@/lib/firebase/firestoreService";
import type { Appointment, Client, SalonService } from "@/types/firestore";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";


export default function AgendaDiariaPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [displayedAppointments, setDisplayedAppointments] = React.useState<Appointment[]>([]);
  const [clientsList, setClientsList] = React.useState<Client[]>([]);
  const [servicesList, setServicesList] = React.useState<SalonService[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(startOfDay(new Date())); // State for selected date
  const [isCalendarPopoverOpen, setIsCalendarPopoverOpen] = React.useState(false);
  const { toast } = useToast();

  const fetchPageData = React.useCallback(async (dateToFetch: Date) => {
    setIsLoading(true);
    console.log("[AgendaDiariaPage] fetchPageData called for date:", format(dateToFetch, "yyyy-MM-dd"));
    try {
      const dateStr = format(dateToFetch, "yyyy-MM-dd");
      const [allAppointments, allClients, allServices] = await Promise.all([
        getAppointmentsFS(),
        getClientsFS(),
        getServicesFS()
      ]);
      console.log("[AgendaDiariaPage] Fetched allAppointments count:", allAppointments.length);

      const filteredAppointments = allAppointments.filter(apt => apt.date === dateStr);
      console.log("[AgendaDiariaPage] Filtered appointments for", dateStr, "count:", filteredAppointments.length);

      setDisplayedAppointments(filteredAppointments);
      setClientsList(allClients);
      setServicesList(allServices);

    } catch (error) {
      console.error("[AgendaDiariaPage] Error fetching daily agenda data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar os dados da agenda para o dia selecionado." });
    } finally {
      setIsLoading(false);
      console.log("[AgendaDiariaPage] fetchPageData finished for date:", format(dateToFetch, "yyyy-MM-dd"));
    }
  }, [toast]);

  React.useEffect(() => {
    fetchPageData(selectedDate);
  }, [selectedDate, fetchPageData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    }
    setIsCalendarPopoverOpen(false);
  };

  const handleGoToToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const formattedSelectedDate = format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dayOfWeekSelected = format(selectedDate, "EEEE", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="mb-1">
          <h1 className="text-2xl font-headline text-gradient flex items-center gap-2">
            <CalendarClock className="h-6 w-6" />
            Agenda Diária
          </h1>
          <p className="text-md text-muted-foreground font-body capitalize">
            {isToday(selectedDate) ? `${dayOfWeekSelected} (Hoje), ` : `${dayOfWeekSelected}, `}
            {formattedSelectedDate}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Popover open={isCalendarPopoverOpen} onOpenChange={setIsCalendarPopoverOpen}>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal font-body",
                    !selectedDate && "text-muted-foreground"
                    )}
                >
                    <CalendarNavIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ptBR}
                />
                </PopoverContent>
            </Popover>
            {!isToday(selectedDate) && (
                 <Button variant="outline" size="sm" onClick={handleGoToToday} className="font-body w-full sm:w-auto">
                    Ir para Hoje
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchPageData(selectedDate)} disabled={isLoading} className="font-body w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Agenda
            </Button>
        </div>
      </div>
      
      <AppointmentsToday
        appointments={displayedAppointments}
        isLoading={isLoading}
        onAppointmentUpdate={() => fetchPageData(selectedDate)} 
        clientsList={clientsList}
        servicesList={servicesList}
      />
    </div>
  );
}

