import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  useCreateVisit, 
  useListSectors, 
  useGetFieldConfig, 
  useSearchVisitors,
  useGetLabelConfig,
  Visit
} from '@visit-control/api-client';
import { UserPlus, Search, UserCheck, AlertCircle, Printer, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { PrintLabel } from '@/components/PrintLabel';

export default function VisitNew() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [isNewVisitorMode, setIsNewVisitorMode] = useState(false);
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);

  const { data: fieldConfig, isLoading: configLoading } = useGetFieldConfig();
  const { data: sectors } = useListSectors({ status: 'active' });
  const { data: labelConfig } = useGetLabelConfig();
  const createVisit = useCreateVisit();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: searchResults, isLoading: searching } = useSearchVisitors(
    { q: debouncedSearch },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: debouncedSearch.length >= 2 } as any },
  );

  // Dynamic schema based on field config
  const createSchema = () => {
    const s: any = {
      sectorId: z.string().min(1, 'Setor é obrigatório'),
      visitorName: z.string().min(1, 'Nome é obrigatório'),
    };
    if (!fieldConfig) return z.object(s);

    const mapRules = (field: string) => {
      const status = fieldConfig[field as keyof typeof fieldConfig];
      if (status === 'required') return z.string().min(1, 'Campo obrigatório');
      if (status === 'optional') return z.string().optional();
      return z.string().optional(); // hidden
    };

    s.visitorCpf = mapRules('cpf');
    s.visitorPhone = mapRules('phone');
    s.visitorCompany = mapRules('company');
    s.visitorCity = mapRules('city');
    s.responsible = mapRules('responsible');
    s.reason = mapRules('reason');
    s.notes = mapRules('notes');
    
    return z.object(s);
  };

  const form = useForm({
    resolver: zodResolver(createSchema()),
    defaultValues: {
      visitorName: '',
      visitorCpf: '',
      visitorPhone: '',
      visitorCompany: '',
      visitorCity: '',
      sectorId: '',
      responsible: '',
      reason: '',
      notes: '',
    }
  });

  // Re-evaluate validation when config loads
  useEffect(() => {
    if (fieldConfig) {
      form.trigger();
    }
  }, [fieldConfig, form]);

  const selectVisitor = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsNewVisitorMode(false);
    setSearchTerm('');
    form.reset({
      ...form.getValues(),
      visitorName: visitor.name,
      visitorCpf: visitor.cpf || '',
      visitorPhone: visitor.phone || '',
      visitorCompany: visitor.company || '',
      visitorCity: visitor.city || '',
    });
  };

  const enableNewVisitor = () => {
    setSelectedVisitor(null);
    setIsNewVisitorMode(true);
    setSearchTerm('');
    form.reset({
      ...form.getValues(),
      visitorName: debouncedSearch, // Use what they typed
      visitorCpf: '',
      visitorPhone: '',
      visitorCompany: '',
      visitorCity: '',
    });
  };

  const handleReset = () => {
    setSelectedVisitor(null);
    setIsNewVisitorMode(false);
    setSearchTerm('');
    setCreatedVisit(null);
    form.reset({
      visitorName: '',
      visitorCpf: '',
      visitorPhone: '',
      visitorCompany: '',
      visitorCity: '',
      sectorId: '',
      responsible: '',
      reason: '',
      notes: '',
    });
  };

  const onSubmit = (data: any) => {
    const payload: any = {
      sectorId: parseInt(data.sectorId, 10),
      visitorName: data.visitorName,
    };
    
    if (selectedVisitor) {
      payload.visitorId = selectedVisitor.id;
      // We could add a checkbox for "Update visitor data" in UI, assuming false for simplicity
      payload.updateVisitorData = true; 
    }

    if (fieldConfig?.cpf !== 'hidden') payload.visitorCpf = data.visitorCpf;
    if (fieldConfig?.phone !== 'hidden') payload.visitorPhone = data.visitorPhone;
    if (fieldConfig?.company !== 'hidden') payload.visitorCompany = data.visitorCompany;
    if (fieldConfig?.city !== 'hidden') payload.visitorCity = data.visitorCity;
    if (fieldConfig?.responsible !== 'hidden') payload.responsible = data.responsible;
    if (fieldConfig?.reason !== 'hidden') payload.reason = data.reason;
    if (fieldConfig?.notes !== 'hidden') payload.notes = data.notes;

    createVisit.mutate({ data: payload }, {
      onSuccess: (res) => {
        setCreatedVisit(res);
        toast({ title: 'Visita registrada com sucesso!' });
      },
      onError: (err: any) => {
        toast({ variant: 'destructive', title: 'Erro ao registrar visita', description: err.response?.data?.error });
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (configLoading) {
    return <AppLayout><div className="p-8 text-center text-muted-foreground">Carregando formulário...</div></AppLayout>;
  }

  // If a visit was just created, show success screen
  if (createdVisit && labelConfig) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-3xl mx-auto w-full">
          <div className="no-print">
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Entrada Registrada!</h2>
                  <p className="text-gray-600 mt-2">A visita de <span className="font-semibold">{createdVisit.visitor?.name}</span> para o setor <span className="font-semibold">{createdVisit.sector?.name}</span> foi confirmada.</p>
                </div>
                
                <div className="flex justify-center gap-4 pt-4">
                  <Button onClick={handleReset} variant="outline" className="w-40">Nova Visita</Button>
                  <Button onClick={handlePrint} className="w-40 gap-2 bg-blue-600 hover:bg-blue-700">
                    <Printer className="w-4 h-4" />
                    Imprimir Etiqueta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hidden element for printing */}
          <div className="print-only">
            <PrintLabel visit={createdVisit} config={labelConfig} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-8 h-8 text-primary" />
            Nova Visita
          </h1>
          <p className="text-gray-500 mt-1">Registre a entrada de um visitante no prédio.</p>
        </div>

        {!selectedVisitor && !isNewVisitorMode && (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Search className="w-5 h-5" />
                Identificar Visitante
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="Digite o nome, CPF ou empresa para buscar..." 
                  className="pl-10 h-12 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {debouncedSearch.length >= 2 && (
                <div className="bg-white border rounded-md shadow-sm divide-y">
                  {searching ? (
                    <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <>
                      {searchResults.map((v: any) => (
                        <div key={v.id} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center" onClick={() => selectVisitor(v)}>
                          <div>
                            <div className="font-semibold text-gray-900">{v.name}</div>
                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                              {v.cpf && <span>CPF: {v.cpf}</span>}
                              {v.company && <span>Empresa: {v.company}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-blue-600">Selecionar</Button>
                        </div>
                      ))}
                      <div className="p-3 bg-gray-50 text-center border-t">
                        <span className="text-sm text-gray-600 mr-2">Não é nenhum destes?</span>
                        <Button variant="outline" size="sm" onClick={enableNewVisitor}>Cadastrar Novo</Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-gray-600">Visitante não encontrado no sistema.</p>
                      <Button onClick={enableNewVisitor}>Cadastrar Novo Visitante</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(selectedVisitor || isNewVisitorMode) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 border-b border-gray-100 pb-3 pt-4 px-6">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-gray-500" />
                    {selectedVisitor ? 'Dados do Visitante Cadastrado' : 'Dados do Novo Visitante'}
                  </CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground">
                    Alterar Visitante
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="visitorName" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {fieldConfig?.cpf !== 'hidden' && (
                      <FormField control={form.control} name="visitorCpf" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF {fieldConfig?.cpf === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {fieldConfig?.phone !== 'hidden' && (
                      <FormField control={form.control} name="visitorPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone {fieldConfig?.phone === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {fieldConfig?.company !== 'hidden' && (
                      <FormField control={form.control} name="visitorCompany" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa/Órgão {fieldConfig?.company === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {fieldConfig?.city !== 'hidden' && (
                      <FormField control={form.control} name="visitorCity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade {fieldConfig?.city === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-3 pt-4 px-6">
                  <CardTitle className="text-base flex items-center gap-2">
                    Detalhes da Visita
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="sectorId" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Setor de Destino *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sectors?.map(s => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {fieldConfig?.responsible !== 'hidden' && (
                      <FormField control={form.control} name="responsible" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Servidor Responsável {fieldConfig?.responsible === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {fieldConfig?.reason !== 'hidden' && (
                      <FormField control={form.control} name="reason" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo {fieldConfig?.reason === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {fieldConfig?.notes !== 'hidden' && (
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações {fieldConfig?.notes === 'required' && '*'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleReset} className="w-32">Cancelar</Button>
                <Button type="submit" disabled={createVisit.isPending} className="w-48 text-base font-semibold">
                  Registrar Entrada
                </Button>
              </div>

            </form>
          </Form>
        )}
      </div>
    </AppLayout>
  );
}
