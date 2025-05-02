  import express from 'express';
  import clientPromise from '../../lib/mongoDB.js';

  const router = express.Router();

  // Middleware to check if userId is provided (simplified auth)
  const requireUserId = (req, res, next) => {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - userId is required' });
    }
    
    req.userId = userId;
    next();
  };

  // GET: Fetch video transformations
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const client = await clientPromise;
      const db = client.db();
      const collection = db.collection('videotransformations');

      const transformations = await collection.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.status(200).json({ transformations });
    } catch (error) {
      console.error('GET Error:', error);
      res.status(500).json({ error: 'Failed to fetch video history' });
    }
  });

  // POST: Store a new transformation
  router.post('/', requireUserId, async (req, res) => {
    try {
      const { userId } = req;
      const {
        originalVideoUrl,
        processedVideoUrl,
        prompt,
        metadata
      } = req.body;

      if (!processedVideoUrl) {
        return res.status(400).json({ error: 'Processed video URL is required' });
      }

      const client = await clientPromise;
      const db = client.db();
      const collection = db.collection('videotransformations');

      const transformation = {
        userId,
        originalVideoUrl: originalVideoUrl || '',
        processedVideoUrl,
        prompt: prompt || '',
        metadata: metadata || {},
        createdAt: new Date()
      };

      const result = await collection.insertOne(transformation);

      res.status(200).json({
        success: true,
        transformationId: result.insertedId,
        message: 'Video transformation saved successfully'
      });
    } catch (error) {
      console.error('POST Error:', error);
      res.status(500).json({ error: 'Failed to store video transformation' });
    }
  });

  export default router;