import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 6000

//middleware
app.use(cors());
app.use(express.json());




// Create a MongoClient and connect it to mongodb
const client = new MongoClient(process.env.MONGO_CLIENT_URI);
export async function connectToMongodb() {
  try {
    await client.connect();
    console.log("Successfully connected to mongodb");
    return client;
  } catch (err) {
    console.log(err);
  }
}
const connectedClient = await connectToMongodb();


//creating database and collections in mongodb
const db = connectedClient.db('hireloopdb');
const users = db.collection('user');
const jobs = db.collection('jobs')


//jwk


//users
app.get('/users', async (req, res) => {
  const querry = await users.find({}).toArray();
  res.send(querry)
})


//add new data to jobs collection
app.post('/jobs', async (req, res) => {
  const newJob = req.body;
  const result = await jobs.insertOne(newJob);
  res.send(result)
})

//display all or query filtered data from jobs collection
app.get('/jobs', async (req, res) => {
  const query={};
  console.log("query", req.query);
  if(req.query){
    //this will match only specific filter
    if(req.query.jobType){
      query.jobType = req.query.jobType
    }
    if(req.query.isRemote){
      query.isRemote=req.query.isRemote===true;
    }
    if(req.query.category){
      query.category= req.query.category;
    }
    //this will match title, responsibilities, requirements with the searched text
    if(req.query.search){
      query.$or=[
        //regex is reqular expression search, i is to ignore case sensitivity
        {title:{$regex:req.query.search, $options: 'i'}},
        {responsibilities: {$regex:req.query.search, $options: 'i'}},
        {requirements: {$regex:req.query.search, $options: 'i'}}
      ];
    }
  }
  const cursor = jobs.find(query);
  const result = await cursor.toArray();
  res.send(result)
})


//show dynamic job from jobs collection
app.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobs.findOne(query);
  res.send(result)
})


//delete data from jobs collection
app.delete('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const querry = { _id: new ObjectId(id) };
  const result = await jobs.deleteOne(querry);
  res.send(result)
})



//homepage of backend
app.get('/', (req, res) => {
  res.send("Welcome to the backend of Hireloop")
})

app.listen(PORT, () => {
  console.log(`app is listening on Port ${PORT}`);
})