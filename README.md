#Query Filtering
##Frontend
1. lib/jobs.ts
export const getJobs = async(querry:string='')=>{
  //only if querry exists, it will be send to backend
  const res=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs?${querry}`);
  const jobs= await res.json();
  return jobs
} 



2. app/jobs/page.tsx
import { getJobs } from "@/lib/api/jobs";

const BrowseJobsPage = async({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {

  //this creates a object of params from url
  const search = await searchParams

  //this converts the object to string (URLSearchParams from js)
  const urlSearch = new URLSearchParams(search as Record<string, string>);
  const query= urlSearch.toString();
  console.log("search params:", query);
  const jobs = await getJobs(query);

  return(
    <div>
      <h1>Browse Jobs Page</h1>
      <ul>
        {
          jobs.map((job)=>(<li key={job._id}>{job.title}</li>)) 
        }
      </ul>
    </div>
  )
}

export default BrowseJobsPage








##Backend
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