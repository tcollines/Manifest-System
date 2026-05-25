import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function fixConstraints() {
    console.log("Connecting to database to fix global unique constraints...");
    
    // Convert pooler URL to direct connection
    const directUrl = process.env.DATABASE_URL!.replace(':6543', ':5432').split('?')[0];
    console.log("Using URL:", directUrl.replace(/:[^:@]+@/, ':***@')); // safe log

    const client = new Client({
        connectionString: directUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const sqlScript = `
        DO $$ 
        BEGIN
            -- Drop existing SKU/Barcode constraints if they exist
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_product_variants_sku_key') THEN
                ALTER TABLE public.sales_product_variants DROP CONSTRAINT sales_product_variants_sku_key;
            END IF;
            
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_product_variants_barcode_key') THEN
                ALTER TABLE public.sales_product_variants DROP CONSTRAINT sales_product_variants_barcode_key;
            END IF;

            -- Add new composite constraints safely
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_product_variants_manifest_sku_key') THEN
                ALTER TABLE public.sales_product_variants ADD CONSTRAINT sales_product_variants_manifest_sku_key UNIQUE (manifest_id, sku);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_product_variants_manifest_barcode_key') THEN
                ALTER TABLE public.sales_product_variants ADD CONSTRAINT sales_product_variants_manifest_barcode_key UNIQUE (manifest_id, barcode);
            END IF;

            -- Same for products
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_products_name_key') THEN
                ALTER TABLE public.sales_products DROP CONSTRAINT sales_products_name_key;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_products_manifest_name_key') THEN
                ALTER TABLE public.sales_products ADD CONSTRAINT sales_products_manifest_name_key UNIQUE (manifest_id, name);
            END IF;

            -- Same for categories
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_categories_name_key') THEN
                ALTER TABLE public.sales_categories DROP CONSTRAINT sales_categories_name_key;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_categories_manifest_name_key') THEN
                ALTER TABLE public.sales_categories ADD CONSTRAINT sales_categories_manifest_name_key UNIQUE (manifest_id, name);
            END IF;
        END $$;
        `;

        await client.query(sqlScript);
        console.log("Successfully fixed constraints to be tenant-specific!");
    } catch (err) {
        console.error("Failed to fix constraints:", err);
    } finally {
        await client.end();
    }
}

fixConstraints();
