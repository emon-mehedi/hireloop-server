import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
const applications = db.collection('applications')
const payments = db.collection('payments')


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
    //this will show self created jobs of a recruiter
    if(req.query.recruiterId){
      query.recruiterId= req.query.recruiterId
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

//get data of specific job seeker from applications collection or data of all applications on one job
app.get('/applications',async(req,res)=>{
  const query= {};
  //find all applications of a job seeker
  if (req.query.applicantId){
    query.userId = req.query.applicantId
  }
  //find all applications on a job of a recruiter
  if(req.query.jobId){
    query.jobId = req.query.jobId
  }
  const cursor = applications.find(query);
  const result = await cursor.toArray();
  res.send(result)
})


//get total count of applications of a specific job seeker from applications collection
app.get('/applications/count',async(req,res)=>{
  const query= {};
  if (req.query.applicantId){
    query.userId = req.query.applicantId
  }
  const result = await applications.countDocuments(query);
  res.send({count:result})
})


//add data to applications collection
app.post('/applications', async(req,res)=>{
  const application = req.body;
  const alreadyExists = await applications.findOne({
    userId: application.userId,
    email: application.email,
    jobTitle: application.jobTitle,
    companyName: application.companyName
  });
  if (alreadyExists){
    return res.status(400).send({message:"You already appllied this job"})
  } else {
    const result = await applications.insertOne(application);
    res.send(result)
  }
})

//update status of applied jobs in recruiter's applications page
app.patch('/applications/:id', async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const updatedDoc = {
    $set:{
      status: req.body.status
    }
  }
  const result = await applications.updateOne(query, updatedDoc);
  res.send(result)
})

// payments related apis
app.post('/payments/checkout-verify', async (req, res) => {
    const { sessionId } = req.body;

    if(!sessionId){
      return rs.send({success: false, message:'Session ID is required'})
    }
    const {
        status,
        payment_status,
        customer_email,
        metadata,
        payment_intent,
    } = await stripe.checkout.sessions.retrieve(sessionId);

    //1. is  new session used?
    //2. is the session id for the currently logged in user?
    //3. insert sessionId into the payment collection
    //4. update user information as premium user
    if (status === 'complete' && payment_status === 'paid') {

      const sessionQuery = {sessionId};
      const existingPayment = await payments.findOne(sessionQuery);
      if(existingPayment){
        return res.send({success: false, message: 'Payment already verified'})
      }

        const payment = {
            sessionId,
            status,
            payment_status,
            customer_email,
            userId: metadata.userId,
            payment_date: new Date(),
            payment_intent,
        }

        const result = await payments.insertOne(payment);

        // update the user table
        const query = { _id: new ObjectId(metadata.userId) };

        const updatedDoc = {
            $set: {
                premium: true,
            }
        }
        const updateResult = await users.updateOne(
            query,
            updatedDoc
        );
        res.send({ success: true, result, updateResult });
        return
    }
    res.send({ success: false, message: 'Payment verification failed' });
})

app.get('/users/:id/premium', async(req,res)=>{
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  //project bring only that specific info. 1 means true
  const result = await users.findOne(query,{projection: {premium : 1}});
  res.send(result)
})


//admin changinig roles of other users
app.patch('/users/:id/role',async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const updatedDoc = {
    $set: {
      role : req.body.role
    }
  }
  const result = await users.updateOne(query, updatedDoc)
  res.send(result)
})

//homepage of backend
app.get('/', (req, res) => {
  res.send("Welcome to the backend of Hireloop")
})

app.listen(PORT, () => {
  console.log(`app is listening on Port ${PORT}`);
})