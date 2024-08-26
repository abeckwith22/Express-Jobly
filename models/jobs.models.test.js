"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");
const { compare } = require("bcrypt");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "j5",
    salary: 50000,
    equity: "0",
    company_handle: "c3",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
        `SELECT title, salary, equity, company_handle 
         FROM jobs
         WHERE title = 'j5'`);
    expect(result.rows).toEqual([{
        title: "j5",
        salary: 50000,
        equity: "0",
        company_handle: "c3",
    }]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: 'j1',
        salary: 110000,
        equity: '0',
        company_handle: 'c1',
      },
      {
        title: 'j2',
        salary: 200000,
        equity: '0',
        company_handle: 'c2',
      },
      {
        title: 'j3',
        salary: 55000,
        equity: '0',
        company_handle: 'c3',
      },
      {
        title: 'j4',
        salary: 89000,
        equity: '0.043',
        company_handle: 'c2',
      },
    ]);
  });
  // test("filter data: works", async function(){

  // });
  test("filter data: title", async function(){
    const filters = {
      title: "j1",
    }
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: 'j1',
      salary: 110000,
      equity: '0',
      company_handle: "c1",
    }]);
  });
  test("filter data: title (case-insensitive)", async function(){
    const filters = {
      title: "J1",
    }
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: 'j1',
      salary: 110000,
      equity: '0',
      company_handle: "c1",
    }]);
  });
  test("filter data: minSalary", async function(){
    const filters = {
      minSalary:100000 
    }
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: 'j1',
      salary: 110000,
      equity: '0',
      company_handle: "c1"
    },
    {
      title: 'j2',
      salary: 200000,
      equity: '0',
      company_handle: 'c2',
    }]);
  });
  test("filter data: hasEquity", async function(){
    const filters = {
      hasEquity: true
    }
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: 'j4',
      salary: 89000,
      equity: '0.043',
      company_handle: 'c2',
    }]);
  });
  test("filter data: doesn't accept and passes over null values", async function(){
    const filters = {
      hasEquity: true,
      title: null,
      minSalary: null,
    }
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: "j4",
      salary: 89000,
      equity: "0.043",
      company_handle: "c2",
    }]);

  });
  test("filter data: all of the above", async function(){
    const filters = {
      title: "j4",
      hasEquity: true,
      minSalary: 80000,
    };
    const jobs = await Job.findAll(filters);
    expect(jobs).toEqual([{
      title: "j4",
      salary: 89000,
      equity: "0.043",
      company_handle: "c2",
    }]);
  });
});

// /************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("j1");
    expect(job).toEqual({
      title: 'j1',
      salary: 110000,
      equity: '0',
      company_handle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

});

// /************************************** update */

describe("update", function () {
  const updateData = {
    title: "new_j1",
    salary: 100000000,
    equity: "0.02",
  };

  test("works", async function () {
    let job = await Job.update("j1", updateData);
    expect(job).toEqual({
      ...updateData,
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs 
           WHERE title = 'new_j1'`);
    expect(result.rows).toEqual([{
      title: "new_j1",
      salary: 100000000,
      equity: "0.02",
      company_handle: "c1",
    }]);
  });

  test("doesn't work for keys company_handle or id", async function(){
    const updateDataInvalid = {
      title: "new_j1",
      id: 100,
      company_handle:"c2",
    };
    try{
      let job = await Job.update("j1", updateDataInvalid);
    }
    catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("doesn't work for keys that don't exist", async function(){
    const updateDataInvalid = {
      title: "new_j1",
      rating: 5,
      salary: 10
    };
    try{
      let job = await Job.update("j1", updateDataInvalid);
    }
    catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });


  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "new_j1",
      salary: null,
      equity: null,
    };

    let job = await Job.update("j1", updateDataSetNulls);
    expect(job).toEqual({
      title: "new_j1",
      salary: 110000,
      equity: "0"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new_j1'`);
    expect(result.rows).toEqual([{
      title: "new_j1",
      salary: 110000,
      equity: "0",
      company_handle: "c1"
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("j1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

// /************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove("j1");
    const res = await db.query(
        "SELECT title FROM jobs WHERE title='j1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
