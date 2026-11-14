#Query Filtering
##Frontend
###Getting ready to function by manually writing query wiring in url
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
      <JobSearchBar />
      <aside>
        <JobFiltersPanel jobs={jobs} />
      </aside>
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



###Updating url (query wiring) automatically by selecting filter or writing search texts
1. app/jobs/_components/job-search-bar.tsx
export function JobSearchBar() {
    const router = useRouter();
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        console.log(data);
        const search = data.searchField;
      //make a search param merging with previous serach params
        const params = new URLSearchParams(window.location.search);
      //set the search param('search' same as req.query.search in backend)
        params.set('search', search as string);
      //set the params in url
        router.push(`/jobs?${params.toString()}`)
    }

  return(
    <form
        onSubmit={handleSubmit}
        role="search"
        className="surface-card flex flex-col gap-3 p-6 sm:flex-row sm:items-center"
    >
        <div className="relative flex-1">
            <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8E9192]"
            />
            <Input
                name="searchField"
                aria-label="Search jobs"
                placeholder="Search by job title, keywords..."
                className="surface-field h-12 w-full pr-3 pl-10 text-sm text-black placeholder:text-[#A0A0AB]"
            />
        </div>
        <button type="submit" className={cn(buttonVariants(), "border border-black bg-black text-white hover:bg-white/90 hover:text-black sm:h-12")}>
            Search Jobs
        </button>
    </form>
  )
}



2. components/filter-checklist.tsx
export function FilterChecklist({
    legend,
    name,
    options,
    multiple = true,
    defaultValue = [],
}: {
    legend: string
    name: string
    options: readonly FilterOption[]
    multiple?: boolean
    defaultValue?: readonly string[]
}) {
    const router = useRouter();
    const inputType = multiple ? "checkbox" : "radio"
    
    const handleCheckBoxChange = (event: React.ChangeEvent<HTMLInputElement>)=>{
        console.log(name, event.target.value);
        //this creates a new search params merging with previous params
        const params = new URLSearchParams();
        params.set(name,event.target.value);
        router.push(`/jobs?${params.toString()}`)
    }
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold tracking-[-0.02em] text-black">
                {legend}
            </legend>
            <div className="flex flex-col gap-1">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-3 py-1 text-[13px] font-medium text-[#A0A0AB] transition-colors capitalize hover:text-black has-[:checked]:text-black"
                    >
                        <input
                            type={inputType}
                            name={name}
                            value={option.value}
                            defaultChecked={defaultValue.includes(option.value)}
                            className="sr-only peer"
                            onChange={handleCheckBoxChange}
                        />
}






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