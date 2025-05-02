"use client";
import React, { useState } from 'react';
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import VideoUploadForm from '@/components/VideoUploadForm';
import VideoPreview from '@/components/VideoPreview';
import VideoHistory from '@/components/VideoHistory';

export default function AIVideoTransformation() {
  const { isSignedIn } = useAuth();
  const [processedVideoUrl, setProcessedVideoUrl] = useState("");
  const [videoMetadata, setVideoMetadata] = useState(null);

  const handleProcessingComplete = (videoUrl, metadata = null) => {
    setProcessedVideoUrl(videoUrl);
    if (metadata) {
      setVideoMetadata(metadata);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-7xl text-left font-bold text-black">AI Video Transformation</h1>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition">
                Sign In
              </button>
            </SignInButton>
          ) : (
            <UserButton afterSignOutUrl="/" />
          )}
        </div>

        <p className="text-gray-600 text-2xl max-w-2xl mb-12">
          Add transformation to your video using AI
        </p>

        {/* Main Content Section */}
        <div className="flex flex-col px-50 md:flex-row gap-8 items-start">
          <VideoUploadForm onProcessingComplete={handleProcessingComplete} />
          <div className="w-[60vw] lg:w-[40vw]">
            <VideoPreview videoUrl={processedVideoUrl} metadata={videoMetadata} />
          </div>
        </div>

        <VideoHistory />
      </div>
    </div>
  );
}
