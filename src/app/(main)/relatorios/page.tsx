
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Archive as PackageIcon, Loader2, RefreshCw, Scissors, DollarSign, Gift, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClientsFS, getAppointmentsFS, getServicesFS, getFinancialTransactionsFS, getProfessionalsFS } from "@/lib/firebase/firestoreService";
import type { Client, Appointment, SalonService, FinancialTransaction, Professional } from "@/types/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  faturamento: {
    totalReceitasServicos: number;
    totalOutrasReceitas: number;
    totalDespesas: number;
    lucroLiquido: number;
    dataText: string;
  };
  desempenhoServicos: {
    servicoMaisPopular: string;
    totalServicosRealizados: number;
    dataText: string;
  };
  analiseClientes: {
    totalClientesAtivos: number;
    novosClientesMes: number;
    clientesFidelidade: number;
    dataText: string;
  };
  relatorioPacotes: {
    totalPacotesVendidos: number;
    pacotesAtivos: number;
    dataText: string;
  };
  relatorioComissoes: {
    professionalMaisComissao: string;
    totalComissoesPagas: number;
    dataText: string;
  };
}

export default function RelatoriosPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const { toast } = useToast();

  const getServiceName = React.useCallback((serviceId: string, services: SalonService[]): string => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Desconhecido";
  }, []);

  const formatCurrency = React.useCallback((value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`, []);

  const fetchReportData = React.useCallback(async () => {
    setIsLoading(true);
    setReportData(null);

    try {
      const [clients, appointments, services, financialTransactions, professionals] = await Promise.all([
        getClientsFS(),
        getAppointmentsFS(),
        getServicesFS(),
        getFinancialTransactionsFS(),
        getProfessionalsFS(),
      ]);

      const today = new Date();
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);

      // Faturamento
      let totalReceitasServicos = 0;
      appointments.forEach(apt => {
        if (apt.status === "Concluído" && apt.totalAmount && apt.date) {
          if (isValid(parseISO(apt.date)) && isWithinInterval(parseISO(apt.date), { start: currentMonthStart, end: currentMonthEnd })) {
            const cleanedAmountString = String(apt.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
            const value = parseFloat(cleanedAmountString);
            if (!isNaN(value)) {
              totalReceitasServicos += value;
            }
          }
        }
      });

      let totalOutrasReceitas = 0;
      let totalDespesas = 0;
      financialTransactions.forEach(ft => {
        if (ft.date && isValid(parseISO(ft.date)) && isWithinInterval(parseISO(ft.date), { start: currentMonthStart, end: currentMonthEnd })) {
          const cleanedAmountString = String(ft.amount).replace(/R\$\s*/, '').replace(',', '.').trim();
          const value = parseFloat(cleanedAmountString);
          if (!isNaN(value)) {
            if (ft.type === 'income') {
               // Adicionar apenas se não for de serviços ou pacotes, que já são contabilizados via appointments
              if (ft.category !== "Serviços Prestados" && ft.category !== "Venda de Pacote") {
                totalOutrasReceitas += value;
              } else if (ft.category === "Venda de Pacote") { // Contabilizar vendas de pacotes como receita aqui
                totalOutrasReceitas += value;
              }
            } else if (ft.type === 'expense') {
              totalDespesas += value;
            }
          }
        }
      });
      const lucroLiquido = (totalReceitasServicos + totalOutrasReceitas) - totalDespesas;
      const faturamentoDataText = `Receitas Serviços: ${formatCurrency(totalReceitasServicos)}. Outras Receitas: ${formatCurrency(totalOutrasReceitas)}. Despesas: ${formatCurrency(totalDespesas)}. Lucro: ${formatCurrency(lucroLiquido)}.`;


      // Desempenho de Serviços
      const servicosRealizadosIds: string[] = [];
      appointments.forEach(apt => {
        if (apt.status === "Concluído" && isValid(parseISO(apt.date)) && isWithinInterval(parseISO(apt.date), { start: currentMonthStart, end: currentMonthEnd })) {
          servicosRealizadosIds.push(...apt.serviceIds);
        }
      });
      const contagemServicos: Record<string, number> = {};
      servicosRealizadosIds.forEach(id => {
        contagemServicos[id] = (contagemServicos[id] || 0) + 1;
      });
      let servicoMaisPopularId = "";
      let maxContagem = 0;
      for (const id in contagemServicos) {
        if (contagemServicos[id] > maxContagem) {
          maxContagem = contagemServicos[id];
          servicoMaisPopularId = id;
        }
      }
      const servicoMaisPopularNome = servicoMaisPopularId ? `${getServiceName(servicoMaisPopularId, services)} (${maxContagem}x)` : "Nenhum";

      // Análise de Clientes
      const totalClientesAtivos = clients.length;
      const novosClientesMes = clients.filter(client => {
        if (!client.createdAt) return false;
        const createdAtDate = client.createdAt instanceof Timestamp ? client.createdAt.toDate() : parseISO(client.createdAt as string);
        return isValid(createdAtDate) && isWithinInterval(createdAtDate, { start: currentMonthStart, end: currentMonthEnd });
      }).length;
      const clientesFidelidade = clients.filter(c => (c.stampsEarned || 0) > 0 || (c.purchasedPackages && c.purchasedPackages.length > 0)).length;

      // Relatório de Pacotes
      let totalPacotesVendidosGlobal = 0;
      let pacotesAtivosGlobal = 0;
      clients.forEach(client => {
        if (client.purchasedPackages) {
          client.purchasedPackages.forEach(pkgInstance => {
            if (isValid(parseISO(pkgInstance.purchaseDate)) && isWithinInterval(parseISO(pkgInstance.purchaseDate), {start: currentMonthStart, end: currentMonthEnd})) {
                 totalPacotesVendidosGlobal++;
            }
            if (pkgInstance.status === "Ativo") {
              pacotesAtivosGlobal++;
            }
          });
        }
      });

      // Relatório de Comissões
      const comissoesPorProfissional: Record<string, { name: string, totalComissao: number }> = {};
      appointments.forEach(apt => {
        if (apt.status === "Concluído" && apt.totalAmount && apt.professionalId && isValid(parseISO(apt.date)) && isWithinInterval(parseISO(apt.date), { start: currentMonthStart, end: currentMonthEnd })) {
          const professional = professionals.find(p => p.id === apt.professionalId);
          if (professional && typeof professional.commissionRate === 'number' && professional.commissionRate > 0) {
            
            const cleanedAmountString = String(apt.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
            const appointmentValue = parseFloat(cleanedAmountString);

            if (!isNaN(appointmentValue)) {
              const commissionAmount = appointmentValue * (professional.commissionRate / 100);
              if (!isNaN(commissionAmount)) {
                if (!comissoesPorProfissional[professional.id]) {
                  comissoesPorProfissional[professional.id] = { name: professional.name, totalComissao: 0 };
                }
                comissoesPorProfissional[professional.id].totalComissao += commissionAmount;
              } else {
                 console.warn(`[RelatoriosPage] Calculated commissionAmount is NaN for apt ${apt.id}, professional ${professional.id}. Value: ${appointmentValue}, Rate: ${professional.commissionRate}`);
              }
            } else {
              console.warn(`[RelatoriosPage] Parsed appointmentValue is NaN for apt ${apt.id}. Original totalAmount: '${apt.totalAmount}', Cleaned: '${cleanedAmountString}'`);
            }
          }
        }
      });
      const totalComissoesPagas = Object.values(comissoesPorProfissional).reduce((sum, p) => sum + (p.totalComissao || 0), 0);
      let professionalMaisComissaoNome = "Nenhuma";
      const sortedComissoes = Object.values(comissoesPorProfissional).filter(p => p.totalComissao && !isNaN(p.totalComissao)).sort((a, b) => b.totalComissao - a.totalComissao);
      if (sortedComissoes.length > 0 && sortedComissoes[0].totalComissao > 0) {
        const topProf = sortedComissoes[0];
        professionalMaisComissaoNome = `${topProf.name} (${formatCurrency(topProf.totalComissao)})`;
      }
      
      setReportData({
        faturamento: {
          totalReceitasServicos,
          totalOutrasReceitas,
          totalDespesas,
          lucroLiquido,
          dataText: faturamentoDataText
        },
        desempenhoServicos: {
          servicoMaisPopular: servicoMaisPopularNome,
          totalServicosRealizados: servicosRealizadosIds.length,
          dataText: `Mais popular: ${servicoMaisPopularNome}. Total realizados: ${servicosRealizadosIds.length}.`
        },
        analiseClientes: {
          totalClientesAtivos,
          novosClientesMes,
          clientesFidelidade,
          dataText: `Total: ${totalClientesAtivos}. Novos no mês: ${novosClientesMes}. Em fidelidade: ${clientesFidelidade}.`
        },
        relatorioPacotes: {
          totalPacotesVendidos: totalPacotesVendidosGlobal,
          pacotesAtivos: pacotesAtivosGlobal,
          dataText: `Vendidos no mês: ${totalPacotesVendidosGlobal}. Total Ativos: ${pacotesAtivosGlobal}.`
        },
        relatorioComissoes: {
          professionalMaisComissao: professionalMaisComissaoNome,
          totalComissoesPagas,
          dataText: `Maior comissão: ${professionalMaisComissaoNome}. Total pago em comissões: ${formatCurrency(totalComissoesPagas)}.`,
        }
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar os dados para os relatórios." });
      setReportData({ 
        faturamento: { dataText: "Erro ao carregar.", totalReceitasServicos:0, totalOutrasReceitas:0, totalDespesas:0, lucroLiquido:0 },
        desempenhoServicos: { dataText: "Erro ao carregar.", servicoMaisPopular: "-", totalServicosRealizados: 0 },
        analiseClientes: { dataText: "Erro ao carregar.", totalClientesAtivos: 0, novosClientesMes: 0, clientesFidelidade: 0 },
        relatorioPacotes: { dataText: "Erro ao carregar.", totalPacotesVendidos: 0, pacotesAtivos: 0 },
        relatorioComissoes: { dataText: "Erro ao carregar.", professionalMaisComissao: "-", totalComissoesPagas: 0 },
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, getServiceName, formatCurrency]);

  React.useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const renderCardContent = (
    icon: React.ElementType, 
    title: string, 
    dataText: string | undefined, 
    linkTo?: string,
    dataObjectForTitle?: any, 
    customIcon?: React.ElementType
  ) => {
    const IconComponent = customIcon || icon;
    let cardTitle = title;
    let buttonAction: React.ReactNode;

    if (title === "Relatório de Faturamento" && dataObjectForTitle) {
        cardTitle = `Relatório de Faturamento (Lucro: ${formatCurrency(dataObjectForTitle.lucroLiquido)})`;
    } else if (title === "Comissões de Profissionais" && dataObjectForTitle) { 
        cardTitle = `Comissões de Profissionais (Total: ${formatCurrency(dataObjectForTitle.totalComissoesPagas)})`;
    }

    if (linkTo) {
      buttonAction = (
        <Button asChild variant="link" className="w-full text-accent font-body">
          <Link href={linkTo}>Visualizar Detalhes</Link>
        </Button>
      );
    } else {
        buttonAction = (
            <Button variant="link" className="w-full text-accent font-body" disabled>Visualizar Detalhes</Button>
        );
    }
    
    return (
      <Card className="hover:shadow-md transition-shadow flex flex-col">
        <CardHeader className="items-center pb-3">
          <IconComponent className="h-8 w-8 text-primary mb-2" />
          <CardTitle className="font-headline text-lg text-center text-primary">{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center">
          <p className="text-sm font-body text-muted-foreground min-h-[3em] text-center px-2">
            {isLoading || !dataText ? <Loader2 className="inline mr-1 h-4 w-4 animate-spin"/> : null}
            {isLoading || !dataText ? "Carregando..." : dataText}
          </p>
        </CardContent>
        <CardFooter className="pt-3 mt-auto border-t">
            {buttonAction}
        </CardFooter>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Relatórios e Análises
                </CardTitle>
                <CardDescription className="font-body">
                Acompanhe o desempenho do seu salão com dados detalhados (referente ao mês atual).
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <Select defaultValue="this_month" disabled>
                    <SelectTrigger className="w-full md:w-[180px] focus:ring-accent font-body">
                        <SelectValue placeholder="Período do Relatório" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="this_month" className="font-body">Este Mês</SelectItem>
                    </SelectContent>
                </Select>
                 <Button variant="outline" onClick={fetchReportData} disabled={isLoading} className="font-body">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isLoading ? "Atualizando..." : "Atualizar Dados"}
                </Button>
            </div>
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8"> 
            {renderCardContent(DollarSign, "Relatório de Faturamento", reportData?.faturamento.dataText, "/fluxo-caixa", reportData?.faturamento)}
            {renderCardContent(Scissors, "Desempenho de Serviços", reportData?.desempenhoServicos.dataText, "/servicos")}
            {renderCardContent(Gift, "Análise de Clientes", reportData?.analiseClientes.dataText, "/clientes")}
            {renderCardContent(PackageIcon, "Relatório de Pacotes", reportData?.relatorioPacotes.dataText, "/pacotes")}
            {renderCardContent(Percent, "Comissões de Profissionais", reportData?.relatorioComissoes.dataText, "/relatorios/comissoes-detalhadas", reportData?.relatorioComissoes)} 
          </div>
          <p className="font-body text-muted-foreground mt-4 text-sm">
            Filtros detalhados por período e gráficos interativos para cada relatório serão implementados futuramente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
