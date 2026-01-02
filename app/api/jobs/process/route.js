import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { processExcelFile, updateJobProgress } from '@/lib/jobProcessor';

// Configure runtime for better performance on Vercel
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing

export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job data from Firestore
    const jobRef = doc(db, 'importJobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();

    // Check if job is already processing or completed
    if (jobData.status === 'processing' || jobData.status === 'importing' || jobData.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Job is already being processed or completed',
        status: jobData.status,
      });
    }

    // Get JSON data and default branch from stored job data
    const jsonData = jobData.jsonData || [];
    const defaultBranch = jobData.defaultBranch || '';

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { error: 'No data found in job. Please re-upload the file.' },
        { status: 400 }
      );
    }

    // Process the job
    await processExcelFile(jobId, jsonData, defaultBranch);

    return NextResponse.json({
      success: true,
      message: 'Job processing completed',
    });

  } catch (error) {
    console.error('Process job error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

