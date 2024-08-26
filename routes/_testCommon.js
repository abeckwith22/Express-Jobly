"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Job = require("../models/job");
const Company = require("../models/company");
const { createToken } = require("../helpers/tokens");

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM jobs");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM applications");

  // companies
  await Company.create({
    handle: "c1",
    name: "C1",
    numEmployees: 1,
    description: "Desc1",
    logoUrl: "http://c1.img",
  });
  await Company.create({
    handle: "c2",
    name: "C2",
    numEmployees: 2,
    description: "Desc2",
    logoUrl: "http://c2.img",
  });
  await Company.create({
    handle: "c3",
    name: "C3",
    numEmployees: 3,
    description: "Desc3",
    logoUrl: "http://c3.img",
  });
  // users
  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });
  // jobs
  await Job.create({
    title: "j1",
    salary: 110000,
    equity: '0',
    company_handle: 'c1',
  });
  await Job.create({
    title: "j2",
    salary: 200000,
    equity: '0',
    company_handle: 'c2',
  });
  await Job.create({
    title: "j3",
    salary: 55000,
    equity: '0',
    company_handle: 'c3',
  });
  await Job.create({
    title: "j4",
    salary: 89000,
    equity: '0.043',
    company_handle: 'c2',
  });
  /* giving user an application for testing **/
  const title = "j4";
  const username = "u2";
  // getting job_id to insert into applications
  const job_id = await db.query(`
    SELECT id
    FROM jobs
    WHERE title=$1`,[title]);
  // inserting relation into applications
  await db.query(`
    INSERT INTO applications (username, job_id)
    VALUES ($1,$2)`,[username, job_id.rows[0].id]);
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

const u1Token = createToken({ username: "u1", isAdmin: false }); // not admin user
const u3Token = createToken({ username: "u3", isAdmin: true }); // admin user


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u3Token, // admin
};
