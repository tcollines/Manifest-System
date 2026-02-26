ALTER TABLE departments ADD COLUMN dashboard_route TEXT;

UPDATE departments SET dashboard_route = '/registration' WHERE code = 'd1';
UPDATE departments SET dashboard_route = '/next-gen' WHERE code = 'd2';
UPDATE departments SET dashboard_route = '/parking' WHERE code = 'd3';
UPDATE departments SET dashboard_route = '/finance' WHERE code = 'd4';
UPDATE departments SET dashboard_route = '/transportation' WHERE code = 'd5';
UPDATE departments SET dashboard_route = '/follow-up' WHERE code = 'd6';
UPDATE departments SET dashboard_route = '/schools' WHERE code = 'd7';
UPDATE departments SET dashboard_route = '/healing' WHERE code = 'd8';
