import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Lead, Database } from '@/type/database';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

@Injectable()
export class LeadService extends BaseCrudService<Lead> {
  constructor(@InjectKysely() readonly db: Kysely<Database>) {
    super(db, 'lead');
  }

  /**
   * Find all leads with optional filtering
   * @param filter Optional filter criteria
   * @returns Array of leads
   */
  async findAll(filter: any = {}): Promise<Lead[]> {
    console.log('Finding leads with filter:', filter);
    
    let query = this.db.selectFrom('lead').selectAll();
    
    // Order by most recent first
    query = query.orderBy('created_at', 'desc');
    
    return await query.execute();
  }

  /**
   * Find a lead by ID
   * @param id Lead ID
   * @returns Lead object
   */
  async findOne(id: number): Promise<Lead> {
    console.log(`Finding lead with ID: ${id}`);
    
    const lead = await this.db
      .selectFrom('lead')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    
    return lead;
  }

  /**
   * Generate a summary for a lead
   * @param id Lead ID
   * @returns Generated summary text
   */
  async generateSummary(id: number): Promise<string> {
    console.log(`Generating summary for lead with ID: ${id}`);
    
    // Get the lead data
    const lead = await this.findOne(id);
    
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    
    // The property_info already contains all the information we need
    return lead.property_info;
  }

  /**
   * Import leads from Excel file
   * @param filePath Path to the Excel file
   * @param agentId ID of the agent to assign leads to (not used in the new structure but kept for compatibility)
   * @returns Array of created leads
   */
  async importFromExcel(filePath: string, agentId: number): Promise<Lead[]> {
    try {
      console.log(`Starting import from Excel file: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Read the Excel file
      console.log('Reading Excel file...');
      let workbook;
      try {
        workbook = XLSX.readFile(filePath, { type: 'file', cellDates: true, cellNF: false, cellText: false });
      } catch (readError) {
        console.error('Error reading Excel file:', readError);
        throw new Error(`Failed to read Excel file: ${readError.message}`);
      }
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file has no sheets');
      }
      
      const sheetName = workbook.SheetNames[0];
      console.log(`Using sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with array format (header: 1)
      console.log('Converting to JSON...');
      let data;
      try {
        data = XLSX.utils.sheet_to_json(worksheet, { 
          defval: null,
          raw: true,
          header: 1
        });
      } catch (jsonError) {
        console.error('Error converting Excel to JSON:', jsonError);
        throw new Error(`Failed to convert Excel to JSON: ${jsonError.message}`);
      }
      
      console.log(`Found ${data ? data.length : 0} rows in Excel file`);
      
      if (!data || data.length === 0) {
        throw new Error('Excel file has no data rows');
      }
      
      // Map Excel data to lead objects with the new simplified structure
      console.log('Mapping Excel data to lead objects...');
      const leads = [];
      
      // Skip the header row if it exists
      const startIndex = data[0][0] && typeof data[0][0] === 'string' ? 1 : 0;
      
      for (let index = startIndex; index < data.length; index++) {
        try {
          const row = data[index];
          
          // Skip empty rows
          if (!row || row.length === 0) {
            console.log(`Skipping empty row at index ${index}`);
            continue;
          }
          
          // Get phone number from first column
          const phoneNumber = row[0] ? String(row[0]).trim() : '';
          
          // Get property info from second column
          const propertyInfo = row[1] ? String(row[1]).trim() : '';
          
          // Skip rows without phone number or property info
          if (!phoneNumber || !propertyInfo) {
            console.log(`Skipping row ${index} due to missing phone number or property info`);
            continue;
          }
          
          // Create a lead object with the new structure
          const lead = {
            phone_number: phoneNumber,
            property_info: propertyInfo,
            status: 'new' // Default status for new leads
          };
          
          leads.push(lead);
        } catch (rowError) {
          console.error(`Error processing row ${index}:`, rowError);
          console.error('Row data:', JSON.stringify(data[index]));
          // Continue processing other rows
          console.log(`Skipping row ${index} due to error`);
        }
      }
      
      if (leads.length === 0) {
        throw new Error('No valid leads found in Excel file');
      }
      
      // Create leads in database
      console.log(`Inserting ${leads.length} leads into database...`);
      const createdLeads = [];
      
      for (let i = 0; i < leads.length; i++) {
        try {
          console.log(`Inserting lead ${i+1}/${leads.length}...`);
          console.log('Lead data:', JSON.stringify(leads[i]));
          const createdLead = await this.create(leads[i]);
          createdLeads.push(createdLead);
          console.log(`Lead ${i+1} inserted successfully:`, JSON.stringify(createdLead));
        } catch (dbError) {
          console.error(`Error inserting lead ${i+1}:`, dbError);
          console.error('Error details:', dbError.message);
          // Continue with other leads
        }
      }
      
      // Clean up the temporary file
      try {
        console.log('Cleaning up temporary file...');
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temporary file:', unlinkError);
      }
      
      console.log(`Successfully imported ${createdLeads.length} leads out of ${leads.length}`);
      return createdLeads;
    } catch (error) {
      console.error('Error importing leads from Excel:', error);
      
      // Try to clean up the file if it exists
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up file ${filePath} after error`);
        }
      } catch (cleanupError) {
        console.error('Error during cleanup after failure:', cleanupError);
      }
      
      throw error;
    }
  }
}
