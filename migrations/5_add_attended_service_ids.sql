-- Add attended_service_ids to children table if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'children' and column_name = 'attended_service_ids') then 
    alter table children add column attended_service_ids text[] default '{}'; 
  end if; 
end $$;
