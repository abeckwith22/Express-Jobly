"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app.js");
const User = require("../models/user.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u3Token,
  test_job_id,
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("(admin) should work for admin: create admin", async function() {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(201); // should be authorized
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      }, token: expect.any(String),
    });
  });

  test("(non-admin) doesn't work for users: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      });
    expect(resp.statusCode).toEqual(401); // should be unauthorized
  });

  test("(non-admin) doesn't work for users: create admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401); // shouldn't be authorized
  });


  test("unauth for anon", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: true,
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("(admin) bad request if missing data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
        })
        .set("authorization", `Bearer ${u3Token}`); // changed from non-admin to admin to bypass checks
    expect(resp.statusCode).toEqual(400);
  });

  test("(admin) bad request if invalid data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "not-an-email",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("(admin) works", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toBe(200);
  });

  test("doesn't work for users", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get("/users");
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("(non-admin) doesn't work for any non-admin/not-same user", async function () {
    const resp = await request(app)
      .get(`/users/u2`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("(admin) works for admin", async function(){
    const resp = await request(app)
      .get(`/users/u2`)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.body).toHaveProperty("user.jobs");
  });

  test("(non-admin) does work for same-user", async function(){
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("(admin) not found if user not found", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("(non-admin) should not work for non-admin/not-same users", async function () {
    const resp = await request(app)
        .patch(`/users/u2`)
        .send({
          firstName: "New",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("(admin) not found if no such user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({
          firstName: "Nope",
        })
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("(non-admin) bad request if invalid data", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: 42,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("(non-admin) works: set new password", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("(non-admin) works for same user", async function () { 
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("(admin) works for admin", async function () { 
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("(non-admin) doesn't work for non-admin/not-same users", async function () { 
    const resp = await request(app)
      .delete(`/users/u2`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    // expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () { 
    const resp = await request(app)
      .delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });


  test("(admin) not found if user missing", async function () { 
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/****** POST /users/:username/job/:job_id */
describe("POST /users/:username/job/:job_id", function (){
  test("(admin) works", async function() {
    const username = "u1";
    const job_id_resp = await db.query(`
      SELECT job_id FROM applications WHERE username='u2'`);
    const job_id = job_id_resp.rows[0].job_id;
    console.log(`job_id: ${job_id}`);

    const resp = await request(app)
    .post(`/users/${username}/job/${job_id}`)
    .set("authorization", `Bearer ${u3Token}`);
    expect(resp.body).toEqual({ "applied": job_id });
  });
  test("(non-admin same-user) works", async function() {
    const username = "u1";
    const job_id_resp = await db.query(`
      SELECT job_id FROM applications WHERE username='u2'`);
    const job_id = job_id_resp.rows[0].job_id;
    console.log(`job_id: ${job_id}`);

    const resp = await request(app)
    .post(`/users/${username}/job/${job_id}`)
    .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ "applied": job_id });
  });
  test("(non-admin, not-same user) doesn't work", async function(){
    const username = "u2";
    const job_id_resp = await db.query(`
      SELECT job_id FROM applications WHERE username='u2'`);
    const job_id = job_id_resp.rows[0].job_id;
    console.log(`job_id: ${job_id}`);

    const resp = await request(app)
    .post(`/users/${username}/job/${job_id}`)
    .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);

  })
});
