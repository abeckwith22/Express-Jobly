# Express Jobly

### Goals and Requirements

- This is a pure API app, taking values from the query string (GET requests) or from a JSON body (other requests). It returns JSON.
- This gets authentication/authorization with JWT tokens. Make sure your additions only allow access as specified in our requirements.
- Be thoughtful about function and variable names, and write developer-friendly documentation *for every function and route* you write.
- The starter code is well tested, with excellent coverage. We expect your new contributions to maintain good coverage.
- Model tests check the underlying database actions. Route tests check the underlying model methods and do not rely directly on the database changes. This is a useful testing design consideration and you should continue it.
- We *strongly encourage you* to practice some test-driven development. Write a test before writing a model method and a route. You will find that this can make the work of adding to an app like this easier, and much less bug-prone.
- Finally, **take your time, be organized and clear, and test carefully**. Have fun!

### Part 1: Setup / Starter Code

- [x] Download Starter Code, Skim though the code to get a sense of the main components and the organization.
- [x] We've provided ***jobly.sql***, which will create a database (with a small amount of starter data) and a test database. Set those up. (Some of the tables included are not currently used by the application; you'll add the parts of the app that will use those tables in the exercise).
- [x] Read the tests
  - [x] Get an understanding of what the ***beforeEach*** and ***afterEach*** methods are specifically doing for our tests.
- [x] Run our tests, with coverage. Any time you run our tests here, you will need to use the `-i` flag for Jest, so that the tests run "in band" (in order).
- [x] Start up the server *(note that, unlike mist exercises, we start this server on port **3001**)*
- [x] Test the API in insomnia

#### Task 1: `sqlForPartialUpdate`

A starting piece to document and test:

- [x] We've provided a useful method in ***helpers/sql.js*** called ***sqlForPartialUpdate***. This code works, and we use it, but the code is undocumented and not directly tested. Write unit tests for this, and thoroughly document the function.

### Part 2: Companies

We've provided a model and routes for companies.

#### Add Filtering
The route for listing all companies (***GET*** /companies) works, but it currently shows all companies.

Add a new feature to this, allowing API users to filter the results based on optional filtering criteria, and or all of which can be passed in the query string.

- [x] **name**: filter by company name. If the string "net" is passed in, this should find any company who name contains the word "net", **case-insensitive** (so "Study Networks" should be included).
- [x] **minEmployees**: filter to companies that have at results >= **minEmployees** amount of employees
- [x] **maxEmployees**: filter to companies that have at results <= **maxEmployees** amount of employees
- [x] - If the ***minEmployees*** parameter is greater than the ***maxEmployees*** parameter, respond with a 400 error with an appropriate message.
```js
// something like this
if(minEmployees > maxEmployees){
  return Error(400);
}
```

**Some requirements**:
- [x] Do not solve this by issuing a more complex SELECT statement than is needed (for example, if the user isn't filtering by ***minEmployees*** or ***maxEmployees***, the SELECT statement should not include anything about the ***num_employees***);
- [x] Validate that the request does not contain inappropriate other filtering fields in the route. Do the actual filtering in the model.
- [x] Write unit tests for the model that exercise this in different ways, so you can be assured different combinations of filtering will work.
- [x] Write tests for the route that will ensure that it correctly validates the incoming request and uses the model method properly.
- [x] Document all new code here clearly; this is functionality that future team members should be able to understand how to use from your docstrings.

### Part 3: Change Authorization

Many routes for this site do not have appropriate authorization checks.

##### Companies
- [x] Retrieving the list of companies or information about a company should remain open to everyone, including anonymous users.
- [x] Creating, updating, and deleting companies should only be possible for users who logged in with an account that has ***is_admin*** flag in the database.

- [x] Find a way to do this where you don't need to change the code of these routes, and where you don't need to SELECT infromation about the user on every request, but that the authentication credentials provided by the user can contain information suitable for this requirement.

- [x] Update tests to demonstrate that these security changes are working.

##### Users
- [x] Creating users should only permitted by admins (registration, however, should remain open to everyone).
- [x] Getting the list of all users should only be permitted by admins.
- [x] Getting information on a user, updating, or deleting a user should only be permitted either by an admin, or by that user.

- [x] As before, write tests for this carefully.

### Part 4: Jobs

Add a feature for jobs to the application

We've already provided a table for this. Study it.

##### Adding Job Model, Routes, and Tests
- [x] Add a model for jobs - you can pattern-match this from the companies model.
- [x] Updating a job should never change the ID of a job, nor the company associated with a job.
- [x] Write tests for the model.
- [x] Add routes for jobs. The same routes should be handled as we did for companies (for now, omit the special filtering on the ***GET /*** route), with the same security requirements (anyone can get, the jobs, but only admins can add, update, or delete them). Make sure you suitably validate incoming data.

- [x] Write tests for routes.

##### Adding Filtering
Similar to the companies filtering for the ***GET /*** route, add filtering for jobs for the following possible filters:
- [x] **title**:filter by job title. Like before, this should be case-insensitive, matches-any-part-of-string search.
- [x] **minSalary**: filter to jobs with **at least** that salary.
- [x] **hasEquity**: if ***true***, filter to jobs that provide a non-zero amount of equity. If ***false*** or not included in the filtering, list all jobs regardless of equity.

- [x] Write tests for this, and document this feature well.

##### Show Jobs for a Company
- [x] Now that the app includes jobs, change the ***GET /companies/:handle*** feature so that it includes all of the information about the jobs associated with that company.

```
{ ... other data ... , jobs: [ { id, title, salary, equity }, ... ]}
```

### Part 5: Job Applications
We've provided a table for applications. 

- [x] Incorporate this into the app by adding amethod onto the ***User*** model, allowing users to apply for a job.

- [x] Add a route at ***POST /users/:username/jobs/:id*** that allows that user to apply for a job (or an admin to do it for them). That route should return JSON like:
```
{ applied: jobId }
```

Change the output of the get-all-info methods and routes for users so those include a field with a simple list of job IDs the user has applied for:
```
{ ..., jobs: [ jobId, jobId, ... ] }
```

- [x] Document carefully and write tests.

