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

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for users", async function () {
    const resp = await request(app)
        .post("/companies")
        .send(newCompany)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          handle: "new",
          numEmployees: 10,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          ...newCompany,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies:
          [
            {
              handle: "c1",
              name: "C1",
              description: "Desc1",
              numEmployees: 1,
              logoUrl: "http://c1.img",
            },
            {
              handle: "c2",
              name: "C2",
              description: "Desc2",
              numEmployees: 2,
              logoUrl: "http://c2.img",
            },
            {
              handle: "c3",
              name: "C3",
              description: "Desc3",
              numEmployees: 3,
              logoUrl: "http://c3.img",
            },
          ],
    });
  });

  test("test for maxEmployees", async function (){
    const filter = {
      "maxEmployees":2
    };
    const resp = await request(app).get("/companies").send(filter);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          num_employees: 1,
          logo_url: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          num_employees: 2,
          logo_url: "http://c2.img",
        },
      ]
    });
  });

  test("test for minEmployees", async function (){
    const filter = {
      "minEmployees":2
    };
    const resp = await request(app).get("/companies").send(filter);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          num_employees: 2,
          logo_url: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          num_employees: 3,
          logo_url: "http://c3.img",
        },
      ]
    });
  });

  test("num_employees omitted when not included as a filter", async function (){
    const filter = {
      "nameLike":"3"
    };
    const resp = await request(app).get("/companies").send(filter);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          // num_employees: 3, // should be omitted
          logo_url: "http://c3.img",
        },
      ]
    });
  });

  test("test for getting name", async function (){
    const filter = {
      "nameLike":"2", // should get c2
      "minEmployees":2 
    }
    const resp = await request(app).get("/companies").send(filter);
    expect(resp.body).toEqual({
      companies: [
        {
          handle:"c2",
          name: "C2",
          description: "Desc2",
          num_employees: 2,
          logo_url: "http://c2.img",
        }
      ]
    });
  });

  test("user can't select unauthorized data", async function() {
    const filter = {
      "maxEmployees":2,
      "age":9, // age shouldn't be allowed to pass
    };
    const resp = await request(app).get("/companies").send(filter);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          num_employees: 1,
          logo_url: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          num_employees: 2,
          logo_url: "http://c2.img",
        },
      ]
    });
  })


  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs:[{
          title: "j1",
          salary: 110000,
          equity:"0",
          company_handle:"c1",
        }],
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    await request(app).post(`/companies`).send({ // creates company without jobs
      handle: "c8",
      name: "C8",
      description: "Desc8",
      numEmployees:8,
      logoUrl: "http://c8.img"
    }).set("authorization", `Bearer ${u3Token}`);
    const resp = await request(app).get(`/companies/c8`);
    expect(resp.body).toEqual({
      company: {
        handle: "c8",
        name: "C8",
        description: "Desc8",
        numEmployees: 8,
        logoUrl: "http://c8.img",
      }
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
        .patch(`/companies/nope`)
        .send({
          name: "new nope",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .delete(`/companies/c1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/companies/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
