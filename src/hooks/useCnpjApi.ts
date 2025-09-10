import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CnpjData {
  razao_social: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

export function useCnpjApi() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const buscarCnpj = async (cnpj: string): Promise<CnpjData | null> => {
    if (!cnpj) {
      toast({
        title: "CNPJ não informado",
        description: "Digite um CNPJ para buscar os dados",
        variant: "destructive",
      });
      return null;
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    
    if (cnpjLimpo.length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "O CNPJ deve ter 14 dígitos",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      // Primeiro tenta a BrasilAPI
      let response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) {
        // Se falhar, tenta a API alternativa
        response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`);
      }
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }

      const dados = await response.json();

      // Mapeia os dados para o formato padrão independente da API
      const dadosFormatados: CnpjData = {
        razao_social: dados.company?.name || dados.razao_social || dados.nome || "",
        endereco: dados.address?.street || dados.logradouro || "",
        numero: dados.address?.number || dados.numero || "",
        complemento: dados.address?.details || dados.complemento || "",
        bairro: dados.address?.district || dados.bairro || "",
        cidade: dados.address?.city || dados.municipio || "",
        uf: dados.address?.state || dados.uf || "",
        cep: (dados.address?.zip || dados.cep || "").replace(/\D/g, ""),
        telefone: dados.phones?.[0]?.number || dados.telefone || "",
        email: dados.emails?.[0]?.address || dados.email || "",
      };

      toast({
        title: "Dados encontrados!",
        description: "As informações do CNPJ foram preenchidas automaticamente.",
      });

      return dadosFormatados;
    } catch (error) {
      toast({
        title: "Erro ao buscar CNPJ",
        description: "Não foi possível encontrar os dados do CNPJ. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    buscarCnpj,
    isLoading,
  };
}