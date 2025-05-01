"use client";
import React, { useState, useEffect } from "react";
import { Widget } from "@uploadcare/react-widget";
import { useAuth } from "@clerk/nextjs";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function VideoUploadForm({ onProcessingComplete }) {
  const { userId } = useAuth();
  const [videoURL, setVideoURL] = useState("");
  const [uploadedFileURL, setUploadedFileURL] = useState("");
  const [transformationPrompt, setTransformationPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [processedUrl, setProcessedUrl] = useState("");
  const [cloudinaryProcessedUrl, setCloudinaryProcessedUrl] = useState("");
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [progressDots, setProgressDots] = useState(".");

  // Effect for animated loading dots
  useEffect(() => {
    if (isPolling) {
      const interval = setInterval(() => {
        setProgressDots(dots => dots.length >= 3 ? "." : dots + ".");
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isPolling]);

  // Auto-polling effect
  useEffect(() => {
    let pollingInterval;
    
    const fetchProcessingResult = async () => {
      if (!requestId) return;
      
      try {
        const resultResponse = await fetch(`${BACKEND_URL}/debug/request-result/${requestId}`);
        const resultData = await resultResponse.json();
        
        if (resultResponse.ok && resultData.cloudinaryUrl) {
          setCloudinaryProcessedUrl(resultData.cloudinaryUrl);
          setProcessedUrl(resultData.foundVideoUrl);
          setProcessingStage("complete");
          setIsPolling(false);
          
          // Store video transformation to MongoDB via our API
          await storeVideoTransformation(cloudinaryUrl, resultData.cloudinaryUrl, resultData.metadata);
          
          if (onProcessingComplete) {
            onProcessingComplete(resultData.cloudinaryUrl, resultData.metadata);
          }
          
          // Stop polling once we get results
          clearInterval(pollingInterval);
        } else {
          console.log("Still processing, waiting for results:", resultData);
          setRetryCount(prev => prev + 1);
        }
      } catch (err) {
        console.error("Error checking result:", err);
        setError("Error checking processing status: " + (err.message || "Unknown error"));
        setIsPolling(false);
        clearInterval(pollingInterval);
      }
    };

    // Start polling if we have a requestId and we're in processing stage
    if (requestId && processingStage === "processing") {
      setIsPolling(true);
      // Initial check
      fetchProcessingResult();
      
      // Then check every 5 seconds
      pollingInterval = setInterval(fetchProcessingResult, 5000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [requestId, processingStage, onProcessingComplete, cloudinaryUrl]);

  // Function to store video transformation to MongoDB via our API
  const storeVideoTransformation = async (originalVideoUrl, processedVideoUrl, metadata) => {
    if (!userId || !processedVideoUrl) return;
    
    try {
      const response = await fetch('${BACKEND_URL}/store-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalVideoUrl,
          processedVideoUrl,
          prompt: transformationPrompt,
          metadata
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to store video transformation:', errorData);
      } else {
        console.log('Video transformation stored successfully');
      }
    } catch (err) {
      console.error('Error storing video transformation:', err);
    }
  };

  const storeProcessedVideoToCloudinary = async (videoUrl) => {
    if (!videoUrl) return;
    
    try {
      setProcessingStage("storing");
      const storeResponse = await fetch(`${BACKEND_URL}/store-processed-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          prompt: transformationPrompt,
          userId // Include the userId here
        }),
      });
      
      const storeData = await storeResponse.json();
      
      if (storeResponse.ok && storeData.cloudinaryUrl) {
        console.log("Processed video stored to Cloudinary:", storeData);
        setCloudinaryProcessedUrl(storeData.cloudinaryUrl);
        
        // Store video transformation to MongoDB via our API
        await storeVideoTransformation(cloudinaryUrl, storeData.cloudinaryUrl, storeData.metadata);
        
        // Update the video displayed to the user
        if (onProcessingComplete) {
          onProcessingComplete(storeData.cloudinaryUrl, storeData.metadata);
        }
      } else {
        console.error("Failed to store processed video to Cloudinary:", storeData.error);
      }
    } catch (err) {
      console.error("Error storing processed video to Cloudinary:", err);
    } finally {
      setProcessingStage("complete");
    }
  };

  const handleUploadComplete = (fileInfo) => {
    console.log("Upload complete:", fileInfo);
    setUploadedFileURL(fileInfo.cdnUrl);
    setVideoURL("");
    setCloudinaryUrl("");
    setProcessedUrl("");
    setCloudinaryProcessedUrl("");
    setError("");
  };

  const handleURLChange = (e) => {
    setVideoURL(e.target.value);
    setUploadedFileURL("");
    setCloudinaryUrl("");
    setProcessedUrl("");
    setCloudinaryProcessedUrl("");
    setError("");
  };

  const handlePromptChange = (e) => {
    setTransformationPrompt(e.target.value);
  };

  const handleSubmit = async () => {
    const finalURL = uploadedFileURL || videoURL.trim();
    if (!finalURL) {
      setError("Please upload a video or provide a video link.");
      return;
    }
    if (!transformationPrompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError("");
    setProcessingStage("uploading");
    setIsPolling(false);
    
    try {
      // First, upload to Cloudinary through our backend
      console.log("Uploading to Cloudinary via backend:", finalURL);
      const uploadRes = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: finalURL,
          prompt: transformationPrompt,
        }),
        // Add timeout and credentials settings
        credentials: 'include',
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => ({ error: "Failed to parse response" }));
        throw new Error(uploadData.error || `Upload failed with status: ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      console.log("Upload successful, Cloudinary URL:", uploadData.cloudinaryUrl);
      setCloudinaryUrl(uploadData.cloudinaryUrl);
      
      // Then, process with Fal AI through our backend
      setProcessingStage("processing");
      console.log("Processing with Fal AI:", uploadData.cloudinaryUrl);
      const processRes = await fetch(`${BACKEND_URL}/process-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: uploadData.cloudinaryUrl,
          prompt: transformationPrompt,
          userId // Include the userId here
        }),
        // Add timeout and credentials settings
        credentials: 'include',
      });

      if (!processRes.ok) {
        const processData = await processRes.json().catch(() => ({ error: "Failed to parse response" }));
        throw new Error(processData.error || `Processing failed with status: ${processRes.status}`);
      }

      const processData = await processRes.json();
      console.log("Processing response:", processData);

      if (processData.requestId) {
        setRequestId(processData.requestId);
        // Auto-polling will start from here via the useEffect
      }
      
      if (processData.cloudinaryUrl) {
        // Immediate response with processed video
        setCloudinaryProcessedUrl(processData.cloudinaryUrl);
        setProcessedUrl(processData.processedUrl || processData.cloudinaryUrl);
        setProcessingStage("complete");
        setIsPolling(false);
        
        // Store video transformation to MongoDB via our API
        await storeVideoTransformation(
          uploadData.cloudinaryUrl, 
          processData.cloudinaryUrl, 
          processData.metadata
        );
        
        if (onProcessingComplete) {
          onProcessingComplete(processData.cloudinaryUrl, processData.metadata);
        }
      } 
      // If just the processed URL is available
      else if (processData.processedUrl) {
        setProcessedUrl(processData.processedUrl);
        setProcessingStage("storing");
        setIsPolling(false);
        
        // Store the processed video to Cloudinary
        await storeProcessedVideoToCloudinary(processData.processedUrl);
      } else {
        // If we don't have a processedUrl but have a requestId, we'll poll for results
        console.log("No immediate result. Will poll for completion using requestId:", processData.requestId);
        // The useEffect will handle the polling
      }

    } catch (err) {
      console.error("Error during upload/processing:", err);
      setError(err.message || "An error occurred. Check the console for details.");
      setProcessingStage("");
      setIsPolling(false);
    } finally {
      setLoading(false);
    }
  };

  // Manual retry function - kept as backup
  const handleManualRetry = async () => {
    if (!requestId) return;
    
    setLoading(true);
    setError("");
    
    try {
      const resultResponse = await fetch(`${BACKEND_URL}/debug/request-result/${requestId}`);
      const resultData = await resultResponse.json();
      
      if (resultResponse.ok && resultData.cloudinaryUrl) {
        setCloudinaryProcessedUrl(resultData.cloudinaryUrl);
        setProcessedUrl(resultData.foundVideoUrl);
        setProcessingStage("complete");
        setIsPolling(false);
        
        // Store video transformation to MongoDB via our API
        await storeVideoTransformation(cloudinaryUrl, resultData.cloudinaryUrl, resultData.metadata);
        
        if (onProcessingComplete) {
          onProcessingComplete(resultData.cloudinaryUrl, resultData.metadata);
        }
      } else {
        console.log("Manual retry attempt didn't return results yet:", resultData);
        setError("Still processing. Auto-checking will continue.");
      }
    } catch (err) {
      console.error("Error checking result:", err);
      setError("Failed to check processing result: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 w-full md:w-[50vw] lg:w-[40vw]">
      <h2 className="text-lg font-semibold mb-4">
        Upload or provide a link to video
      </h2>

      <div className="mb-4 text-center">
        <Widget
          publicKey="a8cad9fd1b5581265c82"
          onChange={handleUploadComplete}
          tabs="file url"
          previewStep
          clearable
          inputAcceptTypes="video/*"
        />
      </div>

      {uploadedFileURL && (
        <div className="mb-4 text-sm text-green-600">
          ✅ Video uploaded to Uploadcare
        </div>
      )}

      <label className="text-sm text-gray-600 mb-2 block">
        Describe how you want your video to be transformed
      </label>
      <textarea
        placeholder="E.g., convert to black and white, make it look like a cartoon, etc."
        value={transformationPrompt}
        onChange={handlePromptChange}
        rows={4}
        className="w-full border rounded px-3 py-2 text-sm focus:outline-none resize-none mb-6"
      />

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading || isPolling}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? (
          processingStage === "uploading" 
            ? "Uploading to Cloudinary..." 
            : processingStage === "storing"
              ? "Storing processed video..."
              : "Processing with AI..."
        ) : isPolling ? `Waiting for results${progressDots}` : "Transform Video"}
      </button>

      {processedUrl && (
        <div className="mt-4 text-sm text-green-600 break-words">
          ✅ Video processing complete!
          {cloudinaryProcessedUrl && (
            <div className="text-xs mt-1">
              Video stored in Cloudinary for better stability and performance
            </div>
          )}
        </div>
      )} 
    </div>
  );
}