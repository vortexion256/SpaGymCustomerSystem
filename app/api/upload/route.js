import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createImportJob, processExcelFile } from '@/lib/jobProcessor';

// Configure runtime for better performance on Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time (60 seconds for Pro, 10 for Hobby)

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

    // Validate file size (Vercel has ~4.5MB limit, but we'll allow up to 10MB with config)
    const fileSize = file.size;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds limit. Maximum size is ${maxSize / (1024 * 1024)}MB. Your file is ${(fileSize / (1024 * 1024)).toFixed(2)}MB.` },
        { status: 400 }
      );
    }

    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read Excel file with optimized options
    let workbook;
    try {
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
      });
    } catch (error) {
      console.error('Excel read error:', error);
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

    // Convert first sheet to JSON (optimized)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Use defval to handle empty cells more efficiently
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    // Get user ID from request (you can extract from auth token if needed)
    // For now, we'll skip user tracking
    const userId = null;

    // Create import job first
    const jobResult = await createImportJob(fileName, userId);
    if (!jobResult.success) {
      console.error('Failed to create import job:', jobResult.error);
      return NextResponse.json(
        { error: 'Failed to create import job: ' + (jobResult.error || 'Unknown error') },
        { status: 500 }
      );
    }

    const { jobId } = jobResult;

    // Store the parsed data in Firestore for reliability
    // This ensures data persists even if the function context ends
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const jobDataRef = doc(db, 'importJobs', jobId);
      
      // Store the JSON data in the job document
      await updateDoc(jobDataRef, {
        jsonData: jsonData,
        defaultBranch: defaultBranch,
        dataStored: true,
      });
    } catch (storageError) {
      console.error('Error storing job data:', storageError);
      // Continue anyway - we'll try to process with in-memory data
    }

    // Start processing asynchronously
    // On Vercel, the function will continue running until timeout or completion
    // We use an IIFE to start the async processing without blocking
    const processPromise = (async () => {
      try {
        // Small delay to ensure response is sent first
        await new Promise(resolve => setTimeout(resolve, 50));
        await processExcelFile(jobId, jsonData, defaultBranch);
      } catch (error) {
        console.error('Background processing error:', error);
        // Update job status to failed
        try {
          const { updateJobProgress } = await import('@/lib/jobProcessor');
          await updateJobProgress(jobId, {
            status: 'failed',
            error: error.message || 'Unknown error during processing',
          });
        } catch (updateError) {
          console.error('Failed to update job status:', updateError);
        }
      }
    })();

    // On Vercel, we need to keep the function alive for processing
    // Wait a bit to ensure processing starts, but don't wait for completion
    // This is a compromise - processing will continue as long as function is alive
    if (process.env.VERCEL) {
      // On Vercel, give processing a chance to start
      await Promise.race([
        processPromise,
        new Promise(resolve => setTimeout(resolve, 2000)), // Wait max 2 seconds
      ]);
    } else {
      // On localhost, just start it without waiting
      processPromise.catch(console.error);
    }

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
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

