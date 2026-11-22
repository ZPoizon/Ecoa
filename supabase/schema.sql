-- Ecoa — execute uma vez no SQL Editor do projeto Supabase.
-- Não apaga nem substitui tabelas existentes. Se pontos/denuncias já existem,
-- esta transação falha: revise uma migração antes de executar novamente.
begin;
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Dicionário fixo permite indexar textos sem acentos. Se alterar o dicionário,
-- recalcule as colunas e reconstrua os índices correspondentes.
create function public.ecoa_normalizar(text) returns text
language sql immutable strict parallel safe set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1)); $$;
revoke all on function public.ecoa_normalizar(text) from public;
grant execute on function public.ecoa_normalizar(text) to anon;

create table public.pontos (
 id uuid primary key default gen_random_uuid(),
 nome text not null check (char_length(btrim(nome)) between 3 and 120),
 categoria text not null check (categoria in ('reciclagem','doacao','agua','horta','oleo-de-cozinha','pilhas-eletronicos','outro')),
 cidade text not null check (char_length(btrim(cidade)) between 2 and 100),
 uf text not null check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 bairro text not null default '' check (char_length(bairro) <= 100),
 endereco text not null check (char_length(btrim(endereco)) between 3 and 240),
 descricao text not null check (char_length(btrim(descricao)) between 3 and 600),
 horario text not null default '' check (char_length(horario) <= 200),
 aceita text not null default '' check (char_length(aceita) <= 300),
 telefone text not null default '' check (char_length(telefone) <= 40),
 site text not null default '' check (char_length(site) <= 500 and (site = '' or site ~ '^https://[^[:space:]@]+$')),
 lat double precision not null check (lat between -90 and 90),
 lng double precision not null check (lng between -180 and 180),
 status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
 verificado boolean not null default false,
 denuncias integer not null default 0 check (denuncias >= 0),
 criado_em timestamptz not null default now(),
 nome_busca text generated always as (public.ecoa_normalizar(nome)) stored,
 cidade_busca text generated always as (public.ecoa_normalizar(cidade)) stored
);
create table public.denuncias (
 id uuid primary key default gen_random_uuid(),
 ponto_id uuid not null references public.pontos(id) on delete cascade,
 motivo text not null check (motivo in ('endereco_errado','nao_existe','conteudo_improprio')),
 criado_em timestamptz not null default now()
);
create index pontos_cidade_idx on public.pontos(cidade_busca, uf) where status='aprovado';
create index pontos_categoria_idx on public.pontos(categoria) where status='aprovado';
create index pontos_area_idx on public.pontos(lat,lng) where status='aprovado';
create index pontos_nome_idx on public.pontos using gin(nome_busca extensions.gin_trgm_ops) where status='aprovado';
create index pontos_cidade_texto_idx on public.pontos using gin(cidade_busca extensions.gin_trgm_ops) where status='aprovado';
create index denuncias_ponto_idx on public.denuncias(ponto_id);

alter table public.pontos enable row level security;
alter table public.denuncias enable row level security;
-- Remove privilégios automáticos, inclusive de contas autenticadas nesta versão.
revoke all on public.pontos, public.denuncias from public, anon, authenticated;
grant usage on schema public, extensions to anon;
grant select on public.pontos to anon;
grant insert(nome,categoria,cidade,uf,bairro,endereco,descricao,horario,aceita,telefone,site,lat,lng,status,verificado) on public.pontos to anon;
grant insert(ponto_id,motivo) on public.denuncias to anon;
create policy "Visitante le apenas aprovados" on public.pontos for select to anon using(status='aprovado');
create policy "Visitante envia apenas pendentes" on public.pontos for insert to anon
 with check(status='pendente' and verificado=false and denuncias=0);
create policy "Visitante denuncia ponto aprovado" on public.denuncias for insert to anon
 with check(exists(select 1 from public.pontos p where p.id=ponto_id and p.status='aprovado'));
-- Sem políticas e sem privilégios UPDATE/DELETE. Denúncias não são legíveis.

-- Lista completa de cidades com pontos; invoker mantém RLS, sem bypass.
create function public.cidades_pontos() returns table(cidade text, uf text)
language sql stable security invoker set search_path = ''
as $$ select distinct p.cidade,p.uf from public.pontos p
 where p.status='aprovado' and p.nome not like 'EXEMPLO%' order by p.cidade,p.uf; $$;
revoke all on function public.cidades_pontos() from public;
grant execute on function public.cidades_pontos() to anon;

-- Contagem mantida pelo banco, nunca aceita do navegador.
create function public.ecoa_contar_denuncia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.pontos set denuncias=denuncias+1 where id=new.ponto_id;
 return new;
end; $$;
revoke all on function public.ecoa_contar_denuncia() from public, anon, authenticated;
create trigger contar_denuncia after insert on public.denuncias
 for each row execute function public.ecoa_contar_denuncia();

-- EXEMPLOS FICTÍCIOS da base atual: coordenadas 0,0, NÃO locais reais.
-- O cliente oculta nomes começando por EXEMPLO. Substitua os dados e só então
-- remova o prefixo. Não marque locais reais como verificados sem conferência.
insert into public.pontos(nome,categoria,cidade,uf,endereco,descricao,lat,lng,status,verificado)
values ('EXEMPLO FICTÍCIO — substitua este local','reciclagem','Substitua','SP','Substitua pelo endereço público','EXEMPLO: substitua por informações verificadas.',0,0,'aprovado',true),
 ('EXEMPLO FICTÍCIO — substitua este local','horta','Substitua','SP','Substitua pelo endereço público','EXEMPLO: substitua por informações verificadas.',0,0,'aprovado',true);
commit;
