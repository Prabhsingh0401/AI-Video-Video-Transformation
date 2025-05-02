"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://ai-video-video-transformation.onrender.com";

export default function VideoHistory() {
  const { userId, isSignedIn } = useAuth();
  const [transformations, setTransformations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    // Only fetch the videos from mongoDB if the user is signed in
    if (isSignedIn && userId) {
      fetchVideoHistory();
    }
  }, [isSignedIn, userId]);

  const fetchVideoHistory = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/transformations/${userId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch video history");
      }
      
      const data = await response.json();
      setTransformations(data.transformations || []);
    } catch (err) {
      console.error("Error fetching video history:", err);
      setError("Failed to load your video transformation history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Unknown date";
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(selectedVideo?._id === video._id ? null : video);
  };

  if (!isSignedIn) {
    return (
      <div className="mt-12 p-6 text-center bg-gray-50 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-2">Sign in to view your transformation history</h2>
        <p className="text-gray-600">Sign in to save and view your video transformation history.</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-12 px-4">
      <h2 className="text-2xl font-bold mb-6">Your Transformation History</h2>
      
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading your video history...</p>
        </div>
        // Some edge case and error handling if the user is new then gives this message
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">{error}</div>
      ) : transformations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <p className="text-gray-600">You haven't transformed any videos yet.</p>
          <p className="text-gray-500 text-sm mt-2">Videos you transform will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transformations.map((video) => (
            <div 
              key={video._id} 
              className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                selectedVideo?._id === video._id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleVideoClick(video)}
            >
              <div className="aspect-video bg-gray-100 relative">
                <video 
                  src={video.processedVideoUrl} 
                  className="w-full h-full object-cover"
                  controls={selectedVideo?._id === video._id}
                  preload="metadata"
                  poster={`${video.processedVideoUrl.split('.').slice(0, -1).join('.')}.jpg`}
                >
                  Your browser does not support the video tag.
                </video>
                {selectedVideo?._id !== video._id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium line-clamp-1" title={video.prompt}>
                    {video.prompt}
                  </h3>
                  <span className="text-xs text-gray-500">{formatDate(video.createdAt)}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="block font-medium">Size</span>
                    <span>{video.metadata?.size || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="block font-medium">Duration</span>
                    <span>{video.metadata?.duration || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="block font-medium">Format</span>
                    <span>{video.metadata?.format || 'Unknown'}</span>
                  </div>
                </div>
                
                {selectedVideo?._id === video._id && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">Prompt used:</span>
                      <p className="text-sm text-gray-700">{video.prompt}</p>
                    </div>
                    <div className="flex space-x-2">
                      <a 
                        href={video.processedVideoUrl} 
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download
                      </a>
                      <a 
                        href={video.processedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Full View
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {transformations.length > 0 && (
        <button 
          onClick={fetchVideoHistory}
          className="mt-6 text-blue-600 hover:text-blue-800 text-sm flex items-center mx-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh History
        </button>
      )}
    </div>
  );
}