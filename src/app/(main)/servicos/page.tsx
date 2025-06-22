
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Scissors, PlusCircle, Edit3, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { addServiceFS, getServicesFS, updateServiceFS, deleteServiceFS } from "@/lib/firebase/firestoreService";
import type { SalonService } from "@/types/firestore";
import { cn } from "@/lib/utils";

const serviceFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Nome do serviço deve ter pelo menos 3 caracteres." }),
  duration: z.string().min(1, { message: "Duração é obrigatória." }),
  price: z.string().refine(val => /^\d+([.,]\d{2})?$/.test(val) || /^\d+$/.test(val), { message: "Preço inválido. Use formato como 35 ou 35,00."}),
  category: z.string().min(1, { message: "Categoria é obrigatória." }),
  description: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServicosPage() {
  const [services, setServices] = React.useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<SalonService | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [serviceToDeleteId, setServiceToDeleteId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      duration: "",
      price: "",
      category: "",
      description: "",
    },
  });

  const fetchServices = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedServices = await getServicesFS();
      setServices(fetchedServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({ variant: "destructive", title: "Erro ao buscar serviços", description: "Não foi possível carregar os serviços." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAddNewService = () => {
    setEditingService(null);
    form.reset({ name: "", duration: "", price: "", category: "", description: "" });
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: SalonService) => {
    setEditingService(service);
    form.reset({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: service.price.replace('.',','), // Format for display
      category: service.category,
      description: service.description || "",
    });
    setIsServiceModalOpen(true);
  };

  const handleDeleteService = (serviceId: string) => {
    setServiceToDeleteId(serviceId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteService = async () => {
    if (serviceToDeleteId) {
      try {
        await deleteServiceFS(serviceToDeleteId);
        toast({ title: "Serviço Removido", description: "O serviço foi removido com sucesso." });
        fetchServices(); // Refresh list
      } catch (error) {
        console.error("Error deleting service:", error);
        toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover o serviço." });
      }
    }
    setServiceToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const onSubmitService = async (data: ServiceFormValues) => {
    const priceForDb = data.price.replace(',', '.');
    try {
      if (editingService && editingService.id) {
        const { id, ...updateData } = data; // Exclude id from data sent to update
        await updateServiceFS(editingService.id, {...updateData, price: priceForDb });
        toast({ title: "Serviço Atualizado", description: "O serviço foi atualizado com sucesso." });
      } else {
        const { id, ...newServiceData } = data; // Exclude id if present from new data
        await addServiceFS({...newServiceData, price: priceForDb });
        toast({ title: "Serviço Criado", description: "Novo serviço adicionado com sucesso." });
      }
      fetchServices(); // Refresh list
      setIsServiceModalOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving service:", error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar o serviço." });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
              <Scissors className="h-6 w-6" />
              Catálogo de Serviços
            </CardTitle>
            <CardDescription className="font-body">
              Gerencie todos os serviços oferecidos pelo salão.
            </CardDescription>
          </div>
          <Button onClick={handleAddNewService} className="bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Serviço
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <p className="font-body text-muted-foreground mt-8 text-center">Carregando serviços...</p>
          ) : services.length === 0 ? (
             <p className="font-body text-muted-foreground mt-8 text-center">
              Nenhum serviço cadastrado ainda. Clique em "Adicionar Novo Serviço" para começar.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <Card key={service.id} className={cn("hover:shadow-lg transition-shadow flex flex-col border-t-4 border-primary")}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-xl text-foreground">{service.name}</CardTitle>
                        <Scissors className={cn("h-7 w-7 opacity-70 text-primary")} />
                    </div>
                    <CardDescription className="font-body text-xs text-muted-foreground mt-1">{service.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 pt-0">
                     <p className="text-sm font-body text-muted-foreground">Duração: {service.duration}</p>
                    {service.description && <p className="text-sm font-body text-muted-foreground mt-1 italic">"{service.description}"</p>}
                    <p className="text-xl font-bold font-headline text-green-600 pt-2 border-t">R$ {service.price.replace('.', ',')}</p>
                  </CardContent>
                  <CardFooter className="border-t pt-3 mt-auto">
                    <div className="flex w-full justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditService(service)} className="font-body text-xs">
                            <Edit3 className="mr-1 h-3 w-3" /> Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteService(service.id)} className="font-body text-xs">
                            <Trash2 className="mr-1 h-3 w-3" /> Remover
                        </Button>
                     </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isServiceModalOpen} onOpenChange={(isOpen) => {
          setIsServiceModalOpen(isOpen);
          if (!isOpen) {
            setEditingService(null);
            form.reset();
          }
      }}>
        <DialogContent className="sm:max-w-[480px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-gradient">{editingService ? "Editar Serviço" : "Adicionar Novo Serviço"}</DialogTitle>
            <DialogDescription className="font-body">
              {editingService ? "Altere os dados do serviço abaixo." : "Preencha os dados para criar um novo serviço."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitService)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Nome do Serviço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Manicure Completa" {...field} className="focus:ring-accent font-body"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-body">Duração</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: 45 min" {...field} className="focus:ring-accent font-body"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-body">Preço (R$)</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: 35,00" {...field} className="focus:ring-accent font-body"/>
                        </FormControl>
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
                    <FormControl>
                      <Input placeholder="Ex: Mãos, Pés, Rosto" {...field} className="focus:ring-accent font-body"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes sobre o serviço..." {...field} className="focus:ring-accent font-body" rows={3}/>
                    </FormControl>
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
                  {editingService ? "Salvar Alterações" : "Adicionar Serviço"}
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
              Tem certeza que deseja remover este serviço? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
