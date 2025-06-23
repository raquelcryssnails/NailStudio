
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Clock, Bell, Users, UserPlus, Save, UserCog, Image as ImageIcon, Tv } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSettings, type DayOpeningHours } from "@/contexts/SettingsContext"; 
import type { AppSettings } from "@/types/firestore";


// Initial days data, now using dayOfWeek (0 for Sunday, 1 for Monday, etc.)
const initialDaysData: DayOpeningHours[] = [
  { id: "1", name: "Segunda-feira", dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { id: "2", name: "Terça-feira", dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { id: "3", name: "Quarta-feira", dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { id: "4", name: "Quinta-feira", dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { id: "5", name: "Sexta-feira", dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { id: "6", name: "Sábado", dayOfWeek: 6, isOpen: true, openTime: "08:00", closeTime: "17:00" },
  { id: "7", name: "Domingo", dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" },
];

const timeSlots = Array.from({ length: (22 - 7) * 2 +1 }, (_, i) => { // 7:00 to 22:00
    const hour = 7 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});


export default function ConfiguracoesPage() {
  const { 
    openingHours: contextOpeningHours, 
    userName: contextUserName, 
    salonTagline: contextSalonTagline, 
    salonLogoUrl: contextSalonLogoUrl,
    whatsappSchedulingMessage: contextWhatsappMessage,
    salonName: contextSalonName,
    salonAddress: contextSalonAddress,
    salonPhone: contextSalonPhone,
    clientLoginTitle: contextClientLoginTitle,
    clientLoginDescription: contextClientLoginDescription,
    setAppSettingsState, 
    isLoadingSettings 
  } = useSettings();
  const { toast } = useToast();
  
  const [editableUserName, setEditableUserName] = React.useState(contextUserName);
  const [editableSalonTagline, setEditableSalonTagline] = React.useState(contextSalonTagline);
  const [editableSalonLogoUrl, setEditableSalonLogoUrl] = React.useState(contextSalonLogoUrl);
  const [editableWhatsappMessage, setEditableWhatsappMessage] = React.useState(contextWhatsappMessage);
  const [editableSalonName, setEditableSalonName] = React.useState(contextSalonName);
  const [editableSalonAddress, setEditableSalonAddress] = React.useState(contextSalonAddress);
  const [editableSalonPhone, setEditableSalonPhone] = React.useState(contextSalonPhone);
  const [editableClientLoginTitle, setEditableClientLoginTitle] = React.useState(contextClientLoginTitle);
  const [editableClientLoginDescription, setEditableClientLoginDescription] = React.useState(contextClientLoginDescription);


  const [localOpeningHours, setLocalOpeningHours] = React.useState<DayOpeningHours[]>(
    contextOpeningHours && contextOpeningHours.length > 0 ? contextOpeningHours : initialDaysData
  );
  const [emailNotifications, setEmailNotifications] = React.useState(false);
  const [smsReminders, setSmsReminders] = React.useState(true);
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");

  // Sync local editable states when context changes
  React.useEffect(() => { setEditableUserName(contextUserName); }, [contextUserName]);
  React.useEffect(() => { setEditableSalonTagline(contextSalonTagline); }, [contextSalonTagline]);
  React.useEffect(() => { setEditableSalonLogoUrl(contextSalonLogoUrl); }, [contextSalonLogoUrl]);
  React.useEffect(() => { setEditableWhatsappMessage(contextWhatsappMessage); }, [contextWhatsappMessage]);
  React.useEffect(() => { setEditableSalonName(contextSalonName); }, [contextSalonName]);
  React.useEffect(() => { setEditableSalonAddress(contextSalonAddress); }, [contextSalonAddress]);
  React.useEffect(() => { setEditableSalonPhone(contextSalonPhone); }, [contextSalonPhone]);
  React.useEffect(() => { setEditableClientLoginTitle(contextClientLoginTitle); }, [contextClientLoginTitle]);
  React.useEffect(() => { setEditableClientLoginDescription(contextClientLoginDescription); }, [contextClientLoginDescription]);
  React.useEffect(() => {
    if (contextOpeningHours && contextOpeningHours.length > 0) {
      setLocalOpeningHours(contextOpeningHours);
    }
  }, [contextOpeningHours]);


  const handleOpeningHoursChange = (dayOfWeekToChange: number, field: keyof DayOpeningHours, value: string | boolean) => {
    setLocalOpeningHours(prevHours =>
      prevHours.map(day =>
        day.dayOfWeek === dayOfWeekToChange ? { ...day, [field]: value } : day
      )
    );
  };


  const handleInviteUser = () => {
    if (!inviteEmail.includes('@')) {
        toast({
            variant: "destructive",
            title: "E-mail Inválido",
            description: "Por favor, insira um endereço de e-mail válido.",
        });
        return;
    }
    console.log("Convidar usuário com email:", inviteEmail);
    toast({
      title: "Convite Enviado (Simulação)",
      description: `Convite enviado para ${inviteEmail}.`,
    });
    setInviteEmail("");
    setIsInviteUserModalOpen(false);
  };

  const handleSaveAllSettings = () => {
    const settingsToSave: Partial<AppSettings> = {
      openingHours: localOpeningHours,
      userName: editableUserName,
      salonTagline: editableSalonTagline,
      salonLogoUrl: editableSalonLogoUrl,
      whatsappSchedulingMessage: editableWhatsappMessage,
      salonName: editableSalonName,
      salonAddress: editableSalonAddress,
      salonPhone: editableSalonPhone,
      clientLoginTitle: editableClientLoginTitle,
      clientLoginDescription: editableClientLoginDescription,
      // Theme is saved separately via its own context/handler
    };

    setAppSettingsState(settingsToSave); 

    console.log("Salvando Configurações Adicionais (localmente/simulado):", {
        notifications: {
            email: emailNotifications,
            sms: smsReminders,
        },
    });

    toast({
      title: "Configurações Salvas!",
      description: "Todas as configurações foram atualizadas.",
    });
  };


  if (isLoadingSettings) {
    return <div className="font-body text-muted-foreground p-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-gradient flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do Salão
          </CardTitle>
          <CardDescription className="font-body">
            Personalize as configurações gerais do seu NailStudio AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger className="font-headline text-lg text-primary hover:no-underline">
                <UserCog className="mr-2 h-5 w-5 text-accent" /> Informações do Salão e Usuário
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="editableSalonName" className="font-body">Nome Principal do Salão</Label>
                  <Input id="editableSalonName" value={editableSalonName} onChange={(e) => setEditableSalonName(e.target.value)} className="focus:ring-accent font-body" placeholder="Ex: NailStudio AI" />
                </div>
                <div>
                  <Label htmlFor="editableSalonTagline" className="font-body">Tagline/Subtítulo do Salão (para Sidebar)</Label>
                  <Input id="editableSalonTagline" value={editableSalonTagline} onChange={(e) => setEditableSalonTagline(e.target.value)} className="focus:ring-accent font-body" placeholder="Ex: Salão Premium" />
                </div>
                 <div>
                  <Label htmlFor="editableUserName" className="font-body">Nome do Usuário Principal (para Sidebar)</Label>
                  <Input id="editableUserName" value={editableUserName} onChange={(e) => setEditableUserName(e.target.value)} className="focus:ring-accent font-body" placeholder="Ex: Ana Silva" />
                </div>
                <div>
                  <Label htmlFor="editableSalonLogoUrl" className="font-body">URL do Logo do Salão (para Sidebar)</Label>
                  <div className="flex items-center gap-2">
                    {editableSalonLogoUrl ? (
                         // eslint-disable-next-line @next/next/no-img-element
                        <img src={editableSalonLogoUrl} alt="Preview Logo" className="h-10 w-10 rounded-md border object-contain p-0.5" />
                    ) : (
                        <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <Input 
                        id="editableSalonLogoUrl" 
                        value={editableSalonLogoUrl} 
                        onChange={(e) => setEditableSalonLogoUrl(e.target.value)} 
                        className="focus:ring-accent font-body" 
                        placeholder="https://exemplo.com/logo.png" 
                    />
                  </div>
                   <p className="text-xs text-muted-foreground mt-1 font-body">Cole a URL de uma imagem hospedada publicamente.</p>
                </div>
                <div>
                  <Label htmlFor="editableSalonAddress" className="font-body">Endereço</Label>
                  <Input id="editableSalonAddress" value={editableSalonAddress} onChange={(e) => setEditableSalonAddress(e.target.value)} placeholder="Rua das Palmeiras, 123" className="focus:ring-accent font-body" />
                </div>
                <div>
                  <Label htmlFor="editableSalonPhone" className="font-body">Telefone</Label>
                  <Input id="editableSalonPhone" value={editableSalonPhone} onChange={(e) => setEditableSalonPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" className="focus:ring-accent font-body" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-client-portal">
              <AccordionTrigger className="font-headline text-lg text-primary hover:no-underline">
                <Tv className="mr-2 h-5 w-5 text-accent" /> Personalização do Portal do Cliente
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                 <div>
                  <Label htmlFor="editableClientLoginTitle" className="font-body">Título da Tela de Login do Cliente</Label>
                  <Input id="editableClientLoginTitle" value={editableClientLoginTitle} onChange={(e) => setEditableClientLoginTitle(e.target.value)} className="focus:ring-accent font-body" placeholder="Ex: Portal do Cliente" />
                </div>
                <div>
                  <Label htmlFor="editableClientLoginDescription" className="font-body">Descrição da Tela de Login do Cliente</Label>
                  <Textarea 
                    id="editableClientLoginDescription" 
                    value={editableClientLoginDescription} 
                    onChange={(e) => setEditableClientLoginDescription(e.target.value)} 
                    className="focus:ring-accent font-body" 
                    placeholder="Ex: Acesse para ver seus agendamentos e promoções." 
                    rows={3}
                  />
                </div>
                 <div>
                  <Label htmlFor="editableWhatsappMessage" className="font-body">Mensagem Padrão para Agendamento via WhatsApp</Label>
                  <Textarea 
                    id="editableWhatsappMessage" 
                    value={editableWhatsappMessage} 
                    onChange={(e) => setEditableWhatsappMessage(e.target.value)} 
                    className="focus:ring-accent font-body" 
                    placeholder="Ex: Olá! Gostaria de verificar horários disponíveis." 
                    rows={3}
                  />
                   <p className="text-xs text-muted-foreground mt-1 font-body">Esta mensagem será usada no botão "Agendar Horário via WhatsApp" no portal do cliente.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="font-headline text-lg text-primary hover:no-underline">
                <Clock className="mr-2 h-5 w-5 text-accent" /> Horário de Funcionamento
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-2">
                 <p className="font-body text-sm text-muted-foreground">Defina os horários de atendimento do salão para cada dia da semana.</p>
                 <div className="space-y-4">
                    {localOpeningHours.map(day => (
                        <div key={day.dayOfWeek} className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_120px] items-center gap-3 p-3 border rounded-md">
                            <Label htmlFor={`open-${day.dayOfWeek}`} className="font-body font-semibold">{day.name}</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id={`open-${day.dayOfWeek}`}
                                    checked={day.isOpen}
                                    onCheckedChange={(checked) => handleOpeningHoursChange(day.dayOfWeek, 'isOpen', checked)}
                                />
                                <Label htmlFor={`open-${day.dayOfWeek}`} className="font-body text-sm">{day.isOpen ? "Aberto" : "Fechado"}</Label>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`openTime-${day.dayOfWeek}`} className="font-body text-xs">Abertura</Label>
                                <Select
                                    value={day.openTime}
                                    onValueChange={(value) => handleOpeningHoursChange(day.dayOfWeek, 'openTime', value)}
                                    disabled={!day.isOpen}
                                >
                                    <SelectTrigger id={`openTime-${day.dayOfWeek}`} className="focus:ring-accent font-body text-sm h-9">
                                        <SelectValue placeholder="HH:MM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeSlots.map(slot => (
                                            <SelectItem key={`open-${day.dayOfWeek}-${slot}`} value={slot} className="font-body text-sm">{slot}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`closeTime-${day.dayOfWeek}`} className="font-body text-xs">Fechamento</Label>
                                <Select
                                    value={day.closeTime}
                                    onValueChange={(value) => handleOpeningHoursChange(day.dayOfWeek, 'closeTime', value)}
                                    disabled={!day.isOpen}
                                >
                                    <SelectTrigger id={`closeTime-${day.dayOfWeek}`} className="focus:ring-accent font-body text-sm h-9">
                                        <SelectValue placeholder="HH:MM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeSlots.map(slot => (
                                            <SelectItem key={`close-${day.dayOfWeek}-${slot}`} value={slot} className="font-body text-sm">{slot}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                 </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="font-headline text-lg text-primary hover:no-underline">
                <Bell className="mr-2 h-5 w-5 text-accent" /> Notificações
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border">
                  <Label htmlFor="notificationEmail" className="font-body flex-grow cursor-pointer">Receber notificações por e-mail sobre novos agendamentos</Label>
                  <Switch id="notificationEmail" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border">
                  <Label htmlFor="notificationSms" className="font-body flex-grow cursor-pointer">Enviar lembretes de agendamento por SMS para clientes</Label>
                  <Switch id="notificationSms" checked={smsReminders} onCheckedChange={setSmsReminders} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="font-headline text-lg text-primary hover:no-underline">
                <Users className="mr-2 h-5 w-5 text-accent" /> Gerenciamento de Usuários
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                 <p className="font-body text-sm text-muted-foreground">Adicione ou gerencie os usuários com acesso ao painel.</p>
                 <Dialog open={isInviteUserModalOpen} onOpenChange={setIsInviteUserModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 font-body">
                            <UserPlus className="mr-2 h-4 w-4" /> Convidar Novo Usuário
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-card">
                        <DialogHeader>
                        <DialogTitle className="font-headline text-gradient">Convidar Novo Usuário</DialogTitle>
                        <DialogDescription className="font-body">
                            Insira o e-mail do usuário que você deseja convidar para o sistema.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inviteEmail" className="text-right font-body">
                                E-mail
                                </Label>
                                <Input
                                id="inviteEmail"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="usuario@example.com"
                                className="col-span-3 focus:ring-accent font-body"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="font-body">Cancelar</Button>
                            </DialogClose>
                            <Button type="button" onClick={handleInviteUser} className="font-body bg-primary text-primary-foreground hover:bg-primary/90">
                                Enviar Convite
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>
                 <div className="mt-4 border-t pt-4">
                    <h4 className="font-headline text-md text-muted-foreground mb-2">Usuários Existentes:</h4>
                    <p className="font-body text-sm text-muted-foreground">(Lista de usuários será exibida aqui)</p>
                 </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 pt-6 border-t">
            <Button size="lg" onClick={handleSaveAllSettings} className="w-full md:w-auto bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 font-body">
              <Save className="mr-2 h-5 w-5" /> Salvar Todas as Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
    
    
