-- 1. Add manifest_id to departments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='manifest_id') THEN
        ALTER TABLE public.departments ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
        CREATE INDEX idx_departments_manifest_id ON public.departments(manifest_id);
    END IF;
END $$;

-- 2. Add manifest_id to healing_testimonies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='healing_testimonies' AND column_name='manifest_id') THEN
        ALTER TABLE public.healing_testimonies ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
        CREATE INDEX idx_healing_testimonies_manifest_id ON public.healing_testimonies(manifest_id);
    END IF;
END $$;

-- 3. Add manifest_id to requisition_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requisition_items' AND column_name='manifest_id') THEN
        ALTER TABLE public.requisition_items ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
        CREATE INDEX idx_requisition_items_manifest_id ON public.requisition_items(manifest_id);
    END IF;
END $$;

-- 4. Add manifest_id to training_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='training_requests' AND column_name='manifest_id') THEN
        ALTER TABLE public.training_requests ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
        CREATE INDEX idx_training_requests_manifest_id ON public.training_requests(manifest_id);
    END IF;
END $$;

-- 5. Add manifest_id to vehicle_attendance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicle_attendance' AND column_name='manifest_id') THEN
        ALTER TABLE public.vehicle_attendance ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
        CREATE INDEX idx_vehicle_attendance_manifest_id ON public.vehicle_attendance(manifest_id);
    END IF;
END $$;
