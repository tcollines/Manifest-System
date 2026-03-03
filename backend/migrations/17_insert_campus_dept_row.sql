-- Insert Campus and Institutions Department into departments table
INSERT INTO public.departments (id, name, slug, manifest_id)
VALUES ('b2c1d3e4-f5a6-7890-bcde-1234567890ab', 'Campus and Institutions', 'campus', '11dd634c-0411-45f2-a42c-3ab33b81d8e0')
ON CONFLICT (id) DO NOTHING;
