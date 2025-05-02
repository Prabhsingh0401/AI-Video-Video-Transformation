"use client";
import React from "react";

export default function VideoPreview({ videoUrl, metadata }) {
  // Function to extract the filename from cloudinary
  const extractFilename = (url) => {
    if (!url) return "transformed-video.mp4";
    
    // Extracts file from cloudinary to previw in frontend
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('?')[0] || "cloudinary-video.mp4";
    }
    
    return "transformed-video.mp4";
  };

  return (
    <div className="bg-white rounded-xl shadow-md h-86 overflow-hidden">
      {!videoUrl ? (
        <>
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-xl font-bold mb-2">Ready to Create Your Video</h2>
            <p className="text-gray-600">
              Enter details of the video you want to create
            </p>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold p-4 bg-gray-50 border-b">
            Your AI Transformed Video
          </h2>
          <div className="aspect-video bg-black">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-full object-contain"
              autoPlay={false}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          {metadata && (
            <div className="p-4 bg-gray-50 border-t grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium block text-gray-600">Size</span>
                <span>{metadata.size || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium block text-gray-600">Duration</span>
                <span>{metadata.duration || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium block text-gray-600">Format</span>
                <span>{metadata.format || 'Unknown'}</span>
              </div>
            </div>
          )}
          
          <div className="p-4 flex space-x-4">
            <a
              href={videoUrl}
              download={extractFilename(videoUrl)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm font-medium"
            >
              Download
            </a>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition text-sm font-medium"
            >
              Open in New Tab
            </a>
          </div>
          
          {videoUrl.includes('cloudinary.com') && (
            <div className="px-4 pb-4 text-xs text-green-600">
              Video is stored in Cloudinary for better stability and performance
            </div>
          )}
        </>
      )}
    </div>
  );
}