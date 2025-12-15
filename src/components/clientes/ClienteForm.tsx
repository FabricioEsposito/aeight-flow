import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Save, X, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCnpjApi } from "@/hooks/useCnpjApi";

const clienteSchema = z.object({
  razao_social: z.string().min(1, "Razão Social é obrigatória"),
  nome_fantasia: z.string().optional(),
  cnpj_cpf: z.string().optional(),
  tipo_pessoa: z.enum(["fisica", "juridica", "internacional"]),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  emails: z.array(z.string().email("E-mail inválido").or(z.literal(""))).optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  cliente?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClienteForm({ cliente, onClose, onSuccess }: ClienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>(
    cliente?.email && Array.isArray(cliente.email) ? cliente.email : [""]
  );
  const { toast } = useToast();
  const { buscarCnpj, isLoading: isSearchingCNPJ } = useCnpjApi();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      ...cliente,
      emails: cliente?.email && Array.isArray(cliente.email) ? cliente.email : [""],
      tipo_pessoa: cliente?.tipo_pessoa || "juridica",
    },
  });

  const cnpjValue = watch("cnpj_cpf");
  const tipoPessoa = watch("tipo_pessoa");

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

  const onSubmit = async (data: ClienteFormData) => {
    setIsLoading(true);

    try {
      const emailsFiltered = emails.filter(email => email.trim() !== "");
      const submitData = {
        ...data,
        email: emailsFiltered.length > 0 ? emailsFiltered : null,
      };
      delete (submitData as any).emails;

      if (cliente?.id) {
        const { error } = await supabase
          .from("clientes")
          .update(submitData)
          .eq("id", cliente.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert({
            cnpj_cpf: submitData.cnpj_cpf || "",
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
            status: "ativo"
          });

        if (error) throw error;

        toast({
          title: "Cliente cadastrado!",
          description: "O cliente foi cadastrado com sucesso.",
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
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
          {cliente ? "Editar Cliente" : "Novo Cliente"}
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
                    onValueChange={(value) => setValue("tipo_pessoa", value as "fisica" | "juridica" | "internacional")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoPessoa !== "internacional" && (
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
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="razao_social" className="text-xs">
                    {tipoPessoa === "juridica" ? "Razão Social" : tipoPessoa === "internacional" ? "Nome da Empresa" : "Nome Completo"}
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
              {cliente ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}