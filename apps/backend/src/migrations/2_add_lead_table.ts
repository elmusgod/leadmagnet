import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create lead table
  await db.schema
    .createTable('lead')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('agent_id', 'integer', (col) => col.notNull())
    .addColumn('source', 'varchar(255)')
    .addColumn('type', 'varchar(255)')
    .addColumn('sub_type', 'varchar(255)')
    .addColumn('surface', 'varchar(255)')
    .addColumn('surface_carrez', 'varchar(255)')
    .addColumn('room_count', 'varchar(255)')
    .addColumn('floor_count', 'varchar(255)')
    .addColumn('construction_year', 'varchar(255)')
    .addColumn('new_build', 'boolean')
    .addColumn('marketing_type', 'varchar(255)')
    .addColumn('price', 'varchar(255)')
    .addColumn('price_hc', 'varchar(255)')
    .addColumn('price_cc', 'varchar(255)')
    .addColumn('selling_price', 'varchar(255)')
    .addColumn('dealers', 'varchar(255)')
    .addColumn('marketing_start_date', 'varchar(255)')
    .addColumn('marketing_end_date', 'varchar(255)')
    .addColumn('publication_start_date', 'varchar(255)')
    .addColumn('publication_end_date', 'varchar(255)')
    .addColumn('rental_expenses', 'varchar(255)')
    .addColumn('rental_expenses_included', 'boolean')
    .addColumn('fees', 'varchar(255)')
    .addColumn('fees_included', 'boolean')
    .addColumn('iris_ids', 'varchar(255)')
    .addColumn('street_number', 'varchar(255)')
    .addColumn('street', 'varchar(255)')
    .addColumn('zip_code', 'varchar(255)')
    .addColumn('city', 'varchar(255)')
    .addColumn('lat', 'varchar(255)')
    .addColumn('lon', 'varchar(255)')
    .addColumn('description', 'text')
    .addColumn('images', 'text')
    .addColumn('ads', 'text')
    .addColumn('phone_number', 'varchar(255)')
    .addColumn('floor_level', 'varchar(255)')
    .addColumn('land', 'boolean')
    .addColumn('surface_land', 'varchar(255)')
    .addColumn('terrace', 'boolean')
    .addColumn('balcony', 'boolean')
    .addColumn('cellar', 'boolean')
    .addColumn('parking', 'boolean')
    .addColumn('swimming_pool', 'boolean')
    .addColumn('general_state', 'varchar(255)')
    .addColumn('dpe_letter', 'varchar(10)')
    .addColumn('dpe', 'varchar(255)')
    .addColumn('ges_letter', 'varchar(10)')
    .addColumn('ges', 'varchar(255)')
    .addColumn('diagnosis_date', 'varchar(255)')
    .addColumn('statut', 'varchar(255)', (col) => 
      col.notNull().defaultTo('new'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('lead').execute();
}
