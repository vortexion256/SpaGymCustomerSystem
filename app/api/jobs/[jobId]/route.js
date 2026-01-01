import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request, { params }) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobRef = doc(db, 'importJobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();

    // Convert Firestore timestamps to ISO strings
    const response = {
      jobId: jobData.jobId,
      fileName: jobData.fileName,
      status: jobData.status,
      progress: jobData.progress || 0,
      total: jobData.total || 0,
      processed: jobData.processed || 0,
      success: jobData.success || 0,
      failed: jobData.failed || 0,
      skipped: jobData.skipped || 0,
      skippedDetails: jobData.skippedDetails || [],
      errors: jobData.errors || [],
      message: jobData.message || '',
      error: jobData.error || null,
      createdAt: jobData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: jobData.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get job status error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

