import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { fal } from '@fal-ai/client';
import mongoose from 'mongoose';
import filesize from 'filesize';
import pkg from 'get-video-duration';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const { getVideoDuration } = pkg;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define the VideoTransformation schema
const VideoTransformationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  originalVideoUrl: {
    type: String,
    required: true
  },
  processedVideoUrl: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  metadata: {
    size: String,
    duration: String,
    format: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const VideoTransformation = mongoose.models.VideoTransformation || 
mongoose.model('VideoTransformation', VideoTransformationSchema);

// Improved CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Configure Fal AI with error handling
try {
  fal.config({
    credentials: process.env.FAL_AI_KEY,
  });
  console.log('Fal AI configured successfully');
} catch (error) {
  console.error('Error configuring Fal AI:', error);
}

// Configure Cloudinary with error handling
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Error configuring Cloudinary:', error);
}

// Default route
app.get("/", (req, res) => {
  res.send("Video Transformation API is running...");
});

// Health check route
app.get("/health", (req, res) => {
  const health = {
    uptime: process.uptime(),
    status: 'OK',
    timestamp: Date.now()
  };
  res.status(200).json(health);
});

// Debug endpoint to check the status of a processing request
app.get('/debug/request-result/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }
    
    try {
      // Try to get the result
      const result = await fal.queue.result("fal-ai/hunyuan-video/video-to-video", {
        requestId: requestId
      });
      
      const videoUrl = findVideoUrlInObject(result);
      
      // If we found a video URL, try to store it in Cloudinary
      let cloudinaryResult = null;
      if (videoUrl) {
        try {
          cloudinaryResult = await uploadToCloudinary(videoUrl, 'processed_videos');
        } catch (cloudinaryError) {
          console.error('Error storing processed video to Cloudinary:', cloudinaryError);
        }
      }
      
      res.json({ 
        status: 'complete',
        result,
        foundVideoUrl: videoUrl,
        cloudinaryUrl: cloudinaryResult ? cloudinaryResult.secure_url : null,
        resultStructure: Object.keys(result),
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : null
      });
    } catch (apiError) {
      // Check if this is a "still in progress" error
      if (apiError.status === 400 && 
          apiError.body && 
          apiError.body.detail === 'Request is still in progress') {
        
        console.log(`Request ${requestId} is still in progress, returning status info`);
        
        // Return a 202 Accepted status with the URLs from the error body
        return res.status(202).json({
          status: 'in_progress',
          message: 'Request is still in progress',
          requestId: requestId,
          statusUrl: apiError.body.status_url,
          responseUrl: apiError.body.response_url,
          cancelUrl: apiError.body.cancel_url
        });
      }
      
      // If it's not a "still in progress" error, rethrow
      throw apiError;
    }
  } catch (error) {
    console.error('Error in debug request-result endpoint:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      details: error.body ? error.body : null
    });
  }
});

// Upload endpoint with improved error handling
app.post('/upload', async (req, res) => {
  const { fileUrl, prompt } = req.body;

  if (!fileUrl || !prompt) {
    return res.status(400).json({ error: 'fileUrl and prompt are required.' });
  }

  try {
    // Check if fileUrl is a string before passing to Cloudinary
    if (typeof fileUrl !== 'string') {
      return res.status(400).json({ error: 'fileUrl must be a string.' });
    }

    console.log(`Uploading file to Cloudinary: ${fileUrl.substring(0, 50)}...`);
    
    const result = await cloudinary.uploader.upload(fileUrl, {
      resource_type: 'auto',
      folder: 'uploadcare_uploads',
      timeout: 120000, // Extend timeout for large videos
    });

    console.log('Successfully uploaded to Cloudinary:', result.public_id);

    res.status(200).json({
      success: true,
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
      prompt,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Cloudinary upload failed: ' + err.message });
  }
});

// Helper function to upload a video URL to Cloudinary
async function uploadToCloudinary(videoUrl, folder = 'processed_videos') {
  try {
    const result = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      folder: folder,
      tags: ['fal_ai_processed'],
      timeout: 180000, // 3 minutes timeout for large videos
    });
    
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

// Store processed video to Cloudinary
app.post('/store-processed-video', async (req, res) => {
  const { videoUrl, prompt, userId } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required.' });
  }

  try {
    console.log(`Storing processed video to Cloudinary: ${videoUrl.substring(0, 50)}...`);
    const result = await uploadToCloudinary(videoUrl, 'processed_videos');
    
    // Gather metadata
    let metadata = {
      size: filesize(result.bytes),
      format: result.format,
      duration: 'Unknown'
    };
    
    try {
      // Attempt to get the video duration
      const duration = await getVideoDuration(result.secure_url);
      metadata.duration = `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;
    } catch (durationError) {
      console.error('Error getting video duration:', durationError);
    }
    
    // If userId is provided, save the transformation to the database
    if (userId) {
      try {
        const videoTransformation = new VideoTransformation({
          userId,
          originalVideoUrl: videoUrl,
          processedVideoUrl: result.secure_url,
          prompt: prompt || '',
          metadata
        });
        
        await videoTransformation.save();
        console.log('Video transformation saved to MongoDB');
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Continue with the response even if DB save fails
      }
    }
    
    res.status(200).json({
      success: true,
      originalUrl: videoUrl,
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
      prompt: prompt || '',
      metadata
    });
  } catch (err) {
    console.error('Error storing processed video:', err);
    res.status(500).json({ error: 'Failed to store processed video: ' + err.message });
  }
});

// Process video endpoint
app.post('/process-video', async (req, res) => {
  const { videoUrl, prompt, userId } = req.body;

  if (!videoUrl || !prompt) {
    return res.status(400).json({ error: 'videoUrl and prompt are required.' });
  }

  try {
    // Check if videoUrl is a string before processing
    if (typeof videoUrl !== 'string') {
      return res.status(400).json({ error: 'videoUrl must be a string.' });
    }

    console.log('Submitting job to Fal AI queue:', { 
      videoUrl: videoUrl.substring(0, 50) + '...', 
      prompt 
    });
    
    // Submit the job to the queue
    const { request_id } = await fal.queue.submit("fal-ai/hunyuan-video/video-to-video", {
      input: {
        video_url: videoUrl,
        prompt,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        strength: 0.8,
      },
    });
    
    console.log('Job submitted successfully, request_id:', request_id);
    
    try {
      // Poll for the result with timeout
      const result = await Promise.race([
        fal.queue.result("fal-ai/hunyuan-video/video-to-video", {
          requestId: request_id
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Processing timeout - request in progress")), 30000)
        )
      ]);

      console.log('Complete result from Fal AI:', JSON.stringify(result, null, 2));
      
      let processedVideoUrl = findVideoUrlInObject(result);
      
      if (!processedVideoUrl) {
        // If we don't have a video URL yet, return the request ID for later checking
        return res.status(202).json({
          message: "Processing started but not yet complete",
          requestId: request_id,
          originalUrl: videoUrl,
        });
      }

      // Store the processed video to Cloudinary
      let cloudinaryResult = null;
      let metadata = null;
      try {
        cloudinaryResult = await uploadToCloudinary(processedVideoUrl);
        console.log('Processed video stored to Cloudinary:', cloudinaryResult.secure_url);
        
        // Let's gather some metadata about the video
        metadata = {
          size: filesize(cloudinaryResult.bytes),
          format: cloudinaryResult.format,
          duration: 'Unknown'
        };
        
        try {
          // Attempt to get the video duration
          const duration = await getVideoDuration(cloudinaryResult.secure_url);
          metadata.duration = `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;
        } catch (durationError) {
          console.error('Error getting video duration:', durationError);
        }
        
        // If userId is provided, save the transformation to the database
        if (userId) {
          const videoTransformation = new VideoTransformation({
            userId,
            originalVideoUrl: videoUrl,
            processedVideoUrl: cloudinaryResult.secure_url,
            prompt,
            metadata
          });
          
          await videoTransformation.save();
          console.log('Video transformation saved to MongoDB');
        }
        
      } catch (cloudinaryError) {
        console.error('Error storing processed video to Cloudinary:', cloudinaryError);
      }

      res.status(200).json({
        success: true,
        originalUrl: videoUrl,
        processedUrl: processedVideoUrl,
        cloudinaryUrl: cloudinaryResult ? cloudinaryResult.secure_url : null,
        requestId: request_id,
        prompt,
        metadata: metadata
      });
      
    } catch (timeoutError) {
      // If we hit the timeout, return the request ID for later checking
      console.log('Processing timeout, returning request_id for later polling:', request_id);
      res.status(202).json({
        message: "Processing started but not yet complete",
        requestId: request_id,
        originalUrl: videoUrl,
      });
    }
  } catch (err) {
    console.error('Fal AI processing error:', err);
    res.status(500).json({ error: 'Video processing failed: ' + err.message });
  }
});

// Direct video transformation storage endpoint that mirrors the Next.js API route
app.post('/store-video', async (req, res) => {
  const { originalVideoUrl, processedVideoUrl, prompt, metadata, userId } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - userId is required' });
  }
  
  if (!processedVideoUrl) {
    return res.status(400).json({ error: 'Processed video URL is required' });
  }
  
  try {
    // Create a new transformation document
    const videoTransformation = new VideoTransformation({
      userId,
      originalVideoUrl: originalVideoUrl || '',
      processedVideoUrl,
      prompt: prompt || '',
      metadata: metadata || {},
      createdAt: new Date()
    });
    
    // Save to MongoDB
    const result = await videoTransformation.save();
    
    res.status(200).json({
      success: true,
      transformationId: result._id,
      message: 'Video transformation saved successfully'
    });
  } catch (error) {
    console.error('Error storing video transformation:', error);
    res.status(500).json({ error: 'Failed to store video transformation' });
  }
});

// Endpoint to fetch video transformations by user ID
app.get('/video-transformations/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    const transformations = await VideoTransformation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20); // Limit to most recent 20 transformations
    
    res.status(200).json({ transformations });
  } catch (error) {
    console.error('Error fetching video transformations:', error);
    res.status(500).json({ error: 'Failed to fetch video transformations' });
  }
});

// Video history endpoint that matches the Next.js API route
app.get('/video-history/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - userId is required' });
  }
  
  try {
    // Fetch video transformations for the user
    const transformations = await VideoTransformation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.status(200).json({ transformations });
  } catch (error) {
    console.error('Error fetching video history:', error);
    res.status(500).json({ error: 'Failed to fetch video history' });
  }
});

// Helper function to recursively find a video URL in a response object
function findVideoUrlInObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  
  if (obj.video_url && typeof obj.video_url === 'string') {
    return obj.video_url;
  }
  
  if (obj.videoUrl && typeof obj.videoUrl === 'string') {
    return obj.videoUrl;
  }
  
  if (obj.url && typeof obj.url === 'string' && (
    obj.url.endsWith('.mp4') || 
    obj.url.includes('video') || 
    obj.url.includes('.mov') || 
    obj.url.includes('.webm')
  )) {
    return obj.url;
  }
  
  // Search in data object if it exists
  if (obj.data && typeof obj.data === 'object') {
    // Special check for common response structures
    if (obj.data.output && typeof obj.data.output === 'object') {
      if (obj.data.output.video_url) return obj.data.output.video_url;
      if (obj.data.output.url) return obj.data.output.url;
    }
  }
  
  for (const key in obj) {
    const result = findVideoUrlInObject(obj[key]);
    if (result) {
      return result;
    }
  }

  return null;
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));