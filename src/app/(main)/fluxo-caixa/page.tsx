
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, DollarSign, TrendingUp, TrendingDown, Printer, ListChecks, Loader2, Eye, EyeOff, CalendarIcon as CalendarIconLucide, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAppointmentsFS, getFinancialTransactionsFS, getServicesFS, addFinancialTransactionFS } from "@/lib/firebase/firestoreService";
import type { Appointment, FinancialTransaction, SalonService } from "@/types/firestore";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { Timestamp } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface CashFlowDisplayTransaction {
  id: string;
  date: string; 
  description: string;
  type: 'income' | 'expense';
  amount: number; 
  category?: string;
}

const expenseFormSchema = z.object({
  description: z.string().min(3, { message: "Descrição deve ter pelo menos 3 caracteres." }),
  amount: z.string().refine(val => /^\d+([.,]\d{1,2})?$/.test(val) && parseFloat(val.replace(',', '.')) > 0, { message: "Valor inválido. Use formato como 50 ou 50,25 e deve ser maior que zero."}),
  date: z.date({ required_error: "Data é obrigatória." }),
  category: z.string().min(1, { message: "Categoria é obrigatória." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const mockExpenseCategories = ["Aluguel", "Material", "Marketing", "Contas Fixas", "Salários", "Manutenção", "Impostos", "Outros"];


export default function FluxoCaixaPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [allMonthlyTransactions, setAllMonthlyTransactions] = React.useState<CashFlowDisplayTransaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = React.useState<CashFlowDisplayTransaction[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [totalIncome, setTotalIncome] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [netFlow, setNetFlow] = React.useState(0);
  const [showTransactions, setShowTransactions] = React.useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const { toast } = useToast();
  const { salonName } = useSettings();

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date(),
      category: "",
    },
  });

  const getSvcNameDirectlyFromFetchedData = React.useCallback((serviceId: string, servicesData: SalonService[]): string => {
    const service = servicesData.find(s => s.id === serviceId);
    return service ? service.name : "Serviço Desconhecido";
  }, []);


  const fetchCashFlowData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [appointments, financialTransactions, services] = await Promise.all([
        getAppointmentsFS(),
        getFinancialTransactionsFS(),
        getServicesFS(),
      ]);

      const today = new Date(); // For defining the current month
      const periodStart = startOfMonth(today);
      const periodEnd = endOfMonth(today);

      let currentMonthIncomeTotal = 0;
      let currentMonthExpensesTotal = 0;
      const monthlyDisplayTransactions: CashFlowDisplayTransaction[] = [];

      // Process financial transactions first to avoid double counting service-related income
      financialTransactions.forEach(ft => {
         if (ft.date && isValid(parseISO(ft.date)) && isWithinInterval(parseISO(ft.date), { start: periodStart, end: periodEnd })) {
          const cleanedAmountString = String(ft.amount).replace(/R\$\s*/, '').replace(',', '.').trim();
          const value = parseFloat(cleanedAmountString);
          if (!isNaN(value)) {
            if (ft.type === 'income') {
                 currentMonthIncomeTotal += value;
            } else if (ft.type === 'expense') {
              currentMonthExpensesTotal += value;
            }
            monthlyDisplayTransactions.push({
                id: ft.id,
                date: ft.date,
                description: ft.description,
                type: ft.type,
                amount: value,
                category: ft.category,
            });
          }
        }
      });
      
      // Note: Appointments are already being converted to financial transactions on completion.
      // So, we should primarily rely on the `financialTransactions` collection for cash flow.
      // If there's a requirement to show appointments that *haven't* yet been converted (e.g. if the conversion process could fail or be delayed),
      // then the logic to add them from `appointments` collection would be needed here, ensuring no double counting with existing financial transactions.
      // For now, the assumption is `addFinancialTransactionFS` is reliably called when an appointment is "Concluído".

      monthlyDisplayTransactions.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

      setAllMonthlyTransactions(monthlyDisplayTransactions);
      setTotalIncome(currentMonthIncomeTotal);
      setTotalExpenses(currentMonthExpensesTotal);
      setNetFlow(currentMonthIncomeTotal - currentMonthExpensesTotal);

    } catch (error) {
      console.error("Error fetching cash flow data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar os dados do fluxo de caixa." });
      setAllMonthlyTransactions([]);
      setTotalIncome(0);
      setTotalExpenses(0);
      setNetFlow(0);
    } finally {
      setIsLoading(false);
    }
  }, [toast, getSvcNameDirectlyFromFetchedData]);

  React.useEffect(() => {
    fetchCashFlowData();
  }, [fetchCashFlowData]);

  React.useEffect(() => {
    if (!selectedDate) {
      setDisplayedTransactions(allMonthlyTransactions);
    } else {
      const filtered = allMonthlyTransactions.filter(t => {
        const transactionDate = format(parseISO(t.date), "yyyy-MM-dd");
        const filterDate = format(selectedDate, "yyyy-MM-dd");
        return transactionDate === filterDate;
      });
      setDisplayedTransactions(filtered);
    }
  }, [selectedDate, allMonthlyTransactions]);

  const onSubmitExpense = async (data: ExpenseFormValues) => {
    try {
      const expenseDataToSave = {
        description: data.description,
        amount: data.amount.replace(',', '.'),
        date: format(data.date, "yyyy-MM-dd"),
        category: data.category,
        type: 'expense' as 'expense',
      };
      await addFinancialTransactionFS(expenseDataToSave);
      toast({
        title: "Despesa Registrada",
        description: `Despesa "${data.description}" de R$ ${data.amount.replace('.',',')} em ${format(data.date, "dd/MM/yyyy")} foi registrada.`,
      });
      expenseForm.reset();
      setIsExpenseModalOpen(false);
      fetchCashFlowData(); 
    } catch (error) {
       console.error("Error saving expense:", error);
       toast({ variant: "destructive", title: "Erro ao Registrar Despesa", description: "Não foi possível salvar a despesa." });
    }
  };


  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const handlePrintReport = () => {
    const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
    const displaySalonName = salonName || "NailStudio AI";
    const transactionsToPrint = selectedDate 
        ? displayedTransactions 
        : allMonthlyTransactions; 
    const reportTitle = selectedDate 
        ? `Relatório de Fluxo de Caixa - ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
        : `Relatório de Fluxo de Caixa - ${monthLabel}`;
    const periodTitle = selectedDate
        ? `Dia: ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`
        : `Período: ${monthLabel}`;


    let htmlContent = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #2c3e50; }
            .header p { margin: 5px 0; font-size: 14px; }
            .summary { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
            .summary h2 { margin-top: 0; font-size: 18px; color: #34495e; }
            .summary p { margin: 5px 0; font-size: 14px; }
            .summary p strong { color: #2980b9; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ecf0f1; color: #2c3e50; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .income-text { color: green !important; }
            .expense-text { color: red !important; }
            .print-button-container { text-align: center; margin-top: 30px; margin-bottom: 20px; }
            .print-button { padding: 10px 20px; font-size: 16px; color: white; background-color: #3498db; border: none; border-radius: 5px; cursor: pointer; }
            .print-button:hover { background-color: #2980b9; }
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; font-size: 10pt; }
              .summary { background-color: #ffffff !important; border: 1px solid #cccccc !important; box-shadow: none; }
              tr:nth-child(even) { background-color: #ffffff !important; }
              table { font-size: 9pt; }
              th, td { padding: 6px; }
              .header h1 { font-size: 20px; }
              .header p { font-size: 12px; }
              .summary h2 { font-size: 16px; }
              .summary p { font-size: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="print-button-container no-print">
            <button class="print-button" onclick="window.print()">Imprimir Relatório</button>
          </div>

          <div class="header">
            <h1>${displaySalonName}</h1>
            <p>${reportTitle}</p>
            <p>${periodTitle}</p>
          </div>

          <div class="summary">
            <h2>Resumo ${selectedDate ? 'do Dia Selecionado' : 'do Mês'}</h2>
            <p>Total de Entradas: <strong class="income-text">${formatCurrency(selectedDate ? transactionsToPrint.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) : totalIncome)}</strong></p>
            <p>Total de Saídas: <strong class="expense-text">${formatCurrency(selectedDate ? transactionsToPrint.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) : totalExpenses)}</strong></p>
            <p>Saldo: <strong>${formatCurrency(selectedDate ? transactionsToPrint.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0) : netFlow)}</strong></p>
          </div>

          <h2>Lançamentos ${selectedDate ? `do Dia ${format(selectedDate, "dd/MM/yyyy")}` : "do Mês"}</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (transactionsToPrint.length === 0) {
        htmlContent += `<tr><td colspan="5" style="text-align:center;">Nenhum lançamento para este ${selectedDate ? 'dia' : 'período'}.</td></tr>`;
    } else {
        transactionsToPrint.forEach(t => {
          htmlContent += `
            <tr>
              <td>${format(parseISO(t.date), "dd/MM/yyyy", { locale: ptBR })}</td>
              <td>${t.description}</td>
              <td>${t.category || 'N/A'}</td>
              <td><span class="${t.type === 'income' ? 'income-text' : 'expense-text'}">${t.type === 'income' ? 'Entrada' : 'Saída'}</span></td>
              <td style="text-align: right;"><span class="${t.type === 'income' ? 'income-text' : 'expense-text'}">${formatCurrency(t.amount)}</span></td>
            </tr>
          `;
        });
    }

    htmlContent += `
            </tbody>
          </table>

          <div class="print-button-container no-print" style="margin-top: 30px;">
             <button class="print-button" onclick="window.close()">Fechar Janela</button>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao Abrir Janela",
        description: "Não foi possível abrir a janela de impressão. Verifique as configurações do seu navegador (bloqueador de pop-ups).",
      });
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Fluxo de Caixa (Mês Atual)
            </CardTitle>
            <CardDescription className="font-body">
              Acompanhe as entradas e saídas financeiras do seu salão.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
            <Dialog open={isExpenseModalOpen} onOpenChange={(isOpen) => {
                setIsExpenseModalOpen(isOpen);
                if (!isOpen) expenseForm.reset();
            }}>
                <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white whitespace-nowrap font-body">
                        <PlusCircle className="mr-2 h-4 w-4" /> Registrar Despesa
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] bg-card">
                    <DialogHeader>
                    <DialogTitle className="font-headline text-gradient">Registrar Nova Despesa</DialogTitle>
                    <DialogDescription className="font-body">
                        Preencha os detalhes da despesa abaixo.
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...expenseForm}>
                        <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4 py-2">
                            <FormField
                                control={expenseForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="font-body">Descrição da Despesa</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Compra de esmaltes" {...field} className="focus:ring-accent font-body" rows={3}/>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={expenseForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-body">Valor (R$)</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Ex: 120,50" {...field} className="focus:ring-accent font-body"/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={expenseForm.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                        <FormLabel className="font-body">Data da Despesa</FormLabel>
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
                                                <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                locale={ptBR}
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={expenseForm.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="font-body">Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="focus:ring-accent font-body">
                                                <SelectValue placeholder="Selecione uma categoria" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {mockExpenseCategories.map(cat => (
                                            <SelectItem key={cat} value={cat} className="font-body">{cat}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={expenseForm.formState.isSubmitting}>
                                    {expenseForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Despesa
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal font-body",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIconLucide className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Filtrar por dia</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  month={startOfMonth(new Date())}
                  disabled={(date) => 
                    !isWithinInterval(date, { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
                  }
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button onClick={() => setSelectedDate(undefined)} variant="ghost" size="sm" className="font-body text-xs">
                Limpar Filtro Dia
              </Button>
            )}
            <Button onClick={handlePrintReport} variant="outline" className="font-body w-full sm:w-auto">
              <Printer className="mr-2 h-4 w-4" />
              Relatório
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-md transition-shadow bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-sm text-green-700 dark:text-green-300">Total de Entradas (Mês)</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-headline text-green-700 dark:text-green-300">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : formatCurrency(totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-sm text-red-700 dark:text-red-300">Total de Saídas (Mês)</CardTitle>
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-headline text-red-700 dark:text-red-300">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : formatCurrency(totalExpenses)}
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-sm text-blue-700 dark:text-blue-300">Saldo do Mês</CardTitle>
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-bold font-headline", netFlow >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300")}>
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : formatCurrency(netFlow)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-headline text-lg text-primary flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />
                    Lançamentos {selectedDate ? `do Dia ${format(selectedDate, "dd/MM/yyyy", {locale: ptBR})}` : "do Mês"}
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransactions(!showTransactions)}
                    className="font-body text-sm"
                >
                    {showTransactions ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showTransactions ? "Ocultar Lançamentos" : "Mostrar Lançamentos"}
                </Button>
            </CardHeader>
            {showTransactions && (
              <CardContent>
              {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-2 font-body text-muted-foreground">Carregando lançamentos...</p>
                  </div>
              ) : displayedTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 font-body">
                    Nenhum lançamento encontrado para {selectedDate ? `o dia ${format(selectedDate, "dd/MM/yyyy")}` : "o mês atual"}.
                  </p>
              ) : (
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                          <TableRow>
                              <TableHead className="font-headline">Data</TableHead>
                              <TableHead className="font-headline">Descrição</TableHead>
                              <TableHead className="font-headline hidden md:table-cell">Categoria</TableHead>
                              <TableHead className="font-headline text-right">Tipo</TableHead>
                              <TableHead className="font-headline text-right">Valor</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {displayedTransactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                              <TableCell className="font-body">{format(parseISO(transaction.date), "dd/MM/yyyy", {locale: ptBR})}</TableCell>
                              <TableCell className="font-body">{transaction.description}</TableCell>
                              <TableCell className="font-body hidden md:table-cell">{transaction.category || 'N/A'}</TableCell>
                              <TableCell className="text-right">
                                  <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                         className={cn(transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300')}>
                                  {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                                  </Badge>
                              </TableCell>
                              <TableCell className={cn("font-body text-right font-semibold", transaction.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                                  {formatCurrency(transaction.amount)}
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
        </CardContent>
      </Card>
    </div>
  );
}
