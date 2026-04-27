import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  Phone,
  MessageCircle,
  Mail,
  AtSign,
  Instagram,
  Facebook,
  Youtube,
  ShieldCheck,
  KeyRound,
  User as UserIcon,
  Eye,
} from "lucide-react";
import CustomFieldsBlock from "./CustomFieldsBlock";
import { NATIVE_FIELDS_CATALOG } from "@/lib/form-config-defaults";
import type { FormSegment, SegmentFormConfig, NativeFieldConfig } from "@/lib/form-config-types";

interface Props {
  segment: FormSegment;
  config: SegmentFormConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Placeholders por chave de campo nativo, alinhados aos do form real
 * (NovaLiderancaDialog), para que o preview reflita fielmente a UX.
 */
const PLACEHOLDERS: Record<string, string> = {
  name: "Ex: João da Silva",
  cargo: "Ex: Presidente da Associação",
  cidadePrincipal: "Selecione",
  influencia: "Média",
  tipo: "Comunitária",
  classificacao_manual: "Selecione",
  atuacao: "Cidades de atuação",
  email: "lideranca@exemplo.com",
  cpf: "000.000.000-00",
  rg: "00.000.000-0",
  username: "ex: joao.silva",
  phone: "(00) 0000-0000",
  whatsapp: "(00) 00000-0000",
  telegram_username: "@usuario",
  instagram: "@usuario",
  facebook: "facebook.com/usuario",
  youtube: "youtube.com/@canal",
  address_cep: "00000-000",
  address_street: "Rua, Av...",
  address_number: "123",
  address_neighborhood: "Bairro",
  address_city: "Cidade",
  address_state: "UF",
  meta_votos: "100",
};

/** Helper: pega config efetiva de um campo nativo + label resolvido. */
function useFieldHelpers(config: SegmentFormConfig, segment: FormSegment) {
  const catalog = NATIVE_FIELDS_CATALOG[segment];
  const defByKey = new Map(catalog.map((d) => [d.key, d]));

  const cfgOf = (key: string): NativeFieldConfig | undefined => config.nativeFields[key];
  const isVisible = (key: string) => cfgOf(key)?.visible !== false && !!defByKey.get(key);
  const labelOf = (key: string) => {
    const cfg = cfgOf(key);
    const def = defByKey.get(key);
    return (cfg?.label?.trim() || def?.defaultLabel || key) ?? key;
  };
  const isRequired = (key: string) => !!cfgOf(key)?.required;
  const placeholderOf = (key: string) => PLACEHOLDERS[key] ?? "";
  const anyVisible = (keys: string[]) => keys.some(isVisible);

  return { isVisible, labelOf, isRequired, placeholderOf, anyVisible };
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs">
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
}

function PreviewLiderancas({ config, segment }: { config: SegmentFormConfig; segment: FormSegment }) {
  const { isVisible, labelOf, isRequired, placeholderOf, anyVisible } = useFieldHelpers(config, segment);

  // Grupos para exibir/ocultar cabeçalhos
  const contatoKeys = ["phone", "whatsapp", "email", "telegram_username"];
  const redesKeys = ["instagram", "facebook", "youtube"];
  const enderecoKeys = [
    "address_cep",
    "address_street",
    "address_number",
    "address_neighborhood",
    "address_city",
    "address_state",
  ];
  // bloco de acesso ao sistema (campos que vivem em "usuarios", mas no form real
  // aparecem dentro do diálogo de liderança quando "Criar acesso" está marcado)
  // Aqui usamos os campos do próprio catálogo de liderança que se referem a contato
  // OBS: cpf/username/password não existem no catálogo de lideranças por padrão,
  // então a seção de acesso é apenas decorativa quando email visível.
  const acessoVisible = isVisible("email");

  return (
    <div className="space-y-4">
      {/* Foto */}
      {isVisible("avatar") && (
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">?</AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm" disabled>
              <Upload className="h-3.5 w-3.5 mr-1" /> {labelOf("avatar")}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">JPG ou PNG</p>
          </div>
        </div>
      )}

      {/* Nome / Cargo */}
      {(isVisible("name") || isVisible("cargo")) && (
        <div className="grid grid-cols-2 gap-3">
          {isVisible("name") && (
            <div>
              <FieldLabel required={isRequired("name")}>{labelOf("name")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("name")} className="bg-muted/30" />
            </div>
          )}
          {isVisible("cargo") && (
            <div>
              <FieldLabel required={isRequired("cargo")}>{labelOf("cargo")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("cargo")} className="bg-muted/30" />
            </div>
          )}
        </div>
      )}

      {/* Cidade / Influência / Tipo / Classificação */}
      {anyVisible(["cidadePrincipal", "influencia", "tipo", "classificacao_manual"]) && (
        <div className="grid grid-cols-3 gap-3">
          {isVisible("cidadePrincipal") && (
            <div>
              <FieldLabel required={isRequired("cidadePrincipal")}>{labelOf("cidadePrincipal")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("cidadePrincipal")} className="bg-muted/30" />
            </div>
          )}
          {isVisible("influencia") && (
            <div>
              <FieldLabel required={isRequired("influencia")}>{labelOf("influencia")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("influencia")} className="bg-muted/30" />
            </div>
          )}
          {isVisible("tipo") && (
            <div>
              <FieldLabel required={isRequired("tipo")}>{labelOf("tipo")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("tipo")} className="bg-muted/30" />
            </div>
          )}
          {isVisible("classificacao_manual") && (
            <div>
              <FieldLabel required={isRequired("classificacao_manual")}>{labelOf("classificacao_manual")}</FieldLabel>
              <Input disabled placeholder={placeholderOf("classificacao_manual")} className="bg-muted/30" />
            </div>
          )}
        </div>
      )}

      {/* Acesso ao Sistema (decorativo) */}
      {acessoVisible && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox checked disabled className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                Criar acesso ao sistema agora
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                A liderança poderá entrar no sistema com estas credenciais.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <FieldLabel required>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {labelOf("email")}
                </span>
              </FieldLabel>
              <Input disabled placeholder={placeholderOf("email")} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel required>
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="h-3 w-3" /> Username
                </span>
              </FieldLabel>
              <Input disabled placeholder={placeholderOf("username")} className="bg-muted/30" />
            </div>
            <div className="col-span-2">
              <FieldLabel required>
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Senha
                </span>
              </FieldLabel>
              <Input disabled placeholder="Mínimo 8 caracteres" className="bg-muted/30" />
            </div>
          </div>
        </div>
      )}

      {/* Documentos (CPF + RG) */}
      {(isVisible("cpf") || isVisible("rg")) && (
        <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Documentos</p>
          <div className="grid grid-cols-2 gap-3">
            {isVisible("cpf") && (
              <div>
                <FieldLabel required={isRequired("cpf") || acessoVisible}>{labelOf("cpf")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("cpf")} className="bg-background" />
              </div>
            )}
            {isVisible("rg") && (
              <div>
                <FieldLabel required={isRequired("rg")}>{labelOf("rg")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("rg")} className="bg-background" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta de votos */}
      {isVisible("meta_votos") && (
        <div className="rounded-lg border p-3 bg-muted/20">
          <FieldLabel>{labelOf("meta_votos")}</FieldLabel>
          <Input disabled placeholder={placeholderOf("meta_votos")} className="bg-background" />
        </div>
      )}

      {/* Contatos adicionais */}
      {anyVisible(contatoKeys) && (
        <>
          <p className="text-xs font-medium text-muted-foreground pt-2">Contatos adicionais</p>
          <div className="grid grid-cols-2 gap-3">
            {isVisible("phone") && (
              <div>
                <FieldLabel required={isRequired("phone")}>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {labelOf("phone")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("phone")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("whatsapp") && (
              <div>
                <FieldLabel required={isRequired("whatsapp")}>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {labelOf("whatsapp")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("whatsapp")} className="bg-muted/30" />
              </div>
            )}
            {!acessoVisible && isVisible("email") && (
              <div>
                <FieldLabel required={isRequired("email")}>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {labelOf("email")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("email")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("telegram_username") && (
              <div>
                <FieldLabel required={isRequired("telegram_username")}>
                  <span className="inline-flex items-center gap-1">
                    <AtSign className="h-3 w-3" /> {labelOf("telegram_username")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("telegram_username")} className="bg-muted/30" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Redes Sociais */}
      {anyVisible(redesKeys) && (
        <>
          <p className="text-xs font-medium text-muted-foreground pt-2">Redes sociais</p>
          <div className="grid grid-cols-3 gap-3">
            {isVisible("instagram") && (
              <div>
                <FieldLabel required={isRequired("instagram")}>
                  <span className="inline-flex items-center gap-1">
                    <Instagram className="h-3 w-3" /> {labelOf("instagram")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("instagram")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("facebook") && (
              <div>
                <FieldLabel required={isRequired("facebook")}>
                  <span className="inline-flex items-center gap-1">
                    <Facebook className="h-3 w-3" /> {labelOf("facebook")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("facebook")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("youtube") && (
              <div>
                <FieldLabel required={isRequired("youtube")}>
                  <span className="inline-flex items-center gap-1">
                    <Youtube className="h-3 w-3" /> {labelOf("youtube")}
                  </span>
                </FieldLabel>
                <Input disabled placeholder={placeholderOf("youtube")} className="bg-muted/30" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Endereço */}
      {anyVisible(enderecoKeys) && (
        <>
          <p className="text-xs font-medium text-muted-foreground pt-2">Endereço</p>
          <div className="grid grid-cols-3 gap-3">
            {isVisible("address_cep") && (
              <div>
                <FieldLabel required={isRequired("address_cep")}>{labelOf("address_cep")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_cep")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("address_street") && (
              <div className="col-span-2">
                <FieldLabel required={isRequired("address_street")}>{labelOf("address_street")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_street")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("address_number") && (
              <div>
                <FieldLabel required={isRequired("address_number")}>{labelOf("address_number")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_number")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("address_neighborhood") && (
              <div>
                <FieldLabel required={isRequired("address_neighborhood")}>{labelOf("address_neighborhood")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_neighborhood")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("address_city") && (
              <div>
                <FieldLabel required={isRequired("address_city")}>{labelOf("address_city")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_city")} className="bg-muted/30" />
              </div>
            )}
            {isVisible("address_state") && (
              <div>
                <FieldLabel required={isRequired("address_state")}>{labelOf("address_state")}</FieldLabel>
                <Input disabled placeholder={placeholderOf("address_state")} className="bg-muted/30" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Atuação (cidades) */}
      {isVisible("atuacao") && (
        <div>
          <FieldLabel required={isRequired("atuacao")}>{labelOf("atuacao")}</FieldLabel>
          <Input disabled placeholder={placeholderOf("atuacao")} className="bg-muted/30" />
        </div>
      )}

      {/* Personalizados */}
      {config.customFields.filter((f) => f.visible).length > 0 && (
        <div className="pt-3 border-t">
          <CustomFieldsBlock
            fields={config.customFields}
            values={{}}
            onChange={() => {}}
            disabled
            title="Campos personalizados"
          />
        </div>
      )}
    </div>
  );
}

/** Fallback genérico para outros segmentos (eleitores/usuarios). */
function PreviewGeneric({ config, segment }: { config: SegmentFormConfig; segment: FormSegment }) {
  const catalog = NATIVE_FIELDS_CATALOG[segment];
  const visibleNatives = catalog
    .map((def) => ({ def, cfg: config.nativeFields[def.key] }))
    .filter((x) => x.cfg?.visible !== false)
    .sort((a, b) => (a.cfg?.order ?? 0) - (b.cfg?.order ?? 0));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {visibleNatives.map(({ def, cfg }) => {
          const label = (cfg?.label?.trim() || def.defaultLabel) ?? def.defaultLabel;
          return (
            <div
              key={def.key}
              className={def.inputType === "textarea" || def.inputType === "checkbox" ? "col-span-2" : ""}
            >
              <FieldLabel required={cfg?.required}>{label}</FieldLabel>
              <Input disabled placeholder={`(${def.inputType})`} className="bg-muted/30" />
            </div>
          );
        })}
      </div>

      {config.customFields.filter((f) => f.visible).length > 0 && (
        <div className="pt-3 border-t">
          <CustomFieldsBlock
            fields={config.customFields}
            values={{}}
            onChange={() => {}}
            disabled
            title="Campos personalizados"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modal de preview do formulário de cadastro, replicando o layout real
 * do diálogo de criação (ex: "Nova Liderança"), em vez de uma lista
 * genérica de inputs empilhados.
 */
export default function FormPreview({ segment, config, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Preview do formulário
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Assim o cadastro aparecerá com a configuração atual (não salva alterações).
          </p>
        </DialogHeader>

        {segment === "liderancas" ? (
          <PreviewLiderancas config={config} segment={segment} />
        ) : (
          <PreviewGeneric config={config} segment={segment} />
        )}
      </DialogContent>
    </Dialog>
  );
}
