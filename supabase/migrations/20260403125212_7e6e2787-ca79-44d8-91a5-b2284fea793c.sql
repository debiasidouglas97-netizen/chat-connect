
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  tipo_evento text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  descricao_bruta text NOT NULL,
  descricao_ia text,
  prioridade text NOT NULL DEFAULT 'informativo',
  usuario_responsavel text DEFAULT 'Sistema',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read activity logs"
  ON public.activity_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update activity logs"
  ON public.activity_logs FOR UPDATE
  USING (true);

CREATE INDEX idx_activity_logs_tenant_created ON public.activity_logs (tenant_id, created_at DESC);

-- Trigger function for cidades
CREATE OR REPLACE FUNCTION public.log_cidade_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'cidade_criada', 'cidade', NEW.id,
    'Nova cidade cadastrada: ' || NEW.name || ' (' || NEW.regiao || ')',
    'informativo');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_cidade_created
  AFTER INSERT ON public.cidades
  FOR EACH ROW EXECUTE FUNCTION public.log_cidade_created();

-- Trigger for liderancas
CREATE OR REPLACE FUNCTION public.log_lideranca_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'lideranca_criada', 'lideranca', NEW.id,
    'Nova liderança cadastrada: ' || NEW.name || ' (' || NEW.cargo || ') em ' || NEW.cidade_principal,
    'relevante');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lideranca_created
  AFTER INSERT ON public.liderancas
  FOR EACH ROW EXECUTE FUNCTION public.log_lideranca_created();

-- Trigger for emendas
CREATE OR REPLACE FUNCTION public.log_emenda_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'emenda_criada', 'emenda', NEW.id,
    'Nova emenda ' || NEW.tipo || ' de ' || NEW.valor || ' para ' || NEW.cidade,
    'relevante');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_emenda_created
  AFTER INSERT ON public.emendas
  FOR EACH ROW EXECUTE FUNCTION public.log_emenda_created();

-- Trigger for demandas (insert)
CREATE OR REPLACE FUNCTION public.log_demanda_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'demanda_criada', 'demanda', NEW.id,
    'Nova demanda criada: ' || NEW.title || ' em ' || NEW.city,
    'informativo');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_demanda_created
  AFTER INSERT ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.log_demanda_created();

-- Trigger for demanda status change
CREATE OR REPLACE FUNCTION public.log_demanda_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.col IS DISTINCT FROM NEW.col THEN
    INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
    VALUES (NEW.tenant_id, 'demanda_status', 'demanda', NEW.id,
      'Demanda "' || NEW.title || '" movida de ' || OLD.col || ' para ' || NEW.col,
      CASE WHEN NEW.col = 'resolvida' THEN 'relevante' ELSE 'informativo' END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_demanda_status
  AFTER UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.log_demanda_status();

-- Trigger for eventos
CREATE OR REPLACE FUNCTION public.log_evento_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'evento_criado', 'evento', NEW.id,
    'Nova agenda: ' || NEW.titulo || ' em ' || NEW.cidade || ' (' || NEW.data || ')',
    'relevante');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_evento_created
  AFTER INSERT ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.log_evento_created();

-- Trigger for mobilizacoes
CREATE OR REPLACE FUNCTION public.log_mobilizacao_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'mobilizacao_enviada', 'mobilizacao', NEW.id,
    'Mobilização digital: ' || NEW.titulo || ' (' || NEW.tipo || ')',
    'relevante');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_mobilizacao_created
  AFTER INSERT ON public.mobilizacoes
  FOR EACH ROW EXECUTE FUNCTION public.log_mobilizacao_created();
