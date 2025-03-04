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
    
    // Apply agent_id filter if provided
    if (filter.agent_id) {
      query = query.where('agent_id', '=', filter.agent_id);
    }
    
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
    
    // Extract the most important information for the summary
    const propertyType = lead.type || 'Propriété';
    const location = [lead.street_number, lead.street, lead.zip_code, lead.city]
      .filter(Boolean)
      .join(' ');
    const price = lead.price ? `${lead.price}€` : 'Prix non spécifié';
    const surface = lead.surface ? `${lead.surface}m²` : 'Surface non spécifiée';
    const rooms = lead.room_count ? `${lead.room_count} pièces` : '';
    
    // Create features list
    const features = [];
    if (lead.terrace) features.push('terrasse');
    if (lead.balcony) features.push('balcon');
    if (lead.cellar) features.push('cave');
    if (lead.parking) features.push('parking');
    if (lead.swimming_pool) features.push('piscine');
    
    // Generate the summary
    let summary = `${propertyType} à ${lead.city || 'vendre'}, ${surface}${rooms ? ', ' + rooms : ''}. `;
    summary += `Située ${location}. `;
    summary += `Prix: ${price}. `;
    
    if (features.length > 0) {
      summary += `Caractéristiques: ${features.join(', ')}. `;
    }
    
    if (lead.description) {
      // Add a shortened version of the description if available
      const shortDescription = lead.description.length > 150 
        ? lead.description.substring(0, 150) + '...' 
        : lead.description;
      summary += `Description: ${shortDescription}`;
    }
    
    return summary;
  }

  /**
   * Import leads from Excel file
   * @param filePath Path to the Excel file
   * @param agentId ID of the agent to assign leads to
   * @returns Array of created leads
   */
  async importFromExcel(filePath: string, agentId: number): Promise<Lead[]> {
    try {
      console.log(`Starting import from Excel file: ${filePath} for agent ID: ${agentId}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Read the Excel file with more robust error handling
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
      
      // Convert to JSON with more robust error handling
      console.log('Converting to JSON...');
      let data;
      try {
        // Try different approaches to read the Excel file
        console.log('Trying sheet_to_json with default options...');
        data = XLSX.utils.sheet_to_json(worksheet, { 
          defval: null,
          raw: true
        });
        
        if (!data || data.length === 0) {
          console.log('No data found with default options, trying with header:1...');
          data = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null,
            raw: true,
            header: 1
          });
          
          if (data && data.length > 1) {
            // Convert array format to object format
            const headers = data[0];
            console.log('Headers found:', headers);
            data = data.slice(1).map(row => {
              const obj = {};
              headers.forEach((header, i) => {
                if (header) {
                  obj[header] = row[i] === undefined ? null : row[i];
                }
              });
              return obj;
            });
          }
        }
      } catch (jsonError) {
        console.error('Error converting Excel to JSON:', jsonError);
        throw new Error(`Failed to convert Excel to JSON: ${jsonError.message}`);
      }
      
      console.log(`Found ${data ? data.length : 0} rows in Excel file`);
      
      if (!data || data.length === 0) {
        throw new Error('Excel file has no data rows');
      }
      
      // Log all rows to see the structure
      console.log('All rows:');
      data.forEach((row, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
      });
      
      // Define problematic columns that need special handling
      const complexColumns = ['IMAGES', 'IRIS_IDS', 'ADS'];
      
      // Map Excel data to lead objects with more robust error handling
      console.log('Mapping Excel data to lead objects...');
      const leads = [];
      
      // Define essential columns to keep
      const essentialColumns = [
        'source', 'type', 'surface', 'price', 'phone_number', 
        'description', 'city', 'zip_code', 'street', 'street_number'
      ];
      
      for (let index = 0; index < data.length; index++) {
        try {
          const row = data[index];
          
          // Skip empty rows
          if (!row || Object.keys(row).length === 0) {
            console.log(`Skipping empty row at index ${index}`);
            continue;
          }
          
          // Create a simplified lead object with only essential columns
          const simplifiedLead: Record<string, any> = {
            agent_id: agentId,
            statut: 'new', // Default status for new leads
            phone_number: null // Initialize phone_number
          };
          
          // Process only essential columns
          for (const key of Object.keys(row)) {
            if (key) {
              // Convert key to lowercase
              const normalizedKey = key.toLowerCase().replace(/ +/g, '_');
              
              // Check if this is an essential column
              const matchingEssentialColumn = essentialColumns.find(col => 
                normalizedKey === col || 
                normalizedKey.includes(col) || 
                col.includes(normalizedKey)
              );
              
              if (matchingEssentialColumn) {
                // For essential columns, convert to appropriate type
                if (row[key] === null || row[key] === undefined) {
                  simplifiedLead[matchingEssentialColumn] = null;
                } else if (matchingEssentialColumn === 'price' || matchingEssentialColumn === 'surface') {
                  // Convert to number if possible
                  const numValue = parseFloat(row[key]);
                  simplifiedLead[matchingEssentialColumn] = isNaN(numValue) ? String(row[key]) : numValue;
                } else {
                  // Convert to string for other columns
                  simplifiedLead[matchingEssentialColumn] = String(row[key]);
                }
              }
            }
          }
          
          // Add phone_number if it exists in the row
          if (row.phone_number) {
            simplifiedLead.phone_number = String(row.phone_number);
          } else if (row.PHONE_NUMBER) {
            simplifiedLead.phone_number = String(row.PHONE_NUMBER);
          }
          
          leads.push(simplifiedLead);
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
      
      // Create leads in database with more robust error handling
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
          if (dbError.stack) {
            console.error('Stack trace:', dbError.stack);
          }
          // Continue with other leads
        }
      }
      
      // Clean up the temporary file
      try {
        console.log('Cleaning up temporary file...');
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temporary file:', unlinkError);
        // Don't throw an error here, just log it
      }
      
      console.log(`Successfully imported ${createdLeads.length} leads out of ${leads.length}`);
      return createdLeads;
    } catch (error) {
      console.error('Error importing leads from Excel:', error);
      // Log more details about the error
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      if (error.code) {
        console.error('Error code:', error.code);
      }
      
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
