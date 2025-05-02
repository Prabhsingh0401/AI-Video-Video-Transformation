import { MongoClient } from 'mongodb';

// Use the connection string from environment variable or fallback to the hardcoded string
const uri = process.env.MONGODB_URI || "mongodb+srv://prableensingh0401:MRL5gJGrljBkDObi@videotransformation.xco6ptv.mongodb.net/?retryWrites=true&w=majority&appName=VideoTransformation";

const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;