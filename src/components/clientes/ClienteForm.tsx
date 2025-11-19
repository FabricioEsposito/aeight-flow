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
import { Search, Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCnpjApi } from "@/hooks/useCnpjApi";

const clienteSchema = z.object({
  razao_social: z.string().min(1, "Razão Social é obrigatória"),
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
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("E-mail inválido").optional()
  ),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  cliente?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClienteForm({ cliente, onClose, onSuccess }: ClienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
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
    defaultValues: cliente || {
      tipo_pessoa: "juridica",
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
      setValue("email", dados.email);
    }
  };

  const onSubmit = async (data: ClienteFormData) => {
    setIsLoading(true);

    try {
      if (cliente?.id) {
        const { error } = await supabase
          .from("clientes")
          .update(data)
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
            cnpj_cpf: data.cnpj_cpf,
            razao_social: data.razao_social,
            tipo_pessoa: data.tipo_pessoa,
            endereco: data.endereco,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            uf: data.uf,
            cep: data.cep,
            telefone: data.telefone,
            email: data.email,
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
    <Card className="w-full">
      <CardHeader className="border-b bg-muted/30 py-2 px-4">
        <CardTitle className="text-base font-bold">
          {cliente ? "Editar Cliente" : "Novo Cliente"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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

            <div className="space-y-1">
              <Label htmlFor="razao_social" className="text-xs">
                {tipoPessoa === "juridica" ? "Razão Social" : "Nome Completo"}
              </Label>
              <Input {...register("razao_social")} />
              {errors.razao_social && (
                <span className="text-sm text-destructive">{errors.razao_social.message}</span>
              )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="telefone" className="text-xs">Telefone</Label>
                <Input {...register("telefone")} placeholder="(11) 99999-9999" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">E-mail</Label>
                <Input {...register("email")} type="email" className="h-8 text-sm" />
                {errors.email && (
                  <span className="text-sm text-destructive">{errors.email.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-2 border-t">
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