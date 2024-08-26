"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const ExpressError = require("../expressError");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const { sqlForPartialUpdate } = require("../helpers/sql");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, company_handle}
 *
 * Authorization required: login, admin
*/

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { title, salary, hasEquity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (case-insensitive, impartial matches)
 * - minSalary
 * - hasEquity 
 *
 * Authorization required: none
*/

router.get("/", async function (req, res, next) {
  try {
    const filters = {
      title: req.body.title,
      minSalary: req.body.minSalary,
      hasEquity: req.body.hasEquity,
    };
    // const filter_json = JSON.stringify(filters);
    // console.log(`FILTERS: ${filter_json}`);
    const request = await Job.findAll(filters);
    return res.json({ jobs : request });
  } catch (err) {
    return next(err);
  }
});

/** GET /[title]  =>  { Job }
 *
 *  Job is { title, salary, equity, company_handle }
 *
 * Authorization required: none
*/

router.get("/:title", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.title);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[title] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: login, admin
*/

router.patch("/:handle", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.handle, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[title]  =>  { deleted: title }
 *
 * Authorization: login, admin
 */

router.delete("/:title", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.title);
    return res.json({ deleted: req.params.title });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
