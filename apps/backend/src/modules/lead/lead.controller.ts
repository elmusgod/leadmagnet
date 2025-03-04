import {
  Controller,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { LeadService } from './lead.service';
import { Lead } from '@/type/database';
import * as fs from 'fs';

@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get('test-create/:agentId')
  async testCreateLead(@Param('agentId', ParseIntPipe) agentId: number): Promise<Lead> {
    console.log(`Testing lead creation for agent ID: ${agentId}`);
    
    // Create a test lead with minimal data
    const testLead = {
      agent_id: agentId,
      source: 'Test API',
      type: 'Test',
      price: '100000',
      phone_number: '1234567890',
      statut: 'new'
    };
    
    console.log('Creating test lead:', testLead);
    
    try {
      const createdLead = await this.leadService.create(testLead);
      console.log('Test lead created successfully:', createdLead);
      return createdLead;
    } catch (error) {
      console.error('Error creating test lead:', error);
      throw error;
    }
  }

  @Post('import-excel/:agentId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Param('agentId', ParseIntPipe) agentId: number,
  ): Promise<{ message: string; count: number; leads: Lead[] }> {
    try {
      console.log(`Received import request for agent ID: ${agentId}`);
      
      if (!file) {
        console.error('No file uploaded');
        throw new Error('No file uploaded');
      }
      
      console.log(`File uploaded: ${file.originalname}, saved as: ${file.filename}, path: ${file.path}`);
      
      // Check file extension
      const fileExt = extname(file.originalname).toLowerCase();
      if (fileExt !== '.xlsx' && fileExt !== '.xls') {
        console.error(`Invalid file extension: ${fileExt}`);
        throw new Error('Only .xlsx and .xls files are supported');
      }
      
      const leads = await this.leadService.importFromExcel(file.path, agentId);
      
      console.log(`Successfully imported ${leads.length} leads`);
      
      return {
        message: 'Leads imported successfully',
        count: leads.length,
        leads,
      };
    } catch (error) {
      console.error('Error in importExcel controller:', error);
      
      // If the file exists but there was an error processing it, clean up
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          console.log(`Cleaned up file: ${file.path}`);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      throw error;
    }
  }
}
