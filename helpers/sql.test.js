const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate()", function (){
    test("returns SQL friendly data for updating", function (){
        const dataToUpdate = {
            firstName: "Jannette",
            lastName: "Doe",
            age: 213,
            isAdmin: true
        };
        const data = {
            firstName: "first_name",
            lastName: "last_name",
            isAdmin: "is_admin" 
        };
        const {setCols, values } = sqlForPartialUpdate(dataToUpdate, data);
        expect(setCols).toEqual(`"first_name"=$1, "last_name"=$2, "age"=$3, "is_admin"=$4`);
        expect(values).toEqual([ "Jannette", "Doe", 213, true ]);
    });
    test("returns error if keys are empty", () => {
        const dataToUpdate = {
        };
        const data = {
            firstName: "first_name",
            lastName: "last_name",
            age: 21,
            isAdmin: "is_admin",
        };
        expect(() => {
            sqlForPartialUpdate(dataToUpdate, data)
        }).toThrow(BadRequestError);
    });
});
