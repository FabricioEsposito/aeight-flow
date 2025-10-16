export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          numero: string | null
          razao_social: string
          status: Database["public"]["Enums"]["status_geral"]
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          numero?: string | null
          razao_social: string
          status?: Database["public"]["Enums"]["status_geral"]
          telefone?: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          numero?: string | null
          razao_social?: string
          status?: Database["public"]["Enums"]["status_geral"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["pessoa_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          banco: string
          created_at: string
          data_inicio: string
          descricao: string
          id: string
          saldo_atual: number
          saldo_inicial: number
          status: Database["public"]["Enums"]["status_geral"]
          tipo_conta: Database["public"]["Enums"]["conta_tipo"]
          updated_at: string
        }
        Insert: {
          banco: string
          created_at?: string
          data_inicio: string
          descricao: string
          id?: string
          saldo_atual?: number
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["status_geral"]
          tipo_conta: Database["public"]["Enums"]["conta_tipo"]
          updated_at?: string
        }
        Update: {
          banco?: string
          created_at?: string
          data_inicio?: string
          descricao?: string
          id?: string
          saldo_atual?: number
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["status_geral"]
          tipo_conta?: Database["public"]["Enums"]["conta_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          centro_custo: string | null
          conta_bancaria_id: string | null
          created_at: string | null
          data_competencia: string
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string
          fornecedor_id: string
          id: string
          juros: number | null
          multa: number | null
          observacoes: string | null
          parcela_id: string | null
          plano_conta_id: string | null
          status: string | null
          updated_at: string | null
          valor: number
          valor_original: number | null
        }
        Insert: {
          centro_custo?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_competencia: string
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao: string
          fornecedor_id: string
          id?: string
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          parcela_id?: string | null
          plano_conta_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor: number
          valor_original?: number | null
        }
        Update: {
          centro_custo?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_competencia?: string
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string
          fornecedor_id?: string
          id?: string
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          parcela_id?: string | null
          plano_conta_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: number
          valor_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          centro_custo: string | null
          cliente_id: string
          conta_bancaria_id: string | null
          created_at: string | null
          data_competencia: string
          data_recebimento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string
          id: string
          juros: number | null
          multa: number | null
          numero_nf: string | null
          observacoes: string | null
          parcela_id: string | null
          plano_conta_id: string | null
          status: string | null
          updated_at: string | null
          valor: number
          valor_original: number | null
        }
        Insert: {
          centro_custo?: string | null
          cliente_id: string
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_competencia: string
          data_recebimento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao: string
          id?: string
          juros?: number | null
          multa?: number | null
          numero_nf?: string | null
          observacoes?: string | null
          parcela_id?: string | null
          plano_conta_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor: number
          valor_original?: number | null
        }
        Update: {
          centro_custo?: string | null
          cliente_id?: string
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_competencia?: string
          data_recebimento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string
          id?: string
          juros?: number | null
          multa?: number | null
          numero_nf?: string | null
          observacoes?: string | null
          parcela_id?: string | null
          plano_conta_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: number
          valor_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          cofins_percentual: number | null
          conta_bancaria_id: string
          created_at: string | null
          csll_percentual: number | null
          data_fim: string | null
          data_inicio: string
          desconto_percentual: number | null
          desconto_tipo: string | null
          desconto_valor: number | null
          descricao_servico: string | null
          fornecedor_id: string | null
          id: string
          irrf_percentual: number | null
          numero_contrato: string
          periodo_recorrencia: string | null
          pis_cofins_percentual: number | null
          pis_percentual: number | null
          plano_contas_id: string
          quantidade: number
          recorrente: boolean | null
          servicos: Json | null
          status: string | null
          tipo_contrato: string
          tipo_pagamento: string
          updated_at: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cliente_id?: string | null
          cofins_percentual?: number | null
          conta_bancaria_id: string
          created_at?: string | null
          csll_percentual?: number | null
          data_fim?: string | null
          data_inicio: string
          desconto_percentual?: number | null
          desconto_tipo?: string | null
          desconto_valor?: number | null
          descricao_servico?: string | null
          fornecedor_id?: string | null
          id?: string
          irrf_percentual?: number | null
          numero_contrato: string
          periodo_recorrencia?: string | null
          pis_cofins_percentual?: number | null
          pis_percentual?: number | null
          plano_contas_id: string
          quantidade?: number
          recorrente?: boolean | null
          servicos?: Json | null
          status?: string | null
          tipo_contrato: string
          tipo_pagamento: string
          updated_at?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cliente_id?: string | null
          cofins_percentual?: number | null
          conta_bancaria_id?: string
          created_at?: string | null
          csll_percentual?: number | null
          data_fim?: string | null
          data_inicio?: string
          desconto_percentual?: number | null
          desconto_tipo?: string | null
          desconto_valor?: number | null
          descricao_servico?: string | null
          fornecedor_id?: string | null
          id?: string
          irrf_percentual?: number | null
          numero_contrato?: string
          periodo_recorrencia?: string | null
          pis_cofins_percentual?: number | null
          pis_percentual?: number | null
          plano_contas_id?: string
          quantidade?: number
          recorrente?: boolean | null
          servicos?: Json | null
          status?: string | null
          tipo_contrato?: string
          tipo_pagamento?: string
          updated_at?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_contas_id_fkey"
            columns: ["plano_contas_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          numero: string | null
          razao_social: string
          status: Database["public"]["Enums"]["status_geral"]
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          numero?: string | null
          razao_social: string
          status?: Database["public"]["Enums"]["status_geral"]
          telefone?: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          numero?: string | null
          razao_social?: string
          status?: Database["public"]["Enums"]["status_geral"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["pessoa_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          centro_custo: string | null
          conciliado: boolean
          conta_bancaria_id: string
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_movimento: string
          descricao: string
          id: string
          observacoes: string | null
          plano_conta_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo?: string | null
          conciliado?: boolean
          conta_bancaria_id: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimento: string
          descricao: string
          id?: string
          observacoes?: string | null
          plano_conta_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor: number
        }
        Update: {
          centro_custo?: string | null
          conciliado?: boolean
          conta_bancaria_id?: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimento?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          plano_conta_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_contrato: {
        Row: {
          conta_bancaria_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_vencimento: string
          id: string
          numero_parcela: number
          status: string | null
          tipo: string
          valor: number
        }
        Insert: {
          conta_bancaria_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_vencimento: string
          id?: string
          numero_parcela: number
          status?: string | null
          tipo: string
          valor: number
        }
        Update: {
          conta_bancaria_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_vencimento?: string
          id?: string
          numero_parcela?: number
          status?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_contrato_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          nivel: number
          parent_id: string | null
          status: Database["public"]["Enums"]["status_geral"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          nivel?: number
          parent_id?: string | null
          status?: Database["public"]["Enums"]["status_geral"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          nivel?: number
          parent_id?: string | null
          status?: Database["public"]["Enums"]["status_geral"]
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          centro_custo: string | null
          codigo: string
          created_at: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["status_geral"]
          updated_at: string
        }
        Insert: {
          centro_custo?: string | null
          codigo: string
          created_at?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["status_geral"]
          updated_at?: string
        }
        Update: {
          centro_custo?: string | null
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["status_geral"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      conta_tipo: "corrente" | "poupanca" | "investimento"
      pessoa_tipo: "fisica" | "juridica"
      status_contrato: "ativo" | "encerrado" | "suspenso"
      status_geral: "ativo" | "inativo"
      status_pagamento: "pendente" | "pago" | "vencido" | "cancelado"
      tipo_movimentacao: "entrada" | "saida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      conta_tipo: ["corrente", "poupanca", "investimento"],
      pessoa_tipo: ["fisica", "juridica"],
      status_contrato: ["ativo", "encerrado", "suspenso"],
      status_geral: ["ativo", "inativo"],
      status_pagamento: ["pendente", "pago", "vencido", "cancelado"],
      tipo_movimentacao: ["entrada", "saida"],
    },
  },
} as const
