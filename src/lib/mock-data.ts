// ============================================================
// MandatoGov — Mock Data (São Paulo context)
// ============================================================

import type { CidadeBase, LiderancaBase } from "./scoring";

// --------------- Cidades ---------------

export const cidadesData: CidadeBase[] = [
  // Baixada Santista
  { name: "Santos", population: "433.311", peso: 10, regiao: "Baixada Santista", demandas: 14, demandasResolvidas: 10, comunicacaoRecente: true, presencaDeputado: true, engajamento: 85, liderancas: 6, emendas: 4 },
  { name: "São Vicente", population: "368.971", peso: 8, regiao: "Baixada Santista", demandas: 9, demandasResolvidas: 5, comunicacaoRecente: true, presencaDeputado: false, engajamento: 60, liderancas: 4, emendas: 2 },
  { name: "Guarujá", population: "322.750", peso: 8, regiao: "Baixada Santista", demandas: 7, demandasResolvidas: 2, comunicacaoRecente: false, presencaDeputado: false, engajamento: 35, liderancas: 3, emendas: 1 },
  { name: "Praia Grande", population: "330.845", peso: 7, regiao: "Baixada Santista", demandas: 6, demandasResolvidas: 4, comunicacaoRecente: true, presencaDeputado: true, engajamento: 70, liderancas: 3, emendas: 2 },
  { name: "Peruíbe", population: "67.548", peso: 4, regiao: "Baixada Santista", demandas: 3, demandasResolvidas: 0, comunicacaoRecente: false, presencaDeputado: false, engajamento: 15, liderancas: 1, emendas: 0 },
  { name: "Itanhaém", population: "100.496", peso: 5, regiao: "Baixada Santista", demandas: 4, demandasResolvidas: 2, comunicacaoRecente: false, presencaDeputado: false, engajamento: 30, liderancas: 2, emendas: 1 },
  { name: "Cubatão", population: "131.626", peso: 6, regiao: "Baixada Santista", demandas: 5, demandasResolvidas: 3, comunicacaoRecente: true, presencaDeputado: false, engajamento: 50, liderancas: 2, emendas: 1 },
  // Região de Bauru
  { name: "Bauru", population: "379.297", peso: 9, regiao: "Região de Bauru", demandas: 10, demandasResolvidas: 7, comunicacaoRecente: true, presencaDeputado: true, engajamento: 78, liderancas: 5, emendas: 3 },
  { name: "Agudos", population: "37.444", peso: 3, regiao: "Região de Bauru", demandas: 2, demandasResolvidas: 1, comunicacaoRecente: true, presencaDeputado: false, engajamento: 40, liderancas: 1, emendas: 0 },
  { name: "Lençóis Paulista", population: "68.421", peso: 4, regiao: "Região de Bauru", demandas: 3, demandasResolvidas: 2, comunicacaoRecente: false, presencaDeputado: false, engajamento: 45, liderancas: 2, emendas: 1 },
  { name: "Pederneiras", population: "44.632", peso: 3, regiao: "Região de Bauru", demandas: 2, demandasResolvidas: 1, comunicacaoRecente: false, presencaDeputado: false, engajamento: 25, liderancas: 1, emendas: 0 },
  { name: "Jaú", population: "148.672", peso: 6, regiao: "Região de Bauru", demandas: 5, demandasResolvidas: 3, comunicacaoRecente: true, presencaDeputado: false, engajamento: 55, liderancas: 3, emendas: 2 },
];

// --------------- Lideranças ---------------

export const liderancasData: LiderancaBase[] = [
  {
    name: "Ricardo Ferreira", img: "RF", cidadePrincipal: "Santos",
    cargo: "Presidente da Associação Comercial", influencia: "Alta", tipo: "Comunitária",
    engajamento: 90,
    atuacao: [
      { cidadeNome: "Santos", intensidade: "Alta" },
      { cidadeNome: "São Vicente", intensidade: "Média" },
      { cidadeNome: "Guarujá", intensidade: "Média" },
      { cidadeNome: "Cubatão", intensidade: "Baixa" },
    ],
  },
  {
    name: "Fernanda Almeida", img: "FA", cidadePrincipal: "Bauru",
    cargo: "Vereadora", influencia: "Alta", tipo: "Política",
    engajamento: 85,
    atuacao: [
      { cidadeNome: "Bauru", intensidade: "Alta" },
      { cidadeNome: "Jaú", intensidade: "Alta" },
      { cidadeNome: "Agudos", intensidade: "Média" },
      { cidadeNome: "Pederneiras", intensidade: "Baixa" },
      { cidadeNome: "Lençóis Paulista", intensidade: "Média" },
    ],
  },
  {
    name: "Marcos Souza", img: "MS", cidadePrincipal: "Guarujá",
    cargo: "Líder comunitário", influencia: "Média", tipo: "Eleitoral",
    engajamento: 65,
    atuacao: [
      { cidadeNome: "Guarujá", intensidade: "Alta" },
      { cidadeNome: "Santos", intensidade: "Baixa" },
    ],
  },
  {
    name: "Claudia Mendes", img: "CM", cidadePrincipal: "Praia Grande",
    cargo: "Diretora de escola", influencia: "Média", tipo: "Comunitária",
    engajamento: 50,
    atuacao: [
      { cidadeNome: "Praia Grande", intensidade: "Alta" },
    ],
  },
  {
    name: "José Antônio Ribeiro", img: "JR", cidadePrincipal: "Peruíbe",
    cargo: "Empresário local", influencia: "Baixa", tipo: "Eleitoral",
    engajamento: 20,
    atuacao: [
      { cidadeNome: "Peruíbe", intensidade: "Média" },
    ],
  },
  {
    name: "Patrícia Oliveira", img: "PO", cidadePrincipal: "Santos",
    cargo: "Coordenadora de ONG", influencia: "Alta", tipo: "Comunitária",
    engajamento: 80,
    atuacao: [
      { cidadeNome: "Santos", intensidade: "Alta" },
      { cidadeNome: "São Vicente", intensidade: "Alta" },
      { cidadeNome: "Praia Grande", intensidade: "Média" },
      { cidadeNome: "Guarujá", intensidade: "Média" },
      { cidadeNome: "Cubatão", intensidade: "Baixa" },
    ],
  },
  {
    name: "Eduardo Lima", img: "EL", cidadePrincipal: "Jaú",
    cargo: "Presidente do sindicato rural", influencia: "Média", tipo: "Política",
    engajamento: 60,
    atuacao: [
      { cidadeNome: "Jaú", intensidade: "Alta" },
      { cidadeNome: "Lençóis Paulista", intensidade: "Média" },
      { cidadeNome: "Pederneiras", intensidade: "Média" },
    ],
  },
  {
    name: "Ana Beatriz Costa", img: "AB", cidadePrincipal: "Itanhaém",
    cargo: "Líder sindical", influencia: "Baixa", tipo: "Comunitária",
    engajamento: 30,
    atuacao: [
      { cidadeNome: "Itanhaém", intensidade: "Alta" },
      { cidadeNome: "Peruíbe", intensidade: "Baixa" },
    ],
  },
];

// --------------- Demandas (Kanban) ---------------

export const demandasData = [
  { id: 1, col: "nova", title: "Reforma do Hospital Municipal", city: "Santos", priority: "Urgente", responsible: "Ricardo Ferreira", attachments: 3 },
  { id: 2, col: "nova", title: "Pavimentação da Av. Conselheiro Nébias", city: "Santos", priority: "Alta", responsible: "Patrícia Oliveira", attachments: 1 },
  { id: 3, col: "analise", title: "Construção de creche no Jardim Casqueiro", city: "Cubatão", priority: "Média", responsible: "Marcos Souza", attachments: 2 },
  { id: 4, col: "analise", title: "Iluminação pública na orla", city: "Guarujá", priority: "Alta", responsible: "Marcos Souza", attachments: 0 },
  { id: 5, col: "encaminhada", title: "Equipamentos para UBS Central", city: "Bauru", priority: "Alta", responsible: "Fernanda Almeida", attachments: 1 },
  { id: 6, col: "execucao", title: "Duplicação da SP-055 trecho Peruíbe", city: "Peruíbe", priority: "Urgente", responsible: "José Antônio Ribeiro", attachments: 4 },
  { id: 7, col: "resolvida", title: "Ambulância para Itanhaém", city: "Itanhaém", priority: "Alta", responsible: "Ana Beatriz Costa", attachments: 2 },
  { id: 8, col: "nova", title: "Reforma de escola em Lençóis Paulista", city: "Lençóis Paulista", priority: "Média", responsible: "Eduardo Lima", attachments: 1 },
  { id: 9, col: "execucao", title: "Saneamento básico na Vila Nova", city: "Praia Grande", priority: "Urgente", responsible: "Claudia Mendes", attachments: 3 },
];

// --------------- Emendas ---------------

export const emendasData = [
  { id: 1, cidade: "Santos", valor: "R$ 3.000.000", status: "Liberada", tipo: "Saúde", ano: 2024 },
  { id: 2, cidade: "Bauru", valor: "R$ 1.500.000", status: "Aprovada", tipo: "Educação", ano: 2024 },
  { id: 3, cidade: "Guarujá", valor: "R$ 800.000", status: "Proposta", tipo: "Infraestrutura", ano: 2025 },
  { id: 4, cidade: "Praia Grande", valor: "R$ 1.200.000", status: "Paga", tipo: "Saúde", ano: 2024 },
  { id: 5, cidade: "Santos", valor: "R$ 500.000", status: "Aprovada", tipo: "Cultura", ano: 2025 },
  { id: 6, cidade: "Jaú", valor: "R$ 900.000", status: "Liberada", tipo: "Infraestrutura", ano: 2024 },
  { id: 7, cidade: "São Vicente", valor: "R$ 1.100.000", status: "Aprovada", tipo: "Educação", ano: 2024 },
  { id: 8, cidade: "Cubatão", valor: "R$ 600.000", status: "Proposta", tipo: "Saúde", ano: 2025 },
  { id: 9, cidade: "Peruíbe", valor: "R$ 400.000", status: "Proposta", tipo: "Infraestrutura", ano: 2025 },
];

// --------------- Agenda ---------------

export const eventosData = [
  { data: "20 Mar", hora: "09:00", titulo: "Reunião com prefeito de Santos", cidade: "Santos", tipo: "Reunião", liderancas: 3, demandas: 4 },
  { data: "20 Mar", hora: "14:00", titulo: "Visita à UBS Central de Bauru", cidade: "Bauru", tipo: "Visita", liderancas: 2, demandas: 2 },
  { data: "21 Mar", hora: "10:00", titulo: "Inauguração de escola em Praia Grande", cidade: "Praia Grande", tipo: "Evento", liderancas: 3, demandas: 1 },
  { data: "22 Mar", hora: "08:30", titulo: "Audiência pública — saneamento Guarujá", cidade: "Guarujá", tipo: "Audiência", liderancas: 4, demandas: 3 },
  { data: "23 Mar", hora: "15:00", titulo: "Entrega de equipamentos em Jaú", cidade: "Jaú", tipo: "Entrega", liderancas: 2, demandas: 1 },
  { data: "24 Mar", hora: "10:00", titulo: "Visita comunitária em Peruíbe", cidade: "Peruíbe", tipo: "Visita", liderancas: 1, demandas: 2 },
];
