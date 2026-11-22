-- Rode TODO este arquivo no SQL Editor após schema.sql. Nada fica salvo:
-- dados de teste, denúncia e contador são desfeitos pelo ROLLBACK final.
-- Se um teste falhar, não faça COMMIT; execute ROLLBACK e revise as políticas.
begin;
-- Controle positivo: registro aprovado criado como administrador, dentro da transação.
insert into public.pontos(id,nome,categoria,cidade,uf,endereco,descricao,lat,lng,status,verificado)
values ('ec0a0000-0000-4000-8000-000000000002','EXEMPLO TESTE RLS TEMPORARIO','reciclagem','Capão Bonito','SP','Endereço fictício de teste','EXEMPLO: removido pelo rollback',0,0,'aprovado',true);

set local role anon;
do $$
declare n integer;
begin
 -- Confirma que o teste usa o visitante e consegue ler um aprovado real da transação.
 if current_user <> 'anon' then raise exception 'FALHOU: papel incorreto'; end if;
 select count(*) into n from public.pontos where id='ec0a0000-0000-4000-8000-000000000002';
 if n <> 1 then raise exception 'FALHOU: controle de leitura aprovada'; end if;

 -- Controle positivo: pendente não verificado é permitido (sem RETURNING).
 insert into public.pontos(nome,categoria,cidade,uf,endereco,descricao,lat,lng,status,verificado)
 values ('EXEMPLO TESTE RLS PENDENTE','agua','Capão Bonito','SP','Endereço fictício','EXEMPLO temporário',0,0,'pendente',false);
 select count(*) into n from public.pontos where nome='EXEMPLO TESTE RLS PENDENTE';
 if n <> 0 then raise exception 'FALHOU: anon enxerga pendente'; end if;

 begin
  insert into public.pontos(nome,categoria,cidade,uf,endereco,descricao,lat,lng,status,verificado)
  values ('EXEMPLO TESTE APROVADO NEGADO','agua','Capão Bonito','SP','Endereço fictício','EXEMPLO temporário',0,0,'aprovado',false);
  raise exception 'FALHOU: visitante criou aprovado';
 exception when insufficient_privilege then raise notice 'PASSOU: criar aprovado foi bloqueado'; end;
 begin
  insert into public.pontos(nome,categoria,cidade,uf,endereco,descricao,lat,lng,status,verificado)
  values ('EXEMPLO TESTE VERIFICADO NEGADO','agua','Capão Bonito','SP','Endereço fictício','EXEMPLO temporário',0,0,'pendente',true);
  raise exception 'FALHOU: visitante criou verificado';
 exception when insufficient_privilege then raise notice 'PASSOU: criar verificado foi bloqueado'; end;
 begin
  update public.pontos set nome='EXEMPLO ALTERADO' where id='ec0a0000-0000-4000-8000-000000000002';
  raise exception 'FALHOU: UPDATE não foi negado';
 exception when insufficient_privilege then raise notice 'PASSOU: edição bloqueada'; end;
 begin
  delete from public.pontos where id='ec0a0000-0000-4000-8000-000000000002';
  raise exception 'FALHOU: DELETE não foi negado';
 exception when insufficient_privilege then raise notice 'PASSOU: exclusão bloqueada'; end;
 insert into public.denuncias(ponto_id,motivo) values ('ec0a0000-0000-4000-8000-000000000002','endereco_errado');
 begin
  perform 1 from public.denuncias;
  raise exception 'FALHOU: denúncias expostas';
 exception when insufficient_privilege then raise notice 'PASSOU: leitura das denúncias bloqueada'; end;
 raise notice 'PASSOU: pendente aceito, leitura restrita e denúncia aceita';
end $$;
reset role;
do $$ begin
 if (select denuncias from public.pontos where id='ec0a0000-0000-4000-8000-000000000002') <> 1 then
  raise exception 'FALHOU: contador de denúncias';
 end if;
end $$;
rollback;
