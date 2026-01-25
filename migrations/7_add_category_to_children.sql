-- Add category column to children table if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'children' and column_name = 'category') then 
    alter table children add column category text default 'Member'; 
  end if; 
end $$;
