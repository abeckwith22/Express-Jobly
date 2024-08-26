"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u3Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new_job",
    salary: 10000,
    equity: "0.04",
    company_handle: "c1",
  };

  test("(admin) Create job posting", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("(admin) bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
            title: "new_job",
            salary: 10000
        })
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("(admin) bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          not_valid_data: true
        })
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app)
        .get("/jobs");
        expect(resp.body).toEqual({ jobs: [
            {
                title: "j1",
                salary: 110000,
                equity: "0",
                company_handle: "c1"
            },
            {
                title: "j2",
                salary: 200000,
                equity: "0",
                company_handle: "c2"
            },
            {
                title: "j3",
                salary: 55000,
                equity: "0",
                company_handle: "c3"
            },
            {
                title: "j4",
                salary: 89000,
                equity: "0.043",
                company_handle: "c2"
            },
        ]});
    });
	/* filtering **/
    test("filter for job title", async function (){
        const filter = {
            title:"j1",
        };
        const resp = await request(app)
        .get("/jobs")
        .send(filter);

        expect(resp.body).toEqual({
        jobs: [
            {
                title: "j1",
                salary: 110000,
                equity: "0",
                company_handle: "c1",
            },
        ]
        });
    });
    test("filter for minSalary", async function (){
      	const filter = {
            minSalary:100000,
        };
        const resp = await request(app)
        .get("/jobs")
		.send(filter);

        expect(resp.body).toEqual({
        jobs: [
          {
            title: "j1",
            salary: 110000,
            equity: "0",
            company_handle: "c1",
          },
          {
            title: "j2",
            salary: 200000,
            equity: "0",
            company_handle: "c2",
          }
        ]});
	});
    test("filter for equity", async function (){
        const filter = {
            hasEquity:true,
        };
        const resp = await request(app)
        .get("/jobs")
        .send(filter);

        expect(resp.body).toEqual({
			jobs: [
				{
					title: "j4",
					salary: 89000,
					equity: "0.043",
					company_handle: "c2",
				},
			]
		});
    });
	test("fails: test next() handler", async function () {
	  // there's no normal failure event which will cause this route to fail ---
	  // thus making it hard to test that the error-handler works with it. This
	  // should cause an error, all right :)
	  await db.query("DROP TABLE jobs CASCADE");
	  const resp = await request(app)
		  .get("/jobs")
	  expect(resp.statusCode).toEqual(500);
	});
});


/************************************** GET /job/:title*/

describe("GET /job/:title", function () {
	test("works for anon", async function () {
		const resp = await request(app).get(`/jobs/j1`);
		expect(resp.body).toEqual({
		job: {
				title: "j1",
				salary: 110000,
				equity: "0",
				company_handle: 'c1',
			},
		});
	});
	test("not found for no such job", async function () {
		const resp = await request(app).get(`/jobs/nope`);
		expect(resp.statusCode).toEqual(404);
	});
});



/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:handle", function () {
	test("(non-admin) shouldn't work for users", async function () {
		const resp = await request(app)
		.patch(`/jobs/j1`)
		.send({
			title: "j1-patched",
		})
		.set("authorization", `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
	test("(admin) works for admin", async function () {
		const resp = await request(app)
		.patch(`/jobs/j1`)
		.send({
			title: "j1-patched"
		})
		.set("authorization", `Bearer ${u3Token}`);
		// expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			"job":{
				title: "j1-patched",
				salary: 110000,
				equity: "0",
			}
		});
	});
	test("(non-admin) unauth for anon", async function () {
	const resp = await request(app)
		.patch(`/jobs/j1`)
		.send({
			title: "j1-patched",
		});
	expect(resp.statusCode).toEqual(401);
	});
	test("(admin) not found on no such job", async function () {
	const resp = await request(app)
		.patch(`/jobs/nope`)
		.send({
			title: "new nope",
		})
		.set("authorization", `Bearer ${u3Token}`);
	expect(resp.statusCode).toEqual(404);
	});
	test("(admin) bad request on invalid data", async function () {
		const resp = await request(app)
			.patch(`/jobs/j1`)
			.send({
				url: "should be invalid",
			})
			.set("authorization", `Bearer ${u3Token}`);
		expect(resp.statusCode).toEqual(400);
	});
});



/************************************** DELETE /companies/:handle */

describe("DELETE /jobs/:title", function () {
	test("(admin) works", async function () {
		const resp = await request(app)
			.delete(`/jobs/j1`)
			.set("authorization", `Bearer ${u3Token}`);
		expect(resp.body).toEqual({ "deleted": "j1" });
	});
	test("(non-admin) doesn't work for users", async function () {
		const resp = await request(app)
			.delete(`/jobs/j1`)
			.set("authorization", `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
			
	});
	test("unauth for anon", async function () {
		const resp = await request(app)
			.delete(`/jobs/j1`);
		expect(resp.statusCode).toEqual(401);
	});
	test("not found for no such company", async function () {
		const resp = await request(app)
		  .delete(`/companies/nope`)
		  .set("authorization", `Bearer ${u1Token}`);
	  	expect(resp.statusCode).toEqual(404);
	});
});

