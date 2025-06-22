
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Archive, PlusCircle, PackageSearch, Edit3, Trash2, CalendarIcon, Save, PackagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { addProductFS, getProductsFS, updateProductFS, deleteProductFS } from "@/lib/firebase/firestoreService";
import type { Product } from "@/types/firestore";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Nome do produto é obrigatório (mín. 3 caracteres)." }),
  category: z.string().min(2, { message: "Categoria é obrigatória (mín. 2 caracteres)." }),
  stock: z.coerce.number().int().min(0, { message: "Estoque deve ser um número positivo ou zero." }),
  lowStockThreshold: z.coerce.number().int().min(0, { message: "Alerta de estoque baixo deve ser positivo ou zero." }),
  supplier: z.string().optional(),
  unit: z.string().optional(),
  costPrice: z.string().optional().refine(val => val === "" || val === undefined || /^\d+([.,]\d{1,2})?$/.test(val), { message: "Preço de custo inválido. Use formato como 10,50." }),
  sellingPrice: z.string().optional().refine(val => val === "" || val === undefined || /^\d+([.,]\d{1,2})?$/.test(val), { message: "Preço de venda inválido. Use formato como 20,00." }),
  sku: z.string().optional(),
  lastRestockDate: z.date().optional(),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function EstoquePage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [productToDeleteId, setProductToDeleteId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      category: "",
      stock: 0,
      lowStockThreshold: 5,
      supplier: "",
      unit: "",
      costPrice: "",
      sellingPrice: "",
      sku: "",
      lastRestockDate: undefined,
      notes: "",
    },
  });

  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProducts = await getProductsFS();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ variant: "destructive", title: "Erro ao buscar produtos", description: "Não foi possível carregar os dados do estoque." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    form.reset({
      name: "", category: "", stock: 0, lowStockThreshold: 5, supplier: "", unit: "",
      costPrice: "", sellingPrice: "", sku: "", lastRestockDate: undefined, notes: "",
    });
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      id: product.id,
      name: product.name,
      category: product.category,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      supplier: product.supplier || "",
      unit: product.unit || "",
      costPrice: product.costPrice?.replace('.', ',') || "",
      sellingPrice: product.sellingPrice?.replace('.', ',') || "",
      sku: product.sku || "",
      lastRestockDate: product.lastRestockDate && isValid(parseISO(product.lastRestockDate)) ? parseISO(product.lastRestockDate) : undefined,
      notes: product.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    setProductToDeleteId(productId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (productToDeleteId) {
      try {
        await deleteProductFS(productToDeleteId);
        toast({ title: "Produto Removido", description: "O produto foi removido do estoque." });
        fetchProducts();
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover o produto." });
      }
    }
    setProductToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const onSubmitProduct = async (data: ProductFormValues) => {
    const productDataToSave: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      category: data.category,
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold,
      supplier: data.supplier || undefined,
      unit: data.unit || undefined,
      costPrice: data.costPrice?.replace(',', '.') || undefined,
      sellingPrice: data.sellingPrice?.replace(',', '.') || undefined,
      sku: data.sku || undefined,
      lastRestockDate: data.lastRestockDate ? format(data.lastRestockDate, "yyyy-MM-dd") : undefined,
      notes: data.notes || undefined,
    };

    try {
      if (editingProduct && editingProduct.id) {
        await updateProductFS(editingProduct.id, productDataToSave);
        toast({ title: "Produto Atualizado", description: `"${data.name}" foi atualizado.` });
      } else {
        await addProductFS(productDataToSave);
        toast({ title: "Produto Adicionado", description: `"${data.name}" foi adicionado ao estoque.` });
      }
      fetchProducts();
      setIsModalOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível salvar o produto." });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.supplier && product.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Controle de Estoque
            </CardTitle>
            <CardDescription className="font-body">
              Gerencie os produtos e materiais do seu salão.
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
                <PackageSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Buscar produto..." 
                  className="pl-8 w-full" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={handleAddNewProduct} className="bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 whitespace-nowrap">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Produto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 font-body text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="font-body text-muted-foreground mt-8 text-center">
              {searchTerm ? `Nenhum produto encontrado para "${searchTerm}".` : "Nenhum produto cadastrado. Clique em 'Adicionar Produto' para começar."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Produto</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="font-headline text-center">Estoque</TableHead>
                  <TableHead className="font-headline text-center hidden sm:table-cell">Alerta</TableHead>
                  <TableHead className="font-headline text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                        <p className="font-medium font-body">{product.name}</p>
                        {product.supplier && <p className="text-xs text-muted-foreground font-body hidden lg:block">{product.supplier}</p>}
                    </TableCell>
                    <TableCell className="font-body hidden md:table-cell">{product.category}</TableCell>
                    <TableCell className="font-body text-center">{product.stock} {product.unit || ''}</TableCell>
                    <TableCell className="font-body text-center hidden sm:table-cell">
                      {product.stock <= product.lowStockThreshold ? (
                        <Badge variant="destructive" className="bg-red-500 text-white text-xs">Baixo</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 text-xs">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditProduct(product)} title="Editar Produto">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100 hover:text-red-600" onClick={() => handleDeleteProduct(product.id)} title="Remover Produto">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          setIsModalOpen(isOpen);
          if (!isOpen) {
            setEditingProduct(null);
            form.reset();
          }
      }}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-gradient">{editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}</DialogTitle>
            <DialogDescription className="font-body">
              {editingProduct ? "Altere os dados do produto abaixo." : "Preencha os dados para adicionar um novo produto ao estoque."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProduct)} className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem> <FormLabel className="font-body">Nome do Produto</FormLabel> <FormControl><Input placeholder="Ex: Esmalte Vermelho Intenso" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
              )}/>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Categoria</FormLabel> <FormControl><Input placeholder="Ex: Esmaltes, Removedores" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">SKU / Cód. Barras (opcional)</FormLabel> <FormControl><Input placeholder="Ex: 1234567890123" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="stock" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Estoque Atual</FormLabel> <FormControl><Input type="number" placeholder="Ex: 25" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Alerta Estoque Baixo</FormLabel> <FormControl><Input type="number" placeholder="Ex: 5" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
                 <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Unidade (opcional)</FormLabel> <FormControl><Input placeholder="Ex: un, ml, L, kg" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Preço de Custo (R$, opcional)</FormLabel> <FormControl><Input placeholder="Ex: 10,50" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                    <FormItem> <FormLabel className="font-body">Preço de Venda (R$, opcional)</FormLabel> <FormControl><Input placeholder="Ex: 20,00" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
                )}/>
              </div>
               <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem> <FormLabel className="font-body">Fornecedor (opcional)</FormLabel> <FormControl><Input placeholder="Ex: Distribuidora Beleza Pura" {...field} className="focus:ring-accent font-body"/></FormControl> <FormMessage /> </FormItem>
              )}/>
              <FormField
                control={form.control}
                name="lastRestockDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-body">Data do Último Reabastecimento (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal focus:ring-accent font-body", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem> <FormLabel className="font-body">Observações (opcional)</FormLabel> <FormControl><Textarea placeholder="Detalhes adicionais sobre o produto..." {...field} className="focus:ring-accent font-body" rows={3}/></FormControl> <FormMessage /> </FormItem>
              )}/>

              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline" className="font-body">Cancelar</Button></DialogClose>
                <Button type="submit" className="font-body bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  {editingProduct ? "Salvar Alterações" : "Adicionar Produto"}
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
              Tem certeza que deseja remover este produto do estoque? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDeleteId(null)} className="font-body">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct} className="bg-destructive hover:bg-destructive/90 font-body">Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
