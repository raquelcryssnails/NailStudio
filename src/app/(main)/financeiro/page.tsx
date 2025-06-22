
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, PlusCircle, CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { addFinancialTransactionFS, getAppointmentsFS, getFinancialTransactionsFS } from "@/lib/firebase/firestoreService";
import type { Appointment, FinancialTransaction } from "@/types/firestore";
import { Timestamp } from 'firebase/firestore';


const expenseFormSchema = z.object({
  description: z.string().min(3, { message: "Descrição deve ter pelo menos 3 caracteres." }),
  amount: z.string().refine(val => /^\d+([.,]\d{1,2})?$/.test(val) && parseFloat(val.replace(',', '.')) > 0, { message: "Valor inválido. Use formato como 50 ou 50,25 e deve ser maior que zero."}),
  date: z.date({ required_error: "Data é obrigatória." }),
  category: z.string().min(1, { message: "Categoria é obrigatória." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const mockExpenseCategories = ["Aluguel", "Material", "Marketing", "Contas Fixas", "Outros"];


export default function FinanceiroPage() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentMonthRevenue, setCurrentMonthRevenue] = React.useState("R$ 0,00");
  const [currentMonthExpenses, setCurrentMonthExpenses] = React.useState("R$ 0,00");
  const [currentMonthProfit, setCurrentMonthProfit] = React.useState("R$ 0,00");


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date(),
      category: "",
    },
  });

  const formatCurrencyDisplay = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const fetchFinancialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [appointments, financialTransactions] = await Promise.all([
        getAppointmentsFS(),
        getFinancialTransactionsFS()
      ]);

      const today = new Date();
      const periodStart = startOfMonth(today);
      const periodEnd = endOfMonth(today);

      let revenue = 0;
      appointments.forEach(apt => {
        if (apt.status === "Concluído" && apt.totalAmount) {
          if (apt.date && isValid(parseISO(apt.date)) && isWithinInterval(parseISO(apt.date), { start: periodStart, end: periodEnd })) {
            const cleanedAmountString = String(apt.totalAmount).replace(/R\$\s*/, '').replace(',', '.').trim();
            const value = parseFloat(cleanedAmountString);
            if (!isNaN(value)) {
              revenue += value;
            }
          }
        }
      });
      
      financialTransactions.forEach(ft => {
        if (ft.type === 'income' && ft.date) {
           if (isValid(parseISO(ft.date)) && isWithinInterval(parseISO(ft.date), { start: periodStart, end: periodEnd })) {
            const cleanedAmountString = String(ft.amount).replace(/R\$\s*/, '').replace(',', '.').trim();
            const value = parseFloat(cleanedAmountString);
            if (!isNaN(value)) {
                // Avoid double counting revenue from services if they are also logged as separate financial transactions
                if (ft.category !== "Serviços Prestados" && ft.category !== "Venda de Pacote") {
                     revenue += value;
                }
            }
           }
        }
      });


      let expenses = 0;
      financialTransactions.forEach(ft => {
        if (ft.type === 'expense' && ft.date) {
          if (isValid(parseISO(ft.date)) && isWithinInterval(parseISO(ft.date), { start: periodStart, end: periodEnd })) {
            const cleanedAmountString = String(ft.amount).replace(/R\$\s*/, '').replace(',', '.').trim();
            const value = parseFloat(cleanedAmountString);
            if (!isNaN(value)) {
              expenses += value;
            }
          }
        }
      });
      
      setCurrentMonthRevenue(formatCurrencyDisplay(revenue));
      setCurrentMonthExpenses(formatCurrencyDisplay(expenses));
      setCurrentMonthProfit(formatCurrencyDisplay(revenue - expenses));

    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados financeiros", description: "Não foi possível carregar os dados." });
      setCurrentMonthRevenue("R$ 0,00");
      setCurrentMonthExpenses("R$ 0,00");
      setCurrentMonthProfit("R$ 0,00");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);


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
      form.reset();
      setIsExpenseModalOpen(false);
      fetchFinancialData(); 
    } catch (error) {
       console.error("Error saving expense:", error);
       toast({ variant: "destructive", title: "Erro ao Registrar Despesa", description: "Não foi possível salvar a despesa." });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-grow">
                <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    Gestão Financeira
                </CardTitle>
                <CardDescription className="font-body">
                    Acompanhe as finanças do seu salão, despesas, receitas e fluxo de caixa.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto pt-2 md:pt-0">
                <Select defaultValue="current_month">
                    <SelectTrigger className="w-full sm:w-[200px] focus:ring-accent font-body">
                        <SelectValue placeholder="Período Financeiro" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="current_month" className="font-body">Este Mês</SelectItem>
                    </SelectContent>
                </Select>

                <Dialog open={isExpenseModalOpen} onOpenChange={(isOpen) => {
                    setIsExpenseModalOpen(isOpen);
                    if (!isOpen) form.reset();
                }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 whitespace-nowrap font-body">
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
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmitExpense)} className="space-y-4 py-2">
                                <FormField
                                    control={form.control}
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
                                        control={form.control}
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
                                        control={form.control}
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
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                                    control={form.control}
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
                                    <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar Despesa
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-headline text-sm text-green-700 dark:text-green-300">Faturamento Serviços (Mês)</CardTitle>
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-headline text-green-700 dark:text-green-300">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : currentMonthRevenue}</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-headline text-sm text-red-700 dark:text-red-300">Despesas (Mês)</CardTitle>
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-headline text-red-700 dark:text-red-300">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : currentMonthExpenses}</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                    <CardHeader className="pb-2">
                         <div className="flex items-center justify-between">
                            <CardTitle className="font-headline text-sm text-blue-700 dark:text-blue-300">Lucro Serviços (Mês)</CardTitle>
                            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-headline text-blue-700 dark:text-blue-300">{isLoading ? <Loader2 className="h-6 w-6 animate-spin inline-block"/> : currentMonthProfit}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-10 text-center">
                <Button variant="outline" className="font-body border-accent text-accent hover:bg-accent/10">
                    Ver Todos os Relatórios Financeiros
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
