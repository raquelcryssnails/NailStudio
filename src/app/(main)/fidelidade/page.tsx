
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Heart, Gift, Star, Circle, PlusSquare, RotateCcw, Loader2, Paintbrush2, Users } from "lucide-react"; 
import * as React from "react"; 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/firestore";
import { getClientsFS, updateClientFS } from "@/lib/firebase/firestoreService";

const stampsNeededForHeart = 3;
const heartsNeededForMimo = 1; 
const totalStampsOnCard = 12;

const cardColorPalettes = [
  { bg: 'bg-pink-50 dark:bg-pink-900/30', border: 'border-pink-500', accentText: 'text-pink-600 dark:text-pink-400', heartFill: 'fill-pink-500', heartEmpty: 'text-pink-200', mimoFill: 'fill-purple-500', mimoEmpty: 'text-purple-200', pawFill: 'text-pink-500 fill-pink-500' },
  { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-500', accentText: 'text-blue-600 dark:text-blue-400', heartFill: 'fill-blue-500', heartEmpty: 'text-blue-200', mimoFill: 'fill-indigo-500', mimoEmpty: 'text-indigo-200', pawFill: 'text-blue-500 fill-blue-500' },
  { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-500', accentText: 'text-green-600 dark:text-green-400', heartFill: 'fill-green-500', heartEmpty: 'text-green-200', mimoFill: 'fill-teal-500', mimoEmpty: 'text-teal-200', pawFill: 'text-green-500 fill-green-500' },
  { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-500', accentText: 'text-yellow-600 dark:text-yellow-400', heartFill: 'fill-yellow-500', heartEmpty: 'text-yellow-200', mimoFill: 'fill-orange-500', mimoEmpty: 'text-orange-200', pawFill: 'text-yellow-500 fill-yellow-500' },
  { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-500', accentText: 'text-purple-600 dark:text-purple-400', heartFill: 'fill-purple-500', heartEmpty: 'text-purple-200', mimoFill: 'fill-pink-500', mimoEmpty: 'text-pink-200', pawFill: 'text-purple-500 fill-purple-500' },
];


export default function FidelidadePage() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingClientId, setUpdatingClientId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchAllClientsData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedClients = await getClientsFS();
      setClients(fetchedClients);
      if (fetchedClients.length === 0) {
        toast({
          title: "Nenhum Cliente",
          description: "Nenhum cliente encontrado para exibir o programa de fidelidade. Cadastre clientes para começar.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Erro ao Carregar Clientes",
        description: "Não foi possível carregar os dados dos clientes.",
        variant: "destructive"
      });
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllClientsData();
  }, [fetchAllClientsData]);
  
  
  const handleAddStamp = async (client: Client) => {
    if (!client || !client.id || updatingClientId === client.id) return;

    const currentStamps = client.stampsEarned || 0;
    if (currentStamps < totalStampsOnCard) {
      setUpdatingClientId(client.id);
      const newStampCount = currentStamps + 1;
      try {
        await updateClientFS(client.id, { stampsEarned: newStampCount });
        // Optimistically update UI or refetch
        setClients(prevClients => prevClients.map(c => c.id === client.id ? { ...c, stampsEarned: newStampCount } : c));
        toast({
          title: "Selo Adicionado!",
          description: `${client.name} ganhou +1 selo. Total: ${newStampCount}.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao Adicionar Selo",
          description: "Não foi possível atualizar os selos do cliente.",
          variant: "destructive"
        });
      } finally {
        setUpdatingClientId(null);
      }
    } else {
      toast({
        variant: "default",
        title: "Cartão Completo!",
        description: `${client.name} já completou todos os selos do cartão.`,
      });
    }
  };

  const handleResetStamps = async (client: Client) => {
    if (!client || !client.id || updatingClientId === client.id) return;
    setUpdatingClientId(client.id);
    try {
      await updateClientFS(client.id, { stampsEarned: 0, mimosRedeemed: 0 });
      // Optimistically update UI or refetch
      setClients(prevClients => prevClients.map(c => c.id === client.id ? { ...c, stampsEarned: 0, mimosRedeemed: 0 } : c));
      toast({
        title: "Selos e Mimos Resetados!",
        description: `Os selos e mimos resgatados de ${client.name} foram zerados.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao Resetar",
        description: "Não foi possível resetar os selos e mimos do cliente.",
        variant: "destructive"
      });
    } finally {
      setUpdatingClientId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 font-body text-muted-foreground">Carregando dados de fidelidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
            <Heart className="h-6 w-6" />
            Programa de Fidelidade de Clientes
          </CardTitle>
          <CardDescription className="font-body">
            Acompanhe o progresso de fidelidade de todos os seus clientes.
            Ganhe selos a cada serviço ou compra de pacote!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="font-body text-muted-foreground text-lg">
                Nenhum cliente cadastrado ainda.
                </p>
                <p className="font-body text-muted-foreground">
                Cadastre seus clientes na página "Clientes" para começar a acompanhar o programa de fidelidade.
                </p>
                 <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                    <a href="/clientes">Ir para Clientes</a>
                </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {clients.map((client, index) => {
                const stampsEarned = client.stampsEarned || 0;
                const heartsEarned = Math.floor(stampsEarned / stampsNeededForHeart);
                const mimosTotalEarnedByClient = Math.floor(heartsEarned / heartsNeededForMimo);
                const mimosAlreadyRedeemedByClient = client.mimosRedeemed || 0;
                const mimosAvailableForClient = mimosTotalEarnedByClient - mimosAlreadyRedeemedByClient;
                const palette = cardColorPalettes[index % cardColorPalettes.length];

                return (
                  <Card key={client.id} className={cn("bg-background/50 shadow-md rounded-lg", palette.bg, palette.border, "border-t-4")}>
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className={cn("font-headline text-xl", palette.accentText)}>{client.name}</CardTitle>
                      <CardDescription className="font-body text-xs">Progresso no programa de fidelidade</CardDescription>
                    </CardHeader>
                    <CardContent className="grid lg:grid-cols-5 gap-x-4 gap-y-3 text-sm">
                      
                      <div className="lg:col-span-2 space-y-2">
                        <div> 
                          <p className="font-body">Selos: <span className={cn("font-bold", palette.accentText)}>{stampsEarned} / {totalStampsOnCard}</span></p>
                        </div>
                        
                        <div className="space-y-1.5 pt-2 border-t border-border/50"> 
                          <p className="font-headline text-xs text-muted-foreground">Recompensas:</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-body text-xs">Corações:</span>
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
                              return (
                                <Heart 
                                  key={`heart-reward-${client.id}-${i}`} 
                                  className={cn("h-5 w-5", isHeartFilledInReward ? `${palette.accentText} ${palette.heartFill}` : palette.heartEmpty )}
                                />
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-body text-xs">Mimos Ganhos:</span>
                            {Array.from({ length: Math.max(1, mimosTotalEarnedByClient) }).map((_, i) => ( 
                              <Gift 
                                key={`mimo-reward-${client.id}-${i}`} 
                                className={cn("h-5 w-5", i < mimosTotalEarnedByClient ? `${palette.mimoFill} ${palette.accentText}` : palette.mimoEmpty )}
                              />
                            ))}
                          </div>
                          <p className="font-body text-xs">Mimos Resgatados: <span className="font-medium">{mimosAlreadyRedeemedByClient}</span></p>
                          <p className="font-body text-xs">Mimos Disponíveis: <span className="font-bold text-green-600">{mimosAvailableForClient}</span></p>
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
                              slotClasses = cn(slotClasses, palette.bg.replace('bg-','bg-').replace('-50', '-100'), palette.border.replace('border-', 'border-').replace('-500', '-400'));
                              if (isMilestoneForHeart) {
                                  slotClasses = cn(slotClasses, palette.border.replace('border-', 'border-').replace('-500', '-600'), "ring-1", palette.border.replace('border-','ring-'), "ring-offset-0 animate-pulse");
                                  iconComponent = <Heart className={cn("h-4 w-4", palette.accentText, palette.heartFill)} />;
                              } else {
                                  iconComponent = <Paintbrush2 className={cn("h-4 w-4", palette.pawFill)} />;
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
                            return ( <div key={`${client.id}-stamp-${stampNumber}`} className={slotClasses} title={`Selo ${stampNumber}`}> {iconComponent} </div> );
                          })}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/50 pt-3 flex flex-col sm:flex-row justify-end gap-2">
                        <Button 
                            onClick={() => handleAddStamp(client)} 
                            disabled={!client || stampsEarned >= totalStampsOnCard || updatingClientId === client.id} 
                            size="sm"
                            className="w-full sm:w-auto font-body text-xs bg-green-600 hover:bg-green-700 text-white"
                        >
                            {updatingClientId === client.id && client.stampsEarned !== stampsEarned ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <PlusSquare className="mr-1.5 h-3.5 w-3.5" />}
                            Ganhar Selo
                        </Button>
                        <Button 
                            onClick={() => handleResetStamps(client)} 
                            variant="outline" 
                            size="sm"
                            disabled={!client || updatingClientId === client.id} 
                            className="w-full sm:w-auto font-body text-xs"
                        >
                            {updatingClientId === client.id && (client.stampsEarned !== 0 || client.mimosRedeemed !==0) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                            Resetar
                        </Button>
                    </CardFooter>
                  </Card>
                );
            })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    

    