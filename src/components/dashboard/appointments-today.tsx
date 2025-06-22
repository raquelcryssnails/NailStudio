
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CheckCircle2, Award, XCircle, Loader2 } from "lucide-react";
import type { Appointment, Client, SalonService, ClientPackageInstance } from "@/types/firestore"; 
import { updateAppointmentFS, updateClientFS, addFinancialTransactionFS } from "@/lib/firebase/firestoreService"; 
import { parseISO, isBefore, startOfDay } from "date-fns";

const statusColors: Record<Appointment["status"], string> = {
  Agendado: "bg-blue-500 hover:bg-blue-600",
  Confirmado: "bg-green-500 hover:bg-green-600",
  Concluído: "bg-purple-500 hover:bg-purple-600", // Changed from pink to purple for distinction
  Cancelado: "bg-red-500 hover:bg-red-600",
};

interface AppointmentsTodayProps {
  appointments: Appointment[];
  isLoading: boolean;
  onAppointmentUpdate: () => void; 
  clientsList: Client[]; 
  servicesList: SalonService[]; 
}

const TOTAL_STAMPS_ON_CARD = 12; 

export function AppointmentsToday({ appointments, isLoading, onAppointmentUpdate, clientsList, servicesList }: AppointmentsTodayProps) {
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment["status"]) => {
    console.log("[AppointmentsToday] handleUpdateStatus called for appointment ID:", appointmentId, "to status:", newStatus);
    console.log("[AppointmentsToday] Received clientsList length:", clientsList?.length);
    console.log("[AppointmentsToday] Received servicesList length:", servicesList?.length);

    setUpdatingId(appointmentId);
    let overallToastMessage = "Status do agendamento atualizado.";
    let overallToastTitle = "Status Atualizado";

    try {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            console.error("[AppointmentsToday] Appointment not found:", appointmentId);
            toast({ variant: "destructive", title: "Erro", description: "Agendamento não encontrado." });
            setUpdatingId(null);
            return;
        }
        console.log(`[AppointmentsToday] Appointment found:`, appointment);

        await updateAppointmentFS(appointmentId, { status: newStatus });

        let packageServiceConsumedThisAppointment = false;
        let clientUpdatedDueToPackage = false;

        if (newStatus === "Concluído") {
            const client = clientsList.find(c => c.name.trim().toLowerCase() === appointment.clientName.trim().toLowerCase());
            console.log(`[AppointmentsToday] Handling status "Concluído" for client: "${appointment.clientName}". Client found in list:`, client ? client.name : "Nenhum cliente encontrado com este nome exato.");

            if (client && client.id) {
                console.log(`[AppointmentsToday - PackageCheck] Client ${client.name} (ID: ${client.id}) found. Checking packages...`);
                if (client.purchasedPackages && client.purchasedPackages.length > 0) {
                    console.log(`[AppointmentsToday - PackageCheck] Client has ${client.purchasedPackages.length} package(s).`);
                    const modifiableClientPackages = JSON.parse(JSON.stringify(client.purchasedPackages)) as Client["purchasedPackages"];

                    if (modifiableClientPackages) {
                        for (const serviceIdInAppointment of appointment.serviceIds) {
                            console.log(`[AppointmentsToday - PackageCheck] Checking serviceIdInAppointment: ${serviceIdInAppointment} from current appointment.`);
                            let serviceDebitedFromPackageThisIteration = false;
                            for (const pkgInstance of modifiableClientPackages) {
                                console.log(`[AppointmentsToday - PackageCheck] Evaluating package: "${pkgInstance.packageName}", Status: ${pkgInstance.status}, Expiry: ${pkgInstance.expiryDate}`);
                                const isPkgActive = pkgInstance.status === 'Ativo';
                                const isPkgNotExpired = !pkgInstance.expiryDate || !isBefore(parseISO(pkgInstance.expiryDate), startOfDay(new Date()));
                                console.log(`[AppointmentsToday - PackageCheck] Package "${pkgInstance.packageName}" IsActive: ${isPkgActive}, IsNotExpired: ${isPkgNotExpired}`);

                                if (isPkgActive && isPkgNotExpired) {
                                    const serviceInPkgIndex = pkgInstance.services.findIndex(
                                        s => s.serviceId === serviceIdInAppointment && s.remainingQuantity > 0
                                    );
                                    console.log(`[AppointmentsToday - PackageCheck] Service ${serviceIdInAppointment} found in package "${pkgInstance.packageName}" at index ${serviceInPkgIndex}. Remaining quantity: ${serviceInPkgIndex !== -1 ? pkgInstance.services[serviceInPkgIndex].remainingQuantity : 'N/A'}`);

                                    if (serviceInPkgIndex !== -1) {
                                        console.log(`[AppointmentsToday - PackageCheck] Debiting service ${serviceIdInAppointment} from package "${pkgInstance.packageName}".`);
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
                                console.log(`[AppointmentsToday - PackageCheck] Service ${serviceIdInAppointment} was debited from a package. Setting packageServiceConsumedThisAppointment = true and breaking from appointment services loop.`);
                                break; 
                            } else {
                                console.log(`[AppointmentsToday - PackageCheck] Service ${serviceIdInAppointment} was NOT debited from any package in this iteration.`);
                            }
                        }
                        if (clientUpdatedDueToPackage) {
                            console.log(`[AppointmentsToday - PackageCheck] Updating client's packages in Firestore.`);
                            await updateClientFS(client.id, { purchasedPackages: modifiableClientPackages });
                        }
                    }
                } else {
                     console.log(`[AppointmentsToday - PackageCheck] Client ${client.name} has no purchased packages.`);
                }
            } else {
                console.warn(`[AppointmentsToday] Client "${appointment.clientName}" not found in clientsList. Length of clientsList: ${clientsList?.length}. Cannot process packages or stamps.`);
                 if (newStatus === "Concluído") {
                    toast({
                        variant: "default", 
                        title: "Atenção: Cliente não Encontrado",
                        description: `O cliente "${appointment.clientName}" não foi encontrado no cadastro para processar pacotes ou selos de fidelidade. Verifique se o nome no agendamento corresponde exatamente ao nome no cadastro de clientes.`
                    });
                }
            }
            console.log(`[AppointmentsToday] Before awarding stamp logic: packageServiceConsumedThisAppointment = ${packageServiceConsumedThisAppointment}, client exists = ${!!client}, client.id exists = ${!!client?.id}`);
            
            if (!packageServiceConsumedThisAppointment && client && client.id) {
                const currentStamps = client.stampsEarned || 0;
                console.log(`[AppointmentsToday] Client ${client.name} has ${currentStamps} stamps. TOTAL_STAMPS_ON_CARD is ${TOTAL_STAMPS_ON_CARD}.`);
                if (currentStamps < TOTAL_STAMPS_ON_CARD) {
                    const newStampsValue = currentStamps + 1;
                    await updateClientFS(client.id, { stampsEarned: newStampsValue });
                    toast({
                        title: "Selo Adicionado!",
                        description: `+1 selo de fidelidade para ${client.name}. Total: ${newStampsValue}.`
                    });
                    console.log(`[AppointmentsToday] Awarded stamp to ${client.name}. New total: ${newStampsValue}`);
                } else {
                    toast({
                        title: "Cartão Completo!",
                        description: `${client.name} já completou o cartão fidelidade. Nenhum selo adicional.`
                    });
                    console.log(`[AppointmentsToday] Card already full for ${client.name}. No stamp awarded.`);
                }
            } else if (packageServiceConsumedThisAppointment && client) { 
                 toast({
                    title: "Serviço de Pacote",
                    description: `Serviço(s) consumido(s) do pacote de ${client.name}. Selo não adicionado.`
                });
                console.log(`[AppointmentsToday] Stamp not awarded for ${client.name} because it was a package service (packageServiceConsumedThisAppointment = ${packageServiceConsumedThisAppointment}).`);
            } else if (!client && !packageServiceConsumedThisAppointment && newStatus === "Concluído") {
                 toast({
                    variant: "default",
                    title: "Atenção: Cliente não Encontrado (Selo)",
                    description: `O cliente "${appointment.clientName}" não foi encontrado no cadastro para adicionar o selo de fidelidade. Verifique se o nome no agendamento corresponde exatamente ao nome no cadastro de clientes.`
                });
                console.warn(`[AppointmentsToday] Stamp not awarded for appointment client "${appointment.clientName}" because client was not found in clientsList for stamp awarding.`);
            }

            // Financial Transaction Recording
            if (appointment.totalAmount) {
                 const cleanedAmountString = String(appointment.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
                 const appointmentValue = parseFloat(cleanedAmountString);
                 console.log(`[AppointmentsToday] Attempting to record financial transaction. Original totalAmount: '${appointment.totalAmount}', Cleaned: '${cleanedAmountString}', Parsed: ${appointmentValue}`);

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
                    console.log(`[AppointmentsToday] Financial transaction of ${appointmentValue.toFixed(2)} recorded for ${appointment.clientName}.`);
                } else {
                    console.warn(`[AppointmentsToday] Could not parse totalAmount for financial transaction. Original: '${appointment.totalAmount}', Cleaned: '${cleanedAmountString}', Parsed: ${appointmentValue}`);
                }
            } else {
                 console.warn(`[AppointmentsToday] No totalAmount found for appointment ${appointment.id}. Financial transaction not recorded.`);
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
        onAppointmentUpdate(); 
    } catch (error: any) {
        console.error(`[AppointmentsToday] Error updating appointment status to ${newStatus} for apt ${appointmentId}:`, error.message, error.stack);
        toast({ variant: "destructive", title: "Erro ao Atualizar Status", description: `Não foi possível atualizar o status do agendamento. ${error.message}` });
    } finally {
        setUpdatingId(null);
    }
  };


  return (
    <Card className="shadow-xl rounded-xl overflow-hidden col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-gradient">Agenda de Hoje</CardTitle>
        </div>
        <CardDescription className="font-body">
          Acompanhe e gerencie os agendamentos programados para hoje.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 font-body text-muted-foreground">Carregando agendamentos...</p>
          </div>
        ) : appointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline text-card-foreground/80">Horário</TableHead>
                <TableHead className="font-headline text-card-foreground/80">Cliente</TableHead>
                <TableHead className="font-headline text-card-foreground/80">Serviço(s)</TableHead>
                <TableHead className="font-headline text-card-foreground/80">Status</TableHead>
                <TableHead className="text-right font-headline text-card-foreground/80">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((apt) => {
                const serviceNames = apt.serviceIds.map(id => {
                  const service = servicesList.find(s => s.id === id);
                  return service ? service.name : "Serviço Desconhecido";
                }).join(', ');
                return (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium font-body">{apt.startTime}</TableCell>
                    <TableCell className="font-body">{apt.clientName}</TableCell>
                    <TableCell className="font-body text-xs">
                      {serviceNames || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className={`${statusColors[apt.status]} text-white text-xs shadow-sm`}>
                        {apt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {updatingId === apt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {apt.status === "Agendado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-800/50"
                              onClick={() => handleUpdateStatus(apt.id, "Confirmado")}
                              title="Confirmar Agendamento"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {(apt.status === "Agendado" || apt.status === "Confirmado") && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800/50"
                                onClick={() => handleUpdateStatus(apt.id, "Concluído")}
                                title="Finalizar Agendamento"
                              >
                                <Award className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800/50"
                                onClick={() => handleUpdateStatus(apt.id, "Cancelado")}
                                title="Cancelar Agendamento"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8 font-body">Nenhum agendamento para hoje.</p>
        )}
      </CardContent>
    </Card>
  );
}
