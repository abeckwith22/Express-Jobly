"use strict";

const { query } = require("express");
const db = require("../db");
// const { ensureLoggedIn, ensureAdmin, authenticateJWT } = require("../middleware/auth.js");
const { BadRequestError, NotFoundError, ExpressError, UnauthorizedError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, company_handle }) {
    
    const duplicateCheck = await db.query(
          `SELECT title 
           FROM jobs
           WHERE title = $1`,
        [title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);

    const result = await db.query(
          `INSERT INTO jobs 
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle`,
        [
            title,
            salary,
            equity,
            company_handle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, company_handle}, ...]
   * 
   * allows filtering with {title, minSalary, equity}
   * 
   * remains open to all users anonymous or not
   * */

  static async findAll(filters) {
    // const filters_json = JSON.stringify(filters);
    // console.log(`findAll() filters operand: ${filters_json}`)
    const { WHERE_STATEMENT, filter_values } = this.filter_where_query(filters);
    const query_statement = `
      SELECT title,
             salary,
             equity,
             company_handle
      FROM jobs
      ${WHERE_STATEMENT}
      ORDER BY title`
    // console.log(`QUERY_STATEMENT: ${query_statement}`);
    // console.log(`FILTER_VALUES: ${filter_values}`);
    const jobRes = await db.query(query_statement, filter_values);
    return jobRes.rows;
  }

  /** Filters WHERE query 
   * helper for findAll() method, allows parameters title, minSalary, and hasEquity
   * 
   * title - case-insensitive, searches for jobs with title/keyword in name
   * minSalary - restricts jobs to having salaries above minSalary
   * hasEquity - if true, finds all jobs with non-zero equities.
   * 
   * returns { WHERE_STATEMENT, VALUES }
   * 
   * WHERE_STATEMENT - formatted sql where statement that is placed in string when making a query using findAll().
   * VALUES - sanitized values placed in db.query(query_statement, filter_values)
  */
  static filter_where_query(filters = {title:null, minSalary:null, hasEquity:null}){
    let end = 0;
    Object.keys(filters).map(key =>{if(filters[key])end++;}); // sets end to help with 'for' loop and will tell if there isn't any valid values which will return empty WHERE query early.
    let WHERE_STATEMENT = `WHERE`;
    let filter_values = []; // values from the keys to return to the findAll() function for where query parameters.
    let idx=1;

    // limits keys to not include null
    let keys = Object.keys(filters).filter(key =>{
      if(filters[key]){ // if value @ key isn't null, returns key
        return key;
      }
    });
    // limits values to not include null
    let values = Object.values(filters).filter(val => {
      if(val){
        return val;
      }
    });

    if(end <= 0){ // if no valid values, assume no filter
      WHERE_STATEMENT = ``;
      return {WHERE_STATEMENT, filter_values};
    }

    // actual filtering
    for(let i=0; i<end; i++){
      // console.log(`keys[i]: ${keys[i]}`);
      // first and statement can't come first in the WHERE query nor the last value
      if(i > 0 && i < end){
        WHERE_STATEMENT += ' AND';
      }

      if(keys[i] === 'title' && values[i]){
        let title_string = `%${filters[keys[i]]}%` // formatted so ILIKE statement works properly.
        WHERE_STATEMENT += ` title ILIKE $${idx}`
        filter_values.push(title_string);
      }
      else if(keys[i] === 'minSalary' && values[i]){
        WHERE_STATEMENT += ` salary>$${idx}`
        filter_values.push(filters[keys[i]]);
      }
      else if(keys[i] === 'hasEquity' && filters[keys[i]] === true && values[i]){
        WHERE_STATEMENT += ` equity>0`
        idx--;
      }
      idx++;
    }
    return { WHERE_STATEMENT, filter_values };
  }

  /** Given a job title, return data about that job.
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   * 
   * remains open to all users anonymouse or not
   **/

  static async get(title) {
    const jobRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle
           FROM jobs
           WHERE title = $1`,
        [title]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  // TODO: UPDATE DOCSTRING
  /** Update job data with `data`.
  *
  * This is a "partial update" --- it's fine if data doesn't contain all the
  * fields; this only changes provided ones.
  *
  * Data can include: {title, salary, equity }
  *
  * Returns {title, salary, equity }
  *
  * Throws NotFoundError if not found.
  */
  static async update(title, data) {
    if(Object.keys(data).length <= 0){ // checks if there is no data
      throw new BadRequestError('Invalid data');
    }

    const {set_statement, idx} = this.update_set_statement(data);
    const querySql = `
      UPDATE jobs 
      ${set_statement}
      WHERE title=$${idx}
      RETURNING title, 
        salary, 
        equity`

    let filtered_values = Object.values(data).filter(val =>{
      if(val) return val;
    })
    const result = await db.query(querySql, [...filtered_values, title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  // NOTE: HAVE TO UPDATE DOCSTRING
  /** helper for update method.
   *  filters data through a simple key map with data that is passed to return the final
   *  sql query.
   */

  static update_set_statement(data){
    const allowed_keys = ["title", "salary", "equity"];
    let filtered_data = Object.keys(data).filter(key => {
      if(data[key]){
        if(allowed_keys.includes(key)){
          return key;
        }
        else{
          throw new BadRequestError("Invalid Data");
        }
      }
    });

    let set_statement = `SET`;
    let idx = 1;
    let end = filtered_data.length;

    for(let d of filtered_data){
      if(idx >= end){
        set_statement += ` ${d}=$${idx}`
        idx++;
        break;
      }
      else{
        set_statement += ` ${d}=$${idx},`
      }
      idx++;
    }
    return {set_statement, idx};
  };


  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
  **/

  static async remove(title) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE title = $1
           RETURNING title`,
        [title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);
  }
}
module.exports = Job;

