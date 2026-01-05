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
      centros_custo: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          created_at: string
          email: string[] | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
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
          email?: string[] | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
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
          email?: string[] | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
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
          data_vencimento_original: string | null
          desconto: number | null
          descricao: string
          fornecedor_id: string
          id: string
          juros: number | null
          link_boleto: string | null
          link_nf: string | null
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
          data_vencimento_original?: string | null
          desconto?: number | null
          descricao: string
          fornecedor_id: string
          id?: string
          juros?: number | null
          link_boleto?: string | null
          link_nf?: string | null
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
          data_vencimento_original?: string | null
          desconto?: number | null
          descricao?: string
          fornecedor_id?: string
          id?: string
          juros?: number | null
          link_boleto?: string | null
          link_nf?: string | null
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
          data_vencimento_original: string | null
          desconto: number | null
          descricao: string
          id: string
          juros: number | null
          link_boleto: string | null
          link_nf: string | null
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
          data_vencimento_original?: string | null
          desconto?: number | null
          descricao: string
          id?: string
          juros?: number | null
          link_boleto?: string | null
          link_nf?: string | null
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
          data_vencimento_original?: string | null
          desconto?: number | null
          descricao?: string
          id?: string
          juros?: number | null
          link_boleto?: string | null
          link_nf?: string | null
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
          centro_custo: string | null
          cliente_id: string | null
          cofins_percentual: number | null
          conta_bancaria_id: string
          created_at: string | null
          csll_percentual: number | null
          data_fim: string | null
          data_inicio: string
          data_reativacao: string | null
          desconto_percentual: number | null
          desconto_tipo: string | null
          desconto_valor: number | null
          descricao_servico: string | null
          fornecedor_id: string | null
          id: string
          importancia_cliente_fornecedor:
            | Database["public"]["Enums"]["importancia_nivel"]
            | null
          irrf_percentual: number | null
          link_contrato: string | null
          numero_contrato: string
          observacoes_faturamento: string | null
          percentual_investimento_midia: number | null
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
          valor_bruto: number | null
          valor_total: number
          valor_unitario: number
          vendedor_responsavel: string | null
        }
        Insert: {
          centro_custo?: string | null
          cliente_id?: string | null
          cofins_percentual?: number | null
          conta_bancaria_id: string
          created_at?: string | null
          csll_percentual?: number | null
          data_fim?: string | null
          data_inicio: string
          data_reativacao?: string | null
          desconto_percentual?: number | null
          desconto_tipo?: string | null
          desconto_valor?: number | null
          descricao_servico?: string | null
          fornecedor_id?: string | null
          id?: string
          importancia_cliente_fornecedor?:
            | Database["public"]["Enums"]["importancia_nivel"]
            | null
          irrf_percentual?: number | null
          link_contrato?: string | null
          numero_contrato: string
          observacoes_faturamento?: string | null
          percentual_investimento_midia?: number | null
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
          valor_bruto?: number | null
          valor_total: number
          valor_unitario: number
          vendedor_responsavel?: string | null
        }
        Update: {
          centro_custo?: string | null
          cliente_id?: string | null
          cofins_percentual?: number | null
          conta_bancaria_id?: string
          created_at?: string | null
          csll_percentual?: number | null
          data_fim?: string | null
          data_inicio?: string
          data_reativacao?: string | null
          desconto_percentual?: number | null
          desconto_tipo?: string | null
          desconto_valor?: number | null
          descricao_servico?: string | null
          fornecedor_id?: string | null
          id?: string
          importancia_cliente_fornecedor?:
            | Database["public"]["Enums"]["importancia_nivel"]
            | null
          irrf_percentual?: number | null
          link_contrato?: string | null
          numero_contrato?: string
          observacoes_faturamento?: string | null
          percentual_investimento_midia?: number | null
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
          valor_bruto?: number | null
          valor_total?: number
          valor_unitario?: number
          vendedor_responsavel?: string | null
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
      email_logs: {
        Row: {
          cliente_id: string
          conta_receber_id: string | null
          created_at: string | null
          email_destino: string
          erro: string | null
          id: string
          status: string
          tipo: string
        }
        Insert: {
          cliente_id: string
          conta_receber_id?: string | null
          created_at?: string | null
          email_destino: string
          erro?: string | null
          id?: string
          status?: string
          tipo?: string
        }
        Update: {
          cliente_id?: string
          conta_receber_id?: string | null
          created_at?: string | null
          email_destino?: string
          erro?: string | null
          id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
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
          email: string[] | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
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
          email?: string[] | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
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
          email?: string[] | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
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
      hierarchy_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hierarchy_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hierarchy_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          cargo: string | null
          contato: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          cargo?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          cargo?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
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
      solicitacoes_ajuste_financeiro: {
        Row: {
          aprovador_id: string | null
          centro_custo: string | null
          conta_bancaria_id: string | null
          created_at: string | null
          data_resposta: string | null
          data_solicitacao: string
          data_vencimento_atual: string
          data_vencimento_solicitada: string
          desconto_atual: number | null
          desconto_solicitado: number | null
          id: string
          juros_atual: number | null
          juros_solicitado: number | null
          lancamento_id: string
          motivo_rejeicao: string | null
          motivo_solicitacao: string | null
          multa_atual: number | null
          multa_solicitada: number | null
          plano_conta_id: string | null
          solicitante_id: string
          status: string
          tipo_lancamento: string
          updated_at: string | null
          valor_original: number | null
        }
        Insert: {
          aprovador_id?: string | null
          centro_custo?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          data_vencimento_atual: string
          data_vencimento_solicitada: string
          desconto_atual?: number | null
          desconto_solicitado?: number | null
          id?: string
          juros_atual?: number | null
          juros_solicitado?: number | null
          lancamento_id: string
          motivo_rejeicao?: string | null
          motivo_solicitacao?: string | null
          multa_atual?: number | null
          multa_solicitada?: number | null
          plano_conta_id?: string | null
          solicitante_id: string
          status?: string
          tipo_lancamento: string
          updated_at?: string | null
          valor_original?: number | null
        }
        Update: {
          aprovador_id?: string | null
          centro_custo?: string | null
          conta_bancaria_id?: string | null
          created_at?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          data_vencimento_atual?: string
          data_vencimento_solicitada?: string
          desconto_atual?: number | null
          desconto_solicitado?: number | null
          id?: string
          juros_atual?: number | null
          juros_solicitado?: number | null
          lancamento_id?: string
          motivo_rejeicao?: string | null
          motivo_solicitacao?: string | null
          multa_atual?: number | null
          multa_solicitada?: number | null
          plano_conta_id?: string | null
          solicitante_id?: string
          status?: string
          tipo_lancamento?: string
          updated_at?: string | null
          valor_original?: number | null
        }
        Relationships: []
      }
      solicitacoes_comissao: {
        Row: {
          ano_referencia: number
          aprovador_id: string | null
          conta_pagar_gerada: boolean | null
          created_at: string
          data_aprovacao: string | null
          id: string
          mes_referencia: number
          motivo_rejeicao: string | null
          percentual_comissao: number
          solicitante_id: string
          status: string
          updated_at: string
          valor_comissao: number
          valor_total_vendas: number
          vendedor_id: string
        }
        Insert: {
          ano_referencia: number
          aprovador_id?: string | null
          conta_pagar_gerada?: boolean | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          mes_referencia: number
          motivo_rejeicao?: string | null
          percentual_comissao?: number
          solicitante_id: string
          status?: string
          updated_at?: string
          valor_comissao?: number
          valor_total_vendas?: number
          vendedor_id: string
        }
        Update: {
          ano_referencia?: number
          aprovador_id?: string | null
          conta_pagar_gerada?: boolean | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          mes_referencia?: number
          motivo_rejeicao?: string | null
          percentual_comissao?: number
          solicitante_id?: string
          status?: string
          updated_at?: string
          valor_comissao?: number
          valor_total_vendas?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_comissao_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          menu_item: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          centro_custo: string | null
          created_at: string
          fornecedor_id: string | null
          id: string
          meta: number
          nome: string
          percentual_comissao: number
          status: string
          updated_at: string
        }
        Insert: {
          centro_custo?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          meta?: number
          nome: string
          percentual_comissao?: number
          status?: string
          updated_at?: string
        }
        Update: {
          centro_custo?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          meta?: number
          nome?: string
          percentual_comissao?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "finance_manager"
        | "finance_analyst"
        | "commercial_manager"
        | "salesperson"
      conta_tipo: "corrente" | "poupanca" | "investimento"
      importancia_nivel: "importante" | "mediano" | "nao_importante"
      pessoa_tipo: "fisica" | "juridica" | "internacional"
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
      app_role: [
        "admin",
        "user",
        "finance_manager",
        "finance_analyst",
        "commercial_manager",
        "salesperson",
      ],
      conta_tipo: ["corrente", "poupanca", "investimento"],
      importancia_nivel: ["importante", "mediano", "nao_importante"],
      pessoa_tipo: ["fisica", "juridica", "internacional"],
      status_contrato: ["ativo", "encerrado", "suspenso"],
      status_geral: ["ativo", "inativo"],
      status_pagamento: ["pendente", "pago", "vencido", "cancelado"],
      tipo_movimentacao: ["entrada", "saida"],
    },
  },
} as const
