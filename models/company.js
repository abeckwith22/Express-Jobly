"use strict";

const db = require("../db");
const { ensureLoggedIn, ensureAdmin, authenticateJWT } = require("../middleware/auth.js");
const { BadRequestError, NotFoundError, ExpressError, UnauthorizedError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * remains open to all users anonymous or not
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   * 
   * remains open to all users anonymouse or not
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
        FROM companies
        WHERE handle = $1`,
    [handle]);

    const jobRes = await db.query( // calls a query to jobs that match company_handle with parameter `handle`
      `SELECT title, salary, equity, company_handle
        FROM jobs
        WHERE company_handle=$1`,
    [handle]);

    const company = companyRes.rows[0];
    if(jobRes.rows.length > 0){ // if jobs for company exist then append it to company object 
      company["jobs"] = jobRes.rows;
    }
    // otherwise just return company

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** NOTE: add docs here */
  static async findSpecific({maxEmployees, minEmployees, nameLike}) {
    if(minEmployees > maxEmployees){
      return new ExpressError("minEmployees exceeds maxEmployees", 400);
    };
    const body = {
      "maxEmployees":maxEmployees,
      "minEmployees":minEmployees,
      "nameLike":nameLike
    }
    const data = {};
    let keys = Object.keys(body); // ['maxEmployees', 'minEmployees', 'nameLike']
    for(let i = 0; i<keys.length; i++){
      let key = keys[i];
      if(body[key] != undefined){
        data[key] = body[key]; // data['maxEmployees'] = value at body['maxEmployees']
      }
    }
    
    const jsToSql = {
      "handle":"handle",
      "name":"name",
      "description":"description",
      "logo_url":"logoUrl"
    }
    if(maxEmployees || minEmployees){ // if either of these values exist, include them in the SELECT query.
      jsToSql["num_employees"] = "numEmployees";
    }
    const {setCols, where_request, values}= Company.sqlFilterGetRequest(data, jsToSql);

    // console.log(values);

    // console.log(`SELECT ${setCols}
    //              FROM companies
    //              ${where_request}`);

    const querySql = `SELECT ${setCols}
                      FROM companies
                      ${where_request}
                      `

    const results = await db.query(querySql, values);
    
    return results.rows;
  }

  /** returns an object for the SELECT clause to interpret.
   * 
   *  return object contains:
   * 
   *  `setCols`: what select displays to the user.
   * 
   *  `where_request`: parsed string that contains the actual filtering for SQL using WHERE/AND clauses.
   * 
   *  `values`: the values of that data that will be sanitized and passed through to the sql db.query() request.
   * 
   * @param {object} dataToFilter 
   * @param {object} jsToSql 
   * @returns {object}
   */
  static sqlFilterGetRequest(dataToFilter, jsToSql) {
    const keys = Object.keys(jsToSql);
    const filterKeys = Object.keys(dataToFilter);
    const filterVals = Object.values(dataToFilter);

    // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
    const cols = keys.map((colName) => `"${colName}"`);

    let where_string = "";
    let and = "";
    let where = "WHERE ";

    /* This for loop looks for keys that match either 'maxEmployees', 'minEmployees', and/or 'nameLike'
    * and if there's a match it will update the where_string accordingly making sure to add exactly one WHERE clause
    * as well as AND clauses after it.
    */
    for (let idx = 0; idx < filterKeys.length; idx++){
      let key = filterKeys[idx]; // 'minEmployees', 'nameLike'

      if(idx>0){
        and = " AND "; // and should appear only after the first statement
        where = ""; // where shouldn't appear after the first statement
      }

      if(key === 'maxEmployees' && dataToFilter[key]){
        where_string += `${where}${and}num_employees<=$${idx+1}`;
      }
      else if(key === 'minEmployees' && dataToFilter[key]){
        where_string += `${where}${and}num_employees>=$${idx+1}`;
      }
      else if(key === 'nameLike' && dataToFilter[key]){
        filterVals[idx] = `%${dataToFilter[key]}%`; // formatted with wildcards and added to database when key 'nameLike' exists
        where_string += `${where}${and}name ILIKE $${idx+1}`;
      }
    }

    return {
      setCols: cols.join(", "),
      where_request: where_string,
      values: filterVals
    };
  }

  /** Update company data with `data`.
  *
  * This is a "partial update" --- it's fine if data doesn't contain all the
  * fields; this only changes provided ones.
  *
  * Data can include: {name, description, numEmployees, logoUrl}
  *
  * Returns {handle, name, description, numEmployees, logoUrl}
  *
  * Throws NotFoundError if not found.
  */
  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, { 
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
  **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
