
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Package, PlusCircle, Edit3, Trash2, ShoppingBag, Archive as ArchiveIcon, Plus, X, Users, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getServicesFS, addPackageFS, getPackagesFS, updatePackageFS, deletePackageFS, getClientsFS } from "@/lib/firebase/firestoreService";
import type { SalonPackage, SalonService, Client, ClientPackageInstance } from "@/types/firestore";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";


const packageFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Nome do pacote deve ter pelo menos 3 caracteres." }),
  shortDescription: z.string().optional(),
  services: z.array(
    z.object({
      serviceId: z.string().min(1, "Selecione um serviço."),
      quantity: z.coerce.number().int().min(1, "Quantidade deve ser pelo menos 1.")
    })
  ).nonempty({ message: "Adicione pelo menos um serviço ao pacote." }),
  price: z.string().refine(val => /^\d+([.,]\d{2})?$/.test(val) || /^\d+$/.test(val), { message: "Preço inválido. Use formato como 180 ou 180,00." }),
  originalPrice: z.string().refine(val => val === "" || /^\d+([.,]\d{2})?$/.test(val) || /^\d+$/.test(val), { message: "Preço original inválido." }).optional().or(z.literal('')),
  validityDays: z.coerce.number().int().min(0, "Validade deve ser um número positivo.").optional(),
  status: z.string().optional(),
  themeColor: z.enum(['primary', 'accent']).optional(),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

interface SoldPackageInstanceView extends ClientPackageInstance {
  clientName: string;
  clientId: string;
}

export default function PacotesPage() {
  const [packages, setPackages] = React.useState<SalonPackage[]>([]);
  const [availableServices, setAvailableServices] = React.useState<SalonService[]>([]);
  const [clientsList, setClientsList] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPackageModalOpen, setIsPackageModalOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState<SalonPackage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [packageToDeleteId, setPackageToDeleteId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("disponiveis");
  const { toast } = useToast();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      shortDescription: "",
      services: [],
      price: "",
      originalPrice: "",
      validityDays: 90,
      status: "Ativo",
      themeColor: "primary",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "services"
  });

  const [newServiceSelection, setNewServiceSelection] = React.useState<{ serviceId: string; quantity: string }>({ serviceId: "", quantity: "1" });


  const fetchAllData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPackages, fetchedServices, fetchedClients] = await Promise.all([
        getPackagesFS(),
        getServicesFS(),
        getClientsFS()
      ]);
      setPackages(fetchedPackages);
      setAvailableServices(fetchedServices);
      setClientsList(fetchedClients);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar pacotes, serviços ou clientes." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);


  const handleAddNewPackage = () => {
    setEditingPackage(null);
    form.reset({ name: "", shortDescription: "", services: [], price: "", originalPrice: "", validityDays: 90, status: "Ativo", themeColor: "primary" });
    setNewServiceSelection({ serviceId: "", quantity: "1" });
    setIsPackageModalOpen(true);
  };

  const handleEditPackage = (pkg: SalonPackage) => {
    setEditingPackage(pkg);
    form.reset({
      id: pkg.id,
      name: pkg.name,
      shortDescription: pkg.shortDescription || "",
      services: pkg.services.map(s => ({ serviceId: s.serviceId, quantity: s.quantity })),
      price: pkg.price.replace('.', ','),
      originalPrice: pkg.originalPrice?.replace('.', ',') || "",
      validityDays: pkg.validityDays || 90,
      status: pkg.status || "Ativo",
      themeColor: pkg.themeColor || "primary",
    });
    setNewServiceSelection({ serviceId: "", quantity: "1" });
    setIsPackageModalOpen(true);
  };

  const handleDeletePackage = (pkgId: string) => {
    setPackageToDeleteId(pkgId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeletePackage = async () => {
    if (packageToDeleteId) {
      try {
        await deletePackageFS(packageToDeleteId);
        toast({ title: "Pacote Removido", description: "O pacote foi removido com sucesso." });
        fetchAllData();
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover o pacote." });
      }
    }
    setPackageToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const onSubmitPackage = async (data: PackageFormValues) => {
    const priceFormatted = data.price.replace(',', '.');
    const originalPriceFormatted = data.originalPrice?.replace(',', '.');

    const packageData: Omit<SalonPackage, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      shortDescription: data.shortDescription,
      services: data.services.map(s => ({ serviceId: s.serviceId, quantity: s.quantity })),
      price: priceFormatted,
      originalPrice: originalPriceFormatted || undefined,
      validityDays: data.validityDays,
      status: data.status,
      themeColor: data.themeColor,
    };

    try {
      if (editingPackage && editingPackage.id) {
        await updatePackageFS(editingPackage.id, packageData);
        toast({ title: "Pacote Atualizado", description: "O pacote foi atualizado com sucesso." });
      } else {
        await addPackageFS(packageData);
        toast({ title: "Pacote Criado", description: "Novo pacote adicionado com sucesso." });
      }
      fetchAllData();
      setIsPackageModalOpen(false);
      form.reset();
      setEditingPackage(null);
    } catch (error) {
      console.error("Error saving package:", error);
      toast({ variant: "destructive", title: "Erro ao salvar pacote", description: "Não foi possível salvar o pacote." });
    }
  };

  const handleAddServiceToForm = () => {
    if (!newServiceSelection.serviceId) {
      toast({ variant: "destructive", title: "Seleção Inválida", description: "Por favor, selecione um serviço." });
      return;
    }
    const quantity = parseInt(newServiceSelection.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast({ variant: "destructive", title: "Quantidade Inválida", description: "Por favor, insira uma quantidade válida (mínimo 1)." });
      return;
    }
    const existingServiceIndex = fields.findIndex(field => field.serviceId === newServiceSelection.serviceId);
    if (existingServiceIndex !== -1) {
      update(existingServiceIndex, { serviceId: newServiceSelection.serviceId, quantity: fields[existingServiceIndex].quantity + quantity });
    } else {
      append({ serviceId: newServiceSelection.serviceId, quantity: quantity });
    }
    setNewServiceSelection({ serviceId: "", quantity: "1" });
  };

  const getServiceNameById = (serviceId: string): string => {
    const service = availableServices.find(s => s.id === serviceId);
    return service ? service.name : "Serviço Desconhecido";
  };

  const getBorderColorClass = (themeColor?: 'primary' | 'accent') => {
    if (themeColor === 'primary') return 'border-primary';
    if (themeColor === 'accent') return 'border-yellow-400'; 
    return 'border-border';
  };

  const getIconColorClass = (themeColor?: 'primary' | 'accent') => {
    if (themeColor === 'primary') return 'text-primary';
    if (themeColor === 'accent') return 'text-yellow-500'; 
    return 'text-muted-foreground';
  };

  const soldPackageInstances: SoldPackageInstanceView[] = React.useMemo(() => {
    const allSold: SoldPackageInstanceView[] = [];
    clientsList.forEach(client => {
      if (client.purchasedPackages && client.purchasedPackages.length > 0) {
        client.purchasedPackages.forEach(pkgInstance => {
          allSold.push({
            ...pkgInstance,
            clientName: client.name,
            clientId: client.id,
          });
        });
      }
    });
    return allSold.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [clientsList]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline text-2xl text-gradient flex items-center gap-2">
            <Package className="h-6 w-6" />
            Pacotes de Serviços
          </h1>
          <p className="font-body text-muted-foreground">
            Crie combos e gerencie pacotes vendidos.
          </p>
        </div>
        <Button onClick={handleAddNewPackage} className="bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 font-body">
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Pacote
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="disponiveis" className="font-body text-sm flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingBag className="h-4 w-4" /> Pacotes Disponíveis
          </TabsTrigger>
          <TabsTrigger value="vendidos" className="font-body text-sm flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArchiveIcon className="h-4 w-4" /> Pacotes Vendidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disponiveis">
          {isLoading ? (
            <p className="font-body text-muted-foreground my-4 text-center">Carregando pacotes...</p>
          ) : packages.length === 0 ? (
            <p className="font-body text-muted-foreground mt-8 text-center">
              Nenhum pacote disponível cadastrado. Clique em "Novo Pacote" para começar.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map(pkg => (
                <Card key={pkg.id} className={cn("hover:shadow-lg transition-shadow flex flex-col border-t-4", getBorderColorClass(pkg.themeColor))}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-headline text-xl text-foreground">{pkg.name}</CardTitle>
                        {pkg.shortDescription && <CardDescription className="font-body text-xs text-muted-foreground mt-1">{pkg.shortDescription}</CardDescription>}
                      </div>
                      <Package className={cn("h-7 w-7 opacity-70", getIconColorClass(pkg.themeColor))} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 pt-0">
                    <div>
                      {pkg.originalPrice && pkg.originalPrice !== "0,00" && pkg.originalPrice !== "0.00" && (
                        <p className="text-xs font-body text-muted-foreground">Preço individual: R$ {pkg.originalPrice.replace('.',',')}</p>
                      )}
                      <p className="font-body text-sm">
                        Preço do pacote:
                        <span className="text-xl font-bold font-headline text-green-600 ml-1">R$ {pkg.price.replace('.',',')}</span>
                      </p>
                    </div>
                    <div className="border-t pt-2">
                      <h4 className="text-xs font-bold font-body text-muted-foreground mb-1">SERVIÇOS INCLUSOS:</h4>
                      <ul className="space-y-0.5">
                        {pkg.services.map((serviceItem, index) => (
                          <li key={`${pkg.id}-service-${index}-${serviceItem.serviceId}`} className="text-xs font-body text-foreground flex justify-between">
                            <span>{getServiceNameById(serviceItem.serviceId)}</span>
                            <span className="font-semibold">{serviceItem.quantity}x</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {pkg.validityDays && (
                      <p className="text-xs font-body text-muted-foreground pt-1 border-t">Validade: {pkg.validityDays} dias após a compra</p>
                    )}
                    {pkg.status && (
                      <Badge variant={pkg.status === "Ativo" ? "default" : "secondary"} className={cn("text-xs", pkg.status === "Ativo" ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300")}>
                        {pkg.status}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-3 mt-auto">
                    <div className="flex w-full justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditPackage(pkg)} className="font-body text-xs">
                        <Edit3 className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePackage(pkg.id)} className="font-body text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="mr-1 h-3 w-3" /> Remover
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="vendidos">
          {isLoading ? (
            <p className="font-body text-muted-foreground my-4 text-center">Carregando pacotes vendidos...</p>
          ) : soldPackageInstances.length === 0 ? (
            <p className="font-body text-muted-foreground mt-8 text-center">
              Nenhum pacote foi vendido ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {soldPackageInstances.map((pkgInstance, index) => {
                const totalServicesInPackage = pkgInstance.services.reduce((acc, s) => acc + s.totalQuantity, 0);
                const usedServicesInPackage = pkgInstance.services.reduce((acc, s) => acc + (s.totalQuantity - s.remainingQuantity), 0);
                const overallProgress = totalServicesInPackage > 0 ? (usedServicesInPackage / totalServicesInPackage) * 100 : 0;

                return (
                <Card key={`${pkgInstance.packageId}-${pkgInstance.clientId}-${index}`} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <ArchiveIcon className="h-8 w-8 text-primary opacity-80" />
                        <div>
                          <CardTitle className="font-headline text-lg text-foreground">{pkgInstance.packageName}</CardTitle>
                          <div className="font-body text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Users className="h-4 w-4" />
                            <span>{pkgInstance.clientName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn("text-xs", pkgInstance.status === "Ativo" ? "bg-green-100 text-green-700 border-green-300" : pkgInstance.status === "Expirado" ? "bg-yellow-100 text-yellow-700 border-yellow-300" : "bg-red-100 text-red-700 border-red-300")}>
                          {pkgInstance.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">+1 selo dado na compra</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 grid md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Coluna de Informações da Compra */}
                    <div className="space-y-2 text-sm font-body">
                      <h4 className="font-headline text-md text-primary mb-1.5">Informações da Compra</h4>
                      <div className="flex justify-between"><span>Data da compra:</span> <span className="font-medium">{format(parseISO(pkgInstance.purchaseDate), "dd/MM/yyyy", {locale: ptBR})}</span></div>
                      <div className="flex justify-between"><span>Validade:</span> <span className="font-medium">{format(parseISO(pkgInstance.expiryDate), "dd/MM/yyyy", {locale: ptBR})}</span></div>
                      <div className="flex justify-between"><span>Valor pago:</span> <span className="font-medium text-green-700">R$ {pkgInstance.paidPrice.replace('.',',')}</span></div>
                      {/* Pagamento: omitido por enquanto */}
                    </div>

                    {/* Coluna de Utilização dos Serviços */}
                    <div className="space-y-2 text-sm font-body">
                       <h4 className="font-headline text-md text-primary mb-1.5">Utilização dos Serviços</h4>
                       <div className="flex justify-between items-center">
                         <span>Progresso geral:</span>
                         <span className="font-medium text-accent">{overallProgress.toFixed(0)}%</span>
                       </div>
                       <Progress value={overallProgress} className="h-2 [&>div]:bg-accent" />
                       <div className="space-y-2.5 pt-2">
                        {pkgInstance.services.map((serviceItem, srvIdx) => {
                          const serviceProgress = serviceItem.totalQuantity > 0 ? ((serviceItem.totalQuantity - serviceItem.remainingQuantity) / serviceItem.totalQuantity) * 100 : 0;
                          const isServiceFullyUsed = serviceItem.remainingQuantity === 0;
                          return (
                            <div key={`${pkgInstance.packageId}-sold-${serviceItem.serviceId}-${srvIdx}`}>
                              <div className="flex justify-between items-center text-xs mb-0.5">
                                <span className="text-muted-foreground">{getServiceNameById(serviceItem.serviceId)} (Pacote)</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{serviceItem.totalQuantity - serviceItem.remainingQuantity}/{serviceItem.totalQuantity}</span>
                                  {isServiceFullyUsed && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                                </div>
                              </div>
                              <Progress value={serviceProgress} className="h-1.5" />
                            </div>
                          );
                        })}
                       </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isPackageModalOpen} onOpenChange={(isOpen) => {
        setIsPackageModalOpen(isOpen);
        if (!isOpen) { form.reset(); setEditingPackage(null); }
      }}>
        <DialogContent className="sm:max-w-[600px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-gradient">{editingPackage ? "Editar Pacote" : "Criar Novo Pacote"}</DialogTitle>
            <DialogDescription className="font-body">
              {editingPackage ? "Altere os dados do pacote abaixo." : "Preencha os dados para criar um novo pacote."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPackage)} className="flex flex-col max-h-[80vh]">
              <div className="space-y-4 py-2 pr-1 overflow-y-auto flex-grow">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Nome do Pacote</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pacote Manicure Premium" {...field} className="focus:ring-accent font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Descrição Curta (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manicure completa e pedicure relaxante." {...field} className="focus:ring-accent font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="font-body">Serviços Inclusos no Pacote</FormLabel>
                  {fields.length === 0 && <p className="text-sm text-muted-foreground font-body">Nenhum serviço adicionado ainda.</p>}
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <span className="flex-grow font-body text-sm">{getServiceNameById(item.serviceId)}</span>
                      <Controller
                        control={form.control}
                        name={`services.${index}.quantity`}
                        render={({ field: qtyField }) => (
                          <Input
                            type="number"
                            min="1"
                            {...qtyField}
                            onChange={e => qtyField.onChange(parseInt(e.target.value, 10) || 1)}
                            className="w-20 h-8 focus:ring-accent font-body text-sm"
                          />
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8">
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                   <FormField name="services" control={form.control} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />

                  <div className="flex items-end gap-2 pt-2 border-t mt-3">
                    <div className="flex-grow">
                       <Label className="font-body text-xs">Serviço</Label>
                        <Select
                            value={newServiceSelection.serviceId}
                            onValueChange={(value) => setNewServiceSelection(prev => ({ ...prev, serviceId: value }))}
                        >
                            <SelectTrigger className="h-9 focus:ring-accent font-body text-sm">
                                <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableServices.map(service => (
                                <SelectItem key={service.id} value={service.id} className="font-body text-sm">{service.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-24">
                        <Label className="font-body text-xs">Qtd.</Label>
                        <Input
                            type="number"
                            min="1"
                            value={newServiceSelection.quantity}
                            onChange={(e) => setNewServiceSelection(prev => ({ ...prev, quantity: e.target.value }))}
                            className="h-9 focus:ring-accent font-body text-sm"
                        />
                    </div>
                    <Button type="button" onClick={handleAddServiceToForm} variant="outline" size="icon" className="h-9 w-9 border-primary text-primary hover:bg-primary/10">
                        <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Preço do Pacote (R$)</FormLabel>
                      <FormControl><Input placeholder="Ex: 150,00" {...field} className="focus:ring-accent font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="originalPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Preço Individual Total (R$, opcional)</FormLabel>
                      <FormControl><Input placeholder="Ex: 180,00" {...field} className="focus:ring-accent font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="validityDays" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Validade (dias)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ex: 90" {...field} className="focus:ring-accent font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Status</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="focus:ring-accent font-body">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ativo" className="font-body">Ativo</SelectItem>
                          <SelectItem value="Inativo" className="font-body">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="themeColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Cor do Tema do Card (Disponíveis)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger className="focus:ring-accent font-body">
                                <SelectValue placeholder="Escolha uma cor"/>
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="primary" className="font-body">Roxo (Primário)</SelectItem>
                            <SelectItem value="accent" className="font-body">Amarelo (Destaque)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="pt-4 mt-auto flex-shrink-0 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPackage ? "Salvar Alterações" : "Criar Pacote"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-gradient">Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Tem certeza que deseja remover este pacote? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPackageToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePackage} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

