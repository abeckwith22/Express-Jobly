const { BadRequestError } = require("../expressError");

/**
 * Returns SQL friendly data for models.
 *
 * Without a way for SQL to dynamically update specific columns, we have to
 * give a model key value data so that we can use sql's UPDATE accordingly.
 *
 * The function gets a list of `keys`, throwing an error if keys list is empty.
 * Then maps those keys to a string, indexing the parameters in SQL to
 * avoid SQLinjection, saving the mapped keys to `cols`.
 *
 * For example, {firstname: 'Aliya', age: 32} => ['"first_name"=$1, '"age"=$2"']
 *
 * Finally returns an obj with parameters `setCols` which is now a string formatted
 * to contain a comma (", ") after every key, as well as `values`
 * which are the objects key-values as an arr.
 *
 * @throws {BadRequestError} - Will throw an error if keys list is empty
 *
 * @param {string} dataToUpdate
 * @param {object} jsToSql
 *
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate); // ['username', 'password', 'first_name', 'last_name', 'email', 'is_admin']
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}


module.exports = { sqlForPartialUpdate };
