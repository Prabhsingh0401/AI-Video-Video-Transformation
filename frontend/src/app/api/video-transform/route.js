import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const transformationsCollection = db.collection('videotransformations');
    
    // Fetch video transformations for the user
    const transformations = await transformationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    // Return the transformations
    return NextResponse.json({ transformations });
  } catch (error) {
    console.error('Error fetching video history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video history' },
      { status: 500 }
    );
  }
}

// Handle POST requests - store new transformations
export async function POST(request) {
  try {
    // Get the user ID from Clerk
    const { userId } = auth();
    
    // If user is not authenticated, return error
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const { 
      originalVideoUrl,
      processedVideoUrl,
      prompt,
      metadata
    } = await request.json();
    
    // Validate required fields
    if (!processedVideoUrl) {
      return NextResponse.json(
        { error: 'Processed video URL is required' },
        { status: 400 }
      );
    }
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const transformationsCollection = db.collection('videotransformations');
    
    // Create a new transformation document
    const transformation = {
      userId,
      originalVideoUrl,
      processedVideoUrl,
      prompt: prompt || '',
      metadata: metadata || {},
      createdAt: new Date()
    };
    
    // Insert the document into MongoDB
    const result = await transformationsCollection.insertOne(transformation);
    
    // Return success response
    return NextResponse.json({
      success: true,
      transformationId: result.insertedId,
      message: 'Video transformation saved successfully'
    });
  } catch (error) {
    console.error('Error storing video transformation:', error);
    return NextResponse.json(
      { error: 'Failed to store video transformation' },
      { status: 500 }
    );
  }
}