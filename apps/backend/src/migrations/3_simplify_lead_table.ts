import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create a new table with the simplified structure
  await db.schema
    .createTable('lead_new')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('phone_number', 'varchar(255)', (col) => col.notNull())
    .addColumn('property_info', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar(255)', (col) => 
      col.notNull().defaultTo('new'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Get all leads from the old table
  const leads = await db.selectFrom('lead').selectAll().execute();

  // Insert leads into the new table with combined property information
  for (const lead of leads) {
    const propertyInfo = [
      lead.type ? `Type: ${lead.type}` : null,
      lead.surface ? `Surface: ${lead.surface}m²` : null,
      lead.price ? `Prix: ${lead.price}€` : null,
      lead.city ? `Ville: ${lead.city}` : null,
      lead.description ? `Description: ${lead.description}` : null
    ].filter(Boolean).join(' - ');

    await db.insertInto('lead_new').values({
      id: lead.id,
      phone_number: lead.phone_number || '',
      property_info: propertyInfo || 'Aucune information',
      status: lead.statut || 'new',
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }).execute();
  }

  // Drop the old table
  await db.schema.dropTable('lead').execute();

  // Create the final table with the new structure
  await db.schema
    .createTable('lead')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('phone_number', 'varchar(255)', (col) => col.notNull())
    .addColumn('property_info', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar(255)', (col) => 
      col.notNull().defaultTo('new'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Copy data from the temporary table to the final table
  const newLeads = await db.selectFrom('lead_new').selectAll().execute();
  for (const lead of newLeads) {
    await db.insertInto('lead').values(lead).execute();
  }

  // Drop the temporary table
  await db.schema.dropTable('lead_new').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This is a destructive migration, so the down migration will create a simplified version
  // of the original table structure with minimal columns
  await db.schema
    .createTable('lead_old')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('agent_id', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('phone_number', 'varchar(255)')
    .addColumn('type', 'varchar(255)')
    .addColumn('surface', 'varchar(255)')
    .addColumn('price', 'varchar(255)')
    .addColumn('city', 'varchar(255)')
    .addColumn('description', 'text')
    .addColumn('statut', 'varchar(255)', (col) => 
      col.notNull().defaultTo('new'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Get all leads from the simplified table
  const leads = await db.selectFrom('lead').selectAll().execute();

  // Insert leads into the old structure table
  for (const lead of leads) {
    await db.insertInto('lead_old').values({
      id: lead.id,
      agent_id: 1,
      phone_number: lead.phone_number,
      statut: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }).execute();
  }

  // Drop the simplified table
  await db.schema.dropTable('lead').execute();

  // Rename the old structure table to the original name
  await db.schema
    .createTable('lead')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('agent_id', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('phone_number', 'varchar(255)')
    .addColumn('type', 'varchar(255)')
    .addColumn('surface', 'varchar(255)')
    .addColumn('price', 'varchar(255)')
    .addColumn('city', 'varchar(255)')
    .addColumn('description', 'text')
    .addColumn('statut', 'varchar(255)', (col) => 
      col.notNull().defaultTo('new'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Copy data from the temporary table to the final table
  const oldLeads = await db.selectFrom('lead_old').selectAll().execute();
  for (const lead of oldLeads) {
    await db.insertInto('lead').values(lead).execute();
  }

  // Drop the temporary table
  await db.schema.dropTable('lead_old').execute();
}
