import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createImportJob, processExcelFile } from '@/lib/jobProcessor';

export async function POST(request) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file');
    const defaultBranch = formData.get('defaultBranch') || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload .xlsx or .xls file' },
        { status: 400 }
      );
    }

    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read Excel file
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read Excel file. Please ensure it is a valid Excel file.' },
        { status: 400 }
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { error: 'Excel file has no sheets' },
        { status: 400 }
      );
    }

    // Convert first sheet to JSON
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    // Get user ID from request (you can extract from auth token if needed)
    // For now, we'll skip user tracking
    const userId = null;

    // Create import job
    const jobResult = await createImportJob(fileName, userId);
    if (!jobResult.success) {
      return NextResponse.json(
        { error: 'Failed to create import job' },
        { status: 500 }
      );
    }

    const { jobId } = jobResult;

    // Start processing asynchronously (don't await)
    // This allows the API to return immediately while processing continues
    processExcelFile(jobId, jsonData, defaultBranch).catch((error) => {
      console.error('Background processing error:', error);
    });

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      message: 'File uploaded successfully. Processing started in background.',
      totalRows: jsonData.length,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

