import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Save, X, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCnpjApi } from "@/hooks/useCnpjApi";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const fornecedorSchema = z.object({
  razao_social: z.string().min(1, "Razão Social é obrigatória"),
  nome_fantasia: z.string().optional(),
  cnpj_cpf: z.string().min(1, "CNPJ/CPF é obrigatório"),
  tipo_pessoa: z.enum(["fisica", "juridica"]),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  emails: z.array(z.string().email("E-mail inválido").or(z.literal(""))).optional(),
  banco_codigo: z.string().optional(),
  banco_nome: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo_conta_bancaria: z.string().optional(),
  tipo_transferencia: z.string().optional(),
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface BankItem {
  code: string;
  name: string;
}

interface FornecedorFormProps {
  fornecedor?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function FornecedorForm({ fornecedor, onClose, onSuccess }: FornecedorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>(
    fornecedor?.email && Array.isArray(fornecedor.email) ? fornecedor.email : [""]
  );
  const { toast } = useToast();
  const { buscarCnpj, isLoading: isSearchingCNPJ } = useCnpjApi();

  // Bank search state
  const [bankList, setBankList] = useState<BankItem[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(
    fornecedor?.banco_codigo ? { code: fornecedor.banco_codigo, name: fornecedor.banco_nome || '' } : null
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      ...fornecedor,
      emails: fornecedor?.email && Array.isArray(fornecedor.email) ? fornecedor.email : [""],
      tipo_pessoa: fornecedor?.tipo_pessoa || "juridica",
      banco_codigo: fornecedor?.banco_codigo || "",
      banco_nome: fornecedor?.banco_nome || "",
      agencia: fornecedor?.agencia || "",
      conta: fornecedor?.conta || "",
      tipo_conta_bancaria: fornecedor?.tipo_conta_bancaria || "",
      tipo_transferencia: fornecedor?.tipo_transferencia || "",
    },
  });

  const cnpjValue = watch("cnpj_cpf");
  const tipoPessoa = watch("tipo_pessoa");
  const tipoContaBancaria = watch("tipo_conta_bancaria");
  const tipoTransferencia = watch("tipo_transferencia");

  // Fetch bank list
  const fetchBankList = useCallback(async () => {
    if (bankList.length > 0) return;
    setLoadingBanks(true);
    try {
      const { data, error } = await supabase.functions.invoke('bank-list');
      if (error) throw error;
      if (Array.isArray(data)) {
        setBankList(data.map((b: any) => ({
          code: String(b.code || b.compe || '').padStart(3, '0'),
          name: b.name || b.fullName || b.longName || '',
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar lista de bancos:', err);
    } finally {
      setLoadingBanks(false);
    }
  }, [bankList.length]);

  useEffect(() => {
    if (bankOpen && bankList.length === 0) {
      fetchBankList();
    }
  }, [bankOpen, fetchBankList]);

  const filteredBanks = bankList.filter(b =>
    b.code.includes(bankSearch) || b.name.toLowerCase().includes(bankSearch.toLowerCase())
  ).slice(0, 50);

  const buscarDadosCNPJ = async () => {
    const dados = await buscarCnpj(cnpjValue);
    if (dados) {
      setValue("razao_social", dados.razao_social);
      setValue("endereco", dados.endereco);
      setValue("numero", dados.numero);
      setValue("complemento", dados.complemento);
      setValue("bairro", dados.bairro);
      setValue("cidade", dados.cidade);
      setValue("uf", dados.uf);
      setValue("cep", dados.cep);
      setValue("telefone", dados.telefone);
      if (dados.email) {
        setEmails([dados.email]);
        setValue("emails", [dados.email]);
      }
    }
  };

  const addEmail = () => {
    const newEmails = [...emails, ""];
    setEmails(newEmails);
    setValue("emails", newEmails);
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
      setValue("emails", newEmails);
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
    setValue("emails", newEmails);
  };

  const onSubmit = async (data: FornecedorFormData) => {
    setIsLoading(true);

    try {
      const emailsFiltered = emails.filter(email => email.trim() !== "");
      const submitData: any = {
        ...data,
        email: emailsFiltered.length > 0 ? emailsFiltered : null,
      };
      delete submitData.emails;

      // Clean empty bank fields
      if (!submitData.banco_codigo) submitData.banco_codigo = null;
      if (!submitData.banco_nome) submitData.banco_nome = null;
      if (!submitData.agencia) submitData.agencia = null;
      if (!submitData.conta) submitData.conta = null;
      if (!submitData.tipo_conta_bancaria) submitData.tipo_conta_bancaria = null;
      if (!submitData.tipo_transferencia) submitData.tipo_transferencia = null;

      if (fornecedor?.id) {
        const { error } = await supabase
          .from("fornecedores")
          .update(submitData)
          .eq("id", fornecedor.id);

        if (error) throw error;

        toast({
          title: "Fornecedor atualizado!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("fornecedores")
          .insert({
            cnpj_cpf: submitData.cnpj_cpf,
            razao_social: submitData.razao_social,
            nome_fantasia: submitData.nome_fantasia,
            tipo_pessoa: submitData.tipo_pessoa,
            endereco: submitData.endereco,
            numero: submitData.numero,
            complemento: submitData.complemento,
            bairro: submitData.bairro,
            cidade: submitData.cidade,
            uf: submitData.uf,
            cep: submitData.cep,
            telefone: submitData.telefone,
            email: submitData.email,
            status: "ativo",
            banco_codigo: submitData.banco_codigo,
            banco_nome: submitData.banco_nome,
            agencia: submitData.agencia,
            conta: submitData.conta,
            tipo_conta_bancaria: submitData.tipo_conta_bancaria,
            tipo_transferencia: submitData.tipo_transferencia,
          });

        if (error) throw error;

        toast({
          title: "Fornecedor cadastrado!",
          description: "O fornecedor foi cadastrado com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar fornecedor:', error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || error?.details || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  return (
    <Card className="w-full flex flex-col max-h-[80vh]">
      <CardHeader className="border-b bg-muted/30 py-2 px-4 flex-shrink-0">
        <CardTitle className="text-base font-bold">
          {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 px-4 flex flex-col flex-1 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          {/* Área com scroll */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {/* Seção: Informações Básicas */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="tipo_pessoa" className="text-xs">Tipo de Pessoa</Label>
                  <Select
                    value={tipoPessoa}
                    onValueChange={(value) => setValue("tipo_pessoa", value as "fisica" | "juridica")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cnpj_cpf" className="text-xs">
                    {tipoPessoa === "juridica" ? "CNPJ" : "CPF"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      {...register("cnpj_cpf")}
                      placeholder={tipoPessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                      onChange={(e) => {
                        const value = e.target.value;
                        const formatted = tipoPessoa === "juridica" 
                          ? formatCNPJ(value)
                          : formatCPF(value);
                        setValue("cnpj_cpf", formatted);
                      }}
                    />
                    {tipoPessoa === "juridica" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={buscarDadosCNPJ}
                        disabled={isSearchingCNPJ}
                        title="Buscar dados pelo CNPJ"
                      >
                        {isSearchingCNPJ ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {errors.cnpj_cpf && (
                    <span className="text-sm text-destructive">{errors.cnpj_cpf.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="razao_social" className="text-xs">
                    {tipoPessoa === "juridica" ? "Razão Social" : "Nome Completo"}
                  </Label>
                  <Input {...register("razao_social")} />
                  {errors.razao_social && (
                    <span className="text-sm text-destructive">{errors.razao_social.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nome_fantasia" className="text-xs">Nome Fantasia</Label>
                  <Input {...register("nome_fantasia")} placeholder="Nome fantasia (opcional)" />
                </div>
              </div>
            </div>

            {/* Seção: Endereço */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor="endereco" className="text-xs">Logradouro</Label>
                  <Input {...register("endereco")} placeholder="Rua, Avenida..." className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="numero" className="text-xs">Número</Label>
                  <Input {...register("numero")} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="complemento" className="text-xs">Complemento</Label>
                  <Input {...register("complemento")} placeholder="Apto, Sala..." className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bairro" className="text-xs">Bairro</Label>
                  <Input {...register("bairro")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cep" className="text-xs">CEP</Label>
                  <Input
                    {...register("cep")}
                    placeholder="00000-000"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      setValue("cep", formatted);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="cidade" className="text-xs">Cidade</Label>
                  <Input {...register("cidade")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="uf" className="text-xs">UF</Label>
                  <Input {...register("uf")} maxLength={2} placeholder="SP" className="h-8 text-sm" />
                </div>
              </div>
            </div>

            {/* Seção: Contato */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">
                Contato
              </h3>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="telefone" className="text-xs">Telefone</Label>
                  <Input {...register("telefone")} placeholder="(11) 99999-9999" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">E-mails</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addEmail}
                      className="h-6 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar E-mail
                    </Button>
                  </div>
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="exemplo@email.com"
                        className="h-8 text-sm"
                      />
                      {emails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmail(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seção: Dados Bancários */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">
                Dados Bancários
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Banco</Label>
                  <Popover open={bankOpen} onOpenChange={setBankOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-8 text-sm font-normal"
                      >
                        {selectedBank
                          ? `${selectedBank.code} - ${selectedBank.name}`
                          : "Selecione o banco..."
                        }
                        <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar por código ou nome..."
                          value={bankSearch}
                          onValueChange={setBankSearch}
                        />
                        <CommandList>
                          {loadingBanks ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Carregando bancos...</span>
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
                              <CommandGroup>
                                {filteredBanks.map((bank) => (
                                  <CommandItem
                                    key={bank.code}
                                    value={`${bank.code} ${bank.name}`}
                                    onSelect={() => {
                                      setSelectedBank(bank);
                                      setValue("banco_codigo", bank.code);
                                      setValue("banco_nome", bank.name);
                                      setBankOpen(false);
                                      setBankSearch('');
                                    }}
                                  >
                                    <span className="font-mono mr-2">{bank.code}</span>
                                    <span className="truncate">{bank.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Agência</Label>
                    <Input {...register("agencia")} placeholder="0001" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Conta</Label>
                    <Input {...register("conta")} placeholder="12345-6" className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Conta</Label>
                  <Select
                    value={tipoContaBancaria || ""}
                    onValueChange={(value) => setValue("tipo_conta_bancaria", value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Transferência</Label>
                  <Select
                    value={tipoTransferencia || ""}
                    onValueChange={(value) => setValue("tipo_transferencia", value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TED">TED</SelectItem>
                      <SelectItem value="TEF">TEF</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação - Fixos */}
          <div className="flex justify-end gap-2 pt-3 mt-3 border-t flex-shrink-0 bg-card">
            <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px] h-8 text-sm">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[100px] h-8 text-sm">
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {fornecedor ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
