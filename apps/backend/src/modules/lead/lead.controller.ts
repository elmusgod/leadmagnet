import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Get,
  Put,
  Delete,
  Body,
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

  @Get()
  async findAll(): Promise<Lead[]> {
    console.log('Finding all leads');
    return this.leadService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Lead> {
    console.log(`Finding lead with ID: ${id}`);
    return this.leadService.findOne(id);
  }

  @Get(':id/summary')
  async generateSummary(@Param('id', ParseIntPipe) id: number): Promise<{ summary: string }> {
    console.log(`Generating summary for lead with ID: ${id}`);
    const summary = await this.leadService.generateSummary(id);
    return { summary };
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string }
  ): Promise<Lead> {
    console.log(`Updating status for lead with ID: ${id} to ${body.status}`);
    return this.leadService.update(id, { status: body.status });
  }

  @Delete(':id')
  async deleteLead(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    console.log(`Deleting lead with ID: ${id}`);
    await this.leadService.remove(id);
    return { success: true };
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
