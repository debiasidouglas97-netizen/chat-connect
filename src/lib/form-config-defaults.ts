import type { FormSegment, NativeFieldDef, SegmentFormConfig } from "./form-config-types";

/**
 * Catálogo de campos NATIVOS por segmento.
 *
 * Estes são os campos que já existem como coluna nas tabelas (liderancas,
 * eleitores, profiles). A configuração de tenant pode controlar:
 *  - rótulo customizado
 *  - visibilidade
 *  - obrigatoriedade
 *  - ordem
 *
 * Campos com `locked: true` são essenciais para o funcionamento do sistema
 * (ex: nome, cidade) e não podem ser desativados.
 */
export const NATIVE_FIELDS_CATALOG: Record<FormSegment, NativeFieldDef[]> = {
  liderancas: [
    // Identificação
    { key: "name", defaultLabel: "Nome completo", group: "Identificação", locked: true, inputType: "text" },
    { key: "avatar", defaultLabel: "Foto", group: "Identificação", inputType: "text" },
    { key: "cargo", defaultLabel: "Cargo", group: "Identificação", locked: true, inputType: "text" },
    { key: "cpf", defaultLabel: "CPF", group: "Identificação", inputType: "text" },
    { key: "rg", defaultLabel: "RG", group: "Identificação", inputType: "text" },
    { key: "tipo", defaultLabel: "Tipo de liderança", group: "Identificação", inputType: "select" },
    { key: "influencia", defaultLabel: "Influência", group: "Identificação", inputType: "select" },
    { key: "classificacao_manual", defaultLabel: "Classificação", group: "Identificação", inputType: "select" },

    // Localização
    { key: "cidadePrincipal", defaultLabel: "Cidade principal", group: "Localização", locked: true, inputType: "text" },
    { key: "atuacao", defaultLabel: "Cidades de atuação", group: "Localização", inputType: "text" },
    { key: "address_cep", defaultLabel: "CEP", group: "Localização", inputType: "text" },
    { key: "address_street", defaultLabel: "Logradouro", group: "Localização", inputType: "text" },
    { key: "address_number", defaultLabel: "Número", group: "Localização", inputType: "text" },
    { key: "address_neighborhood", defaultLabel: "Bairro", group: "Localização", inputType: "text" },
    { key: "address_city", defaultLabel: "Cidade (endereço)", group: "Localização", inputType: "text" },
    { key: "address_state", defaultLabel: "Estado (endereço)", group: "Localização", inputType: "text" },

    // Contatos
    { key: "phone", defaultLabel: "Telefone", group: "Contatos", inputType: "phone" },
    { key: "whatsapp", defaultLabel: "WhatsApp", group: "Contatos", inputType: "phone" },
    { key: "email", defaultLabel: "E-mail", group: "Contatos", inputType: "text" },
    { key: "telegram_username", defaultLabel: "Telegram (@usuário)", group: "Contatos", inputType: "text" },

    // Redes sociais
    { key: "instagram", defaultLabel: "Instagram", group: "Redes Sociais", inputType: "text" },
    { key: "facebook", defaultLabel: "Facebook", group: "Redes Sociais", inputType: "text" },
    { key: "youtube", defaultLabel: "YouTube", group: "Redes Sociais", inputType: "url" },

    // Estratégia
    { key: "meta_votos", defaultLabel: "Meta de votos", group: "Estratégia", inputType: "number" },
  ],
  eleitores: [
    // 1. Informações Básicas
    { key: "avatar_url", defaultLabel: "Foto", group: "Informações Básicas", inputType: "text" },
    { key: "nome", defaultLabel: "Nome completo", group: "Informações Básicas", locked: true, inputType: "text" },
    { key: "cidade", defaultLabel: "Cidade", group: "Informações Básicas", locked: true, inputType: "text" },
    { key: "bairro", defaultLabel: "Bairro", group: "Informações Básicas", inputType: "text" },
    { key: "estado", defaultLabel: "Estado", group: "Informações Básicas", inputType: "text" },

    // 2. Contato (Mobilização)
    { key: "whatsapp", defaultLabel: "WhatsApp", group: "Contato", locked: true, inputType: "phone" },
    { key: "telefone", defaultLabel: "Telefone", group: "Contato", inputType: "phone" },
    { key: "email", defaultLabel: "E-mail", group: "Contato", inputType: "text" },

    // 3. Informações Eleitorais
    { key: "zona_eleitoral", defaultLabel: "Zona eleitoral", group: "Informações Eleitorais", inputType: "text" },
    { key: "secao_eleitoral", defaultLabel: "Seção eleitoral", group: "Informações Eleitorais", inputType: "text" },
    { key: "local_votacao", defaultLabel: "Local de votação", group: "Informações Eleitorais", inputType: "text" },

    // 4. Perfil Político
    { key: "intencao_voto", defaultLabel: "Intenção de voto", group: "Perfil Político", inputType: "select" },
    { key: "grau_apoio", defaultLabel: "Grau de apoio", group: "Perfil Político", inputType: "select" },
    { key: "prioridade", defaultLabel: "Prioridade", group: "Perfil Político", inputType: "select" },

    // 5. Comunicação
    { key: "canal_preferido", defaultLabel: "Canal preferido", group: "Comunicação", inputType: "select" },
    { key: "telegram", defaultLabel: "Telegram", group: "Comunicação", inputType: "text" },

    // 6. Demográficos
    { key: "profissao", defaultLabel: "Profissão", group: "Demográficos", inputType: "text" },
    { key: "faixa_etaria", defaultLabel: "Faixa etária", group: "Demográficos", inputType: "select" },
    { key: "genero", defaultLabel: "Gênero", group: "Demográficos", inputType: "select" },

    // 7. Redes Sociais
    { key: "instagram", defaultLabel: "Instagram", group: "Redes Sociais", inputType: "text" },
    { key: "facebook", defaultLabel: "Facebook", group: "Redes Sociais", inputType: "text" },

    // 8. Endereço
    { key: "cep", defaultLabel: "CEP", group: "Endereço", inputType: "text" },
    { key: "logradouro", defaultLabel: "Rua", group: "Endereço", inputType: "text" },
    { key: "numero", defaultLabel: "Número", group: "Endereço", inputType: "text" },

    // 9. Sistema
    { key: "tags", defaultLabel: "Tags", group: "Sistema", inputType: "text" },
    { key: "observacoes", defaultLabel: "Observações", group: "Sistema", inputType: "textarea" },
  ],
  usuarios: [
    { key: "full_name", defaultLabel: "Nome completo", group: "Identificação", locked: true, inputType: "text" },
    { key: "email", defaultLabel: "E-mail", group: "Identificação", locked: true, inputType: "text" },
    { key: "username", defaultLabel: "Username", group: "Identificação", inputType: "text" },
    { key: "cpf", defaultLabel: "CPF", group: "Identificação", inputType: "text" },
    { key: "role", defaultLabel: "Perfil de acesso", group: "Permissões", locked: true, inputType: "select" },
    { key: "is_active", defaultLabel: "Status (ativo)", group: "Permissões", inputType: "checkbox" },
    { key: "whatsapp", defaultLabel: "WhatsApp", group: "Contatos", inputType: "phone" },
    { key: "telegram_username", defaultLabel: "Telegram", group: "Contatos", inputType: "text" },
  ],
};

/**
 * Conjunto de campos que devem vir VISÍVEIS por padrão em cada segmento.
 * Se ausente → todos visíveis. Campos `locked` são sempre visíveis.
 */
const DEFAULT_VISIBLE_BY_SEGMENT: Partial<Record<FormSegment, Set<string>>> = {
  eleitores: new Set(["nome", "cidade", "whatsapp", "bairro"]),
};

/**
 * Grupo que fica TRAVADO no topo de cada segmento (não pode ser reordenado).
 */
export const LOCKED_FIRST_GROUP: Record<FormSegment, string> = {
  liderancas: "Identificação",
  eleitores: "Informações Básicas",
  usuarios: "Identificação",
};

/** Deriva a ordem natural dos grupos a partir do catálogo (1ª ocorrência). */
function deriveGroupOrderFromCatalog(segment: FormSegment): string[] {
  const seen: string[] = [];
  for (const def of NATIVE_FIELDS_CATALOG[segment]) {
    if (!seen.includes(def.group)) seen.push(def.group);
  }
  // Garante que o grupo travado venha primeiro
  const locked = LOCKED_FIRST_GROUP[segment];
  if (locked && seen.includes(locked)) {
    return [locked, ...seen.filter((g) => g !== locked)];
  }
  return seen;
}

/**
 * Default conservador: ordem segue o catálogo. Visibilidade segue
 * `DEFAULT_VISIBLE_BY_SEGMENT` se definido, senão tudo visível. Campos
 * `locked` sempre visíveis e obrigatórios.
 */
export function buildDefaultSegmentConfig(segment: FormSegment): SegmentFormConfig {
  const catalog = NATIVE_FIELDS_CATALOG[segment];
  const defaultVisible = DEFAULT_VISIBLE_BY_SEGMENT[segment];
  const nativeFields: SegmentFormConfig["nativeFields"] = {};
  catalog.forEach((def, idx) => {
    const visible = def.locked
      ? true
      : defaultVisible
        ? defaultVisible.has(def.key)
        : true;
    nativeFields[def.key] = {
      key: def.key,
      visible,
      required: !!def.locked,
      order: idx,
    };
  });
  return {
    nativeFields,
    customFields: [],
    groupOrder: deriveGroupOrderFromCatalog(segment),
  };
}

/**
 * Resolve a configuração efetiva: aplica defaults e garante que campos
 * `locked` permaneçam visíveis e obrigatórios mesmo que a base já tenha
 * uma config gravada antes de uma migração de catálogo.
 */
export function resolveSegmentConfig(
  segment: FormSegment,
  raw: Partial<SegmentFormConfig> | null | undefined,
): SegmentFormConfig {
  const base = buildDefaultSegmentConfig(segment);
  const catalog = NATIVE_FIELDS_CATALOG[segment];

  const merged: SegmentFormConfig = {
    nativeFields: { ...base.nativeFields },
    customFields: Array.isArray(raw?.customFields) ? [...raw!.customFields!] : [],
  };

  if (raw?.nativeFields) {
    for (const key of Object.keys(raw.nativeFields)) {
      const incoming = (raw.nativeFields as any)[key];
      if (merged.nativeFields[key]) {
        merged.nativeFields[key] = { ...merged.nativeFields[key], ...incoming, key };
      }
    }
  }

  // Reforça locked
  for (const def of catalog) {
    if (def.locked) {
      merged.nativeFields[def.key] = {
        ...merged.nativeFields[def.key],
        visible: true,
        required: true,
      };
    }
  }

  // Sanitiza customFields
  merged.customFields = merged.customFields
    .filter((f) => f && typeof f.key === "string" && typeof f.label === "string")
    .map((f, idx) => ({
      key: f.key,
      label: f.label,
      type: (f.type || "text") as any,
      visible: f.visible !== false,
      required: !!f.required,
      order: typeof f.order === "number" ? f.order : idx,
      options: Array.isArray(f.options) ? f.options : [],
      helperText: f.helperText || "",
    }));

  return merged;
}

/** Slug determinístico para keys de campos personalizados. */
export function slugifyFieldKey(label: string): string {
  return (
    "cf_" +
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40)
  );
}
