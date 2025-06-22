
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Loader2, Gift, Heart, Circle, CalendarPlus, MessageSquare, PawPrint, Star, History, Eye, EyeOff, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { updateClientFS, getAppointmentsFS, getServicesFS, type Appointment, type SalonService } from "@/lib/firebase/firestoreService";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSettings } from "@/contexts/SettingsContext"; // Updated import


const stampsNeededForHeart = 3;
const heartsNeededForMimo = 1;
const totalStampsOnCard = 12;
const WHATSAPP_NUMBER = "19996959490"; // Default number, can be configured elsewhere too


const cardColorPalette = {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    border: 'border-pink-500',
    accentText: 'text-pink-600 dark:text-pink-400',
    heartFill: 'fill-pink-500',
    heartEmpty: 'text-pink-200',
    mimoFill: 'fill-purple-500',
    mimoEmpty: 'text-purple-200',
    pawFill: 'text-pink-500 fill-pink-500'
};

const appointmentStatusStyles: Record<Appointment["status"], string> = {
  Agendado: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  Confirmado: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  Concluído: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700",
  Cancelado: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
};


export default function ClientDashboardPage() {
  const { currentClient, isLoadingClient, refreshCurrentClient } = useClientAuth();
  const { whatsappSchedulingMessage: adminDefinedMessage } = useSettings(); // Get message from settings
  const { toast } = useToast();
  const [isRedeemingMimo, setIsRedeemingMimo] = React.useState(false);
  const [clientAppointments, setClientAppointments] = React.useState<Appointment[]>([]);
  const [servicesList, setServicesList] = React.useState<SalonService[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = React.useState(true);
  const [showAppointments, setShowAppointments] = React.useState(true); 

  const DEFAULT_WHATSAPP_MESSAGE = "Olá! Gostaria de agendar um horário no NailStudio AI.";
  const WHATSAPP_MESSAGE_TO_USE = adminDefinedMessage || DEFAULT_WHATSAPP_MESSAGE;

  React.useEffect(() => {
    const fetchClientData = async () => {
      if (currentClient && currentClient.name) {
        setIsLoadingAppointments(true);
        try {
          const [allAppointments, allServices] = await Promise.all([
            getAppointmentsFS(),
            getServicesFS()
          ]);

          const filteredAppointments = allAppointments.filter(
            (apt) => apt.clientName.toLowerCase() === currentClient.name.toLowerCase()
          );
          
          filteredAppointments.sort((a, b) => {
            const statusOrder = (status: Appointment["status"]) => {
                if (status === "Concluído" || status === "Cancelado") return 1;
                return 0;
            };
            const aStatusOrder = statusOrder(a.status);
            const bStatusOrder = statusOrder(b.status);

            if (aStatusOrder !== bStatusOrder) {
                return aStatusOrder - bStatusOrder;
            }
            
            const dateA = parseISO(a.date + 'T' + a.startTime);
            const dateB = parseISO(b.date + 'T' + b.startTime);
            if (isValid(dateA) && isValid(dateB)) {
                 return dateB.getTime() - dateA.getTime(); 
            }
            return 0;
          });


          setClientAppointments(filteredAppointments);
          setServicesList(allServices);

        } catch (error) {
          console.error("Error fetching client appointments or services:", error);
          toast({ variant: "destructive", title: "Erro ao Carregar Agendamentos", description: "Não foi possível buscar seus agendamentos." });
        } finally {
          setIsLoadingAppointments(false);
        }
      } else {
        setIsLoadingAppointments(false);
        setClientAppointments([]);
        setServicesList([]);
      }
    };

    if (!isLoadingClient) { 
        fetchClientData();
    }
  }, [currentClient, isLoadingClient, toast]);

  const getServiceNames = (serviceIds: string[]): string => {
    if (!servicesList || servicesList.length === 0) return "Serviços...";
    const names = serviceIds.map(id => {
      const service = servicesList.find(s => s.id === id);
      return service ? service.name : "Desconhecido";
    });
    if (names.length > 1) return `${names[0]} (+${names.length - 1})`;
    return names[0] || "Nenhum serviço";
  };


  if (isLoadingClient || (!currentClient && !isLoadingClient)) { 
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="font-body text-muted-foreground">
          {isLoadingClient ? "Carregando seus dados..." : "Por favor, faça login para acessar seu painel."}
        </p>
      </div>
    );
  }
  
  if (!currentClient) { 
     return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
        <UserCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="font-body text-destructive-foreground">
          Não foi possível carregar seu perfil de cliente. Tente fazer login novamente.
        </p>
         <Button asChild className="mt-4"><Link href="/client/login">Ir para Login</Link></Button>
      </div>
    );
  }


  const { name, stampsEarned = 0, mimosRedeemed = 0 } = currentClient;
  const heartsEarned = Math.floor(stampsEarned / stampsNeededForHeart);
  const mimosTotalEarnedByClient = Math.floor(heartsEarned / heartsNeededForMimo);
  const mimosAvailableForClient = mimosTotalEarnedByClient - mimosRedeemed;

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE_TO_USE)}`;

  const handleRedeemMimo = async () => {
    if (!currentClient || !currentClient.id || mimosAvailableForClient <= 0) {
      toast({ variant: "destructive", title: "Sem Mimos", description: "Você não tem mimos disponíveis para resgate." });
      return;
    }
    setIsRedeemingMimo(true);
    try {
      const newMimosRedeemedCount = (currentClient.mimosRedeemed || 0) + 1;
      await updateClientFS(currentClient.id, { mimosRedeemed: newMimosRedeemedCount });
      await refreshCurrentClient(); 
      toast({
        title: "Mimo Resgatado!",
        description: "Parabéns! Você resgatou um mimo. Aproveite!",
      });
    } catch (error) {
      console.error("Error redeeming mimo:", error);
      toast({ variant: "destructive", title: "Erro ao Resgatar", description: "Não foi possível resgatar seu mimo. Tente novamente." });
    } finally {
      setIsRedeemingMimo(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <Card className="shadow-xl rounded-xl border border-border overflow-hidden">
        <CardHeader className="bg-card/50 p-6">
          <CardTitle className="font-headline text-3xl text-gradient">
            Olá, {name}!
          </CardTitle>
          <CardDescription className="font-body text-lg text-muted-foreground">
            Bem-vindo(a) ao seu espaço de beleza e bem-estar no NailStudio AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
                <h3 className="font-headline text-xl text-primary mb-4">Seu Cartão Fidelidade</h3>
                <Card className={cn("shadow-md rounded-lg", cardColorPalette.bg, cardColorPalette.border, "border-t-4")}>
                    <CardHeader className="pb-3 pt-4">
                        <CardTitle className={cn("font-headline text-lg", cardColorPalette.accentText)}>{name}</CardTitle>
                        <CardDescription className="font-body text-xs">Seu progresso no programa de fidelidade</CardDescription>
                    </CardHeader>
                    <CardContent className="grid lg:grid-cols-5 gap-x-4 gap-y-3 text-sm">
                        <div className="lg:col-span-2 space-y-2">
                            <div>
                                <p className="font-body">Selos: <span className={cn("font-bold", cardColorPalette.accentText)}>{stampsEarned} / {totalStampsOnCard}</span></p>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-border/50">
                                <p className="font-headline text-xs text-muted-foreground">Suas Recompensas:</p>
                                <div className="flex items-center gap-1.5">
                                <span className="font-body text-xs">Corações (<Heart className={cn("inline h-3 w-3", cardColorPalette.accentText)} />):</span>
                                    {Array.from({ length: heartsNeededForMimo }).map((_, i) => {
                                        let isHeartFilledInReward = false;
                                        if (mimosTotalEarnedByClient > 0 && stampsEarned >= totalStampsOnCard) {
                                            isHeartFilledInReward = true;
                                        } else {
                                            const heartsCountInCurrentMimoCycle = heartsEarned % heartsNeededForMimo;
                                            if (heartsCountInCurrentMimoCycle === 0 && heartsEarned > 0 && stampsEarned < totalStampsOnCard && stampsEarned > 0) {
                                                isHeartFilledInReward = true;
                                            } else {
                                                isHeartFilledInReward = i < heartsCountInCurrentMimoCycle;
                                            }
                                        }
                                        return ( <Heart key={`client-heart-reward-${i}`} className={cn("h-5 w-5", isHeartFilledInReward ? `${cardColorPalette.accentText} ${cardColorPalette.heartFill}` : cardColorPalette.heartEmpty )} /> );
                                    })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                <span className="font-body text-xs">Mimos (<Gift className={cn("inline h-3 w-3", cardColorPalette.accentText)} />):</span>
                                    {Array.from({ length: Math.max(1, mimosTotalEarnedByClient) }).map((_, i) => (
                                        <Gift key={`client-mimo-reward-${i}`} className={cn("h-5 w-5", i < mimosTotalEarnedByClient ? `${cardColorPalette.mimoFill} ${cardColorPalette.accentText}` : cardColorPalette.mimoEmpty )} />
                                    ))}
                                </div>
                                <p className="font-body text-xs">Mimos Resgatados: <span className="font-medium">{mimosRedeemed}</span></p>
                                <p className="font-body text-xs">Mimos Disponíveis: <span className="font-bold text-green-600">{mimosAvailableForClient}</span></p>
                                {mimosAvailableForClient > 0 && (
                                    <Button 
                                        onClick={handleRedeemMimo} 
                                        disabled={isRedeemingMimo}
                                        size="sm"
                                        className="w-full mt-2 font-body text-xs bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                        {isRedeemingMimo ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Gift className="mr-1.5 h-3.5 w-3.5" />}
                                        Resgatar Mimo!
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                        <p className="font-headline text-xs text-muted-foreground mb-1.5">Cartão de Selos:</p>
                            <div className="grid grid-cols-6 gap-1.5 p-2 border border-border/30 rounded-md bg-muted/20">
                            {Array.from({ length: totalStampsOnCard }).map((_, index) => {
                                const stampNumber = index + 1;
                                const isEarned = stampNumber <= stampsEarned;
                                const isMilestoneForHeart = stampNumber % stampsNeededForHeart === 0;

                                let slotClasses = "aspect-square rounded border flex items-center justify-center transition-all duration-300 shadow-xs";
                                let iconComponent;

                                if (isEarned) {
                                    slotClasses = cn(slotClasses, cardColorPalette.bg.replace('bg-','bg-').replace('-50', '-100'), cardColorPalette.border.replace('border-', 'border-').replace('-500', '-400'));
                                    if (isMilestoneForHeart) {
                                        slotClasses = cn(slotClasses, cardColorPalette.border.replace('border-', 'border-').replace('-500', '-600'), "ring-1", cardColorPalette.border.replace('border-','ring-'), "ring-offset-0 animate-pulse");
                                        iconComponent = <Heart className={cn("h-4 w-4", cardColorPalette.accentText, cardColorPalette.heartFill)} />;
                                    } else {
                                        iconComponent = <PawPrint className={cn("h-4 w-4", cardColorPalette.pawFill)} />;
                                    }
                                } else {
                                    slotClasses = cn(slotClasses, "bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700 border-dashed");
                                    if (isMilestoneForHeart) {
                                        slotClasses = cn(slotClasses, "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-700/20");
                                        iconComponent = <Star className="h-4 w-4 text-yellow-500 opacity-60" />;
                                    } else {
                                        iconComponent = <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-60" />;
                                    }
                                }
                                return ( <div key={`client-stamp-${stampNumber}`} className={slotClasses} title={`Selo ${stampNumber}`}> {iconComponent} </div> );
                            })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <div>
                    <h3 className="font-headline text-xl text-primary mb-3">Próximos Passos</h3>
                     <Button
                        asChild
                        className="w-full py-6 text-lg font-body bg-green-500 hover:bg-green-600 text-white shadow-md"
                    >
                        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="mr-2 h-5 w-5" /> Agendar Horário via WhatsApp
                        </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center font-body">
                        Clique para abrir uma conversa e agendar seu próximo momento de cuidado.
                    </p>
                </div>
                 <Card className="bg-card/30">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="font-headline text-md text-accent flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Meus Agendamentos
                        </CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowAppointments(!showAppointments)}
                            className="font-body text-xs"
                        >
                            {showAppointments ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                            {showAppointments ? "Ocultar" : "Mostrar"}
                        </Button>
                    </CardHeader>
                    {showAppointments && (
                        <CardContent>
                            {isLoadingAppointments ? (
                                <div className="flex justify-center items-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <p className="ml-2 font-body text-muted-foreground">Buscando seus agendamentos...</p>
                                </div>
                            ) : clientAppointments.length === 0 ? (
                                <p className="font-body text-sm text-muted-foreground text-center py-4">
                                    Você ainda não possui agendamentos.
                                </p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto pr-2">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm">
                                            <TableRow>
                                                <TableHead className="font-body text-xs p-2">Data</TableHead>
                                                <TableHead className="font-body text-xs p-2">Serviço(s)</TableHead>
                                                <TableHead className="font-body text-xs p-2 text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clientAppointments.map(apt => (
                                                <TableRow key={apt.id}>
                                                    <TableCell className="font-body text-xs p-2">
                                                        {isValid(parseISO(apt.date)) ? format(parseISO(apt.date), "dd/MM/yy", { locale: ptBR }) : 'Data inválida'} às {apt.startTime}
                                                    </TableCell>
                                                    <TableCell className="font-body text-xs p-2">{getServiceNames(apt.serviceIds)}</TableCell>
                                                    <TableCell className="text-right p-2">
                                                        <Badge variant="outline" className={cn("text-xs", appointmentStatusStyles[apt.status])}>
                                                            {apt.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-card/30 border-t border-border">
            <p className="text-sm text-muted-foreground font-body text-center w-full">
                Agradecemos a sua preferência! <Heart className="inline h-4 w-4 text-pink-500" />
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
