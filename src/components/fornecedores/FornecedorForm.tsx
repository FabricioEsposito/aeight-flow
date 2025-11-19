import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCnpjApi } from "@/hooks/useCnpjApi";

const fornecedorSchema = z.object({
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
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface FornecedorFormProps {
  fornecedor?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function FornecedorForm({ fornecedor, onClose, onSuccess }: FornecedorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { buscarCnpj, isLoading: isSearchingCNPJ } = useCnpjApi();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: fornecedor || {
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

  const onSubmit = async (data: FornecedorFormData) => {
    setIsLoading(true);

    try {
      if (fornecedor?.id) {
        const { error } = await supabase
          .from("fornecedores")
          .update(data)
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
          title: "Fornecedor cadastrado!",
          description: "O fornecedor foi cadastrado com sucesso.",
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
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Seção: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
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

              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">
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

            <div className="space-y-2">
              <Label htmlFor="razao_social">
                {tipoPessoa === "juridica" ? "Razão Social" : "Nome Completo"}
              </Label>
              <Input {...register("razao_social")} />
              {errors.razao_social && (
                <span className="text-sm text-destructive">{errors.razao_social.message}</span>
              )}
            </div>
          </div>

          {/* Seção: Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="endereco">Logradouro</Label>
                <Input {...register("endereco")} placeholder="Rua, Avenida..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input {...register("numero")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input {...register("complemento")} placeholder="Apto, Sala..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input {...register("bairro")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  {...register("cep")}
                  placeholder="00000-000"
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    setValue("cep", formatted);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input {...register("cidade")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input {...register("uf")} maxLength={2} placeholder="SP" />
              </div>
            </div>
          </div>

          {/* Seção: Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Contato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input {...register("telefone")} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input {...register("email")} type="email" />
                {errors.email && (
                  <span className="text-sm text-destructive">{errors.email.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="min-w-[120px]">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
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