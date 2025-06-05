const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");




const jsonData = JSON.parse(fs.readFileSync(`${__dirname}/../employeeMasterData.json`, 'utf8'));




const generateEmployeeId = async (connection) => {
  // Fetch the maximum employee code
  const response = await connection.query(`SELECT MAX(EMPLOYEE_CODE) AS MAX FROM SL_MST_EMPLOYEE`);

  // Check if the result is NULL (in case it's the first employee)
  let num = 1;
  if (response.rows[0].max) {
    num = Number(response.rows[0].max.slice(1)) + 1;
  }

  // Calculate the number of leading zeros needed
  const numZeros = 5 - num.toString().length;
  const zeros = '0'.repeat(numZeros);

  // Log the employee ID and return it
  console.log(`E${zeros}${num}`);
  return `E${zeros}${num}`;
};



exports.getAllEmployees = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const employees = await connection.query(
    `SELECT EMPLOYEE_CODE, EMPLOYEE_NAME, PHONE, MOBILE, TO_CHAR(DOB, 'DD-MM-YYYY') AS DATE_OF_BIRTH, TO_CHAR(DOJ, 'DD-MM-YYYY') AS DATE_OF_JOINING FROM SL_MST_EMPLOYEE where marked is null and company_code= ${req.user.company}`
  );
  res.status(200).json({
    status: 'success',
    data: {
      employees,
    },
  });
});



exports.getEmployee = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  // Validate input
  if (!req.params.code) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please specify the Employee Code',
    });
  }

  const data = {};
  const arr = jsonData.getNdelete.dataSources;

  // Function to transform keys to uppercase
  // const transformKeysToUppercase = (row) => {
  //   return Object.keys(row).reduce((acc, key) => {
  //     acc[key.toUpperCase()] = row[key];
  //     return acc;
  //   }, {});
  // };

  for (let i = 0; i < arr.length; i++) {
    // Construct query
    let query = `SELECT ${arr[i].fieldsRequired} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    query += ` WHERE ${arr[i].uniqueEmployeeIdentifier} = $1`;

    console.log(query); // Log the constructed query for debugging

    try {
      // Execute query
      const dbData = await connection.query(query, [req.params.code]);
      
      // Transform keys to uppercase and store in the data object
      data[arr[i].responseFieldName] = dbData.rows
    } catch (err) {
      console.error(`Error executing query for ${arr[i].tableName}:`, err.message);
      return res.status(500).json({
        status: 'fail',
        message: `Error fetching data for ${arr[i].responseFieldName}`,
      });
    }
  }

  // Send the final response
  res.status(200).json({
    status: 'success',
    data,
  });
});





exports.getAdditionalData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  const data = {};
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].lovFields) {
      let query = ``;
      const obj = arr[i].lovFields;
      for (const key in obj) {
        query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where marked is null`;
        console.log(query);
        const dbData = await connection.query(query);
        data[key] = dbData;
      }
    }
  }

  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.createEmployee = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  const employeeCode = await generateEmployeeId(connection);

  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const originalObj = req.body[arr[i].responseFieldName][0];
        const obj = {};
        Object.keys(originalObj).forEach((key) => {
          obj[key.toLowerCase()] = originalObj[key];
        });

        let fields = ``;
        let values = ``;

        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          const lowerField = field.toLowerCase();
          if (obj[lowerField] !== undefined && obj[lowerField] !== null) {
            fields += `${lowerField}, `;
            if (arr[i].fieldsRequired[field] === 'date') {
              values += `TO_DATE('${obj[lowerField]}', 'DD-MM-YYYY'), `;
            } else if (arr[i].fieldsRequired[field] === 'number') {
              values += `${obj[lowerField]}, `;
            } else {
              values += `'${obj[lowerField]}', `;
            }
          }
        });

        fields = fields.slice(0, -2);
        values = values.slice(0, -2);

        const query = `INSERT INTO ${arr[i].tableName} (employee_code, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${employeeCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
        console.log(query);
        await connection.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];

        for (let j = 0; j < arr1.length; j++) {
          const originalObj = arr1[j];
          const obj = {};
          Object.keys(originalObj).forEach((key) => {
            obj[key.toLowerCase()] = originalObj[key];
          });

          let fields = ``;
          let values = ``;

          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            const lowerField = field.toLowerCase();
            if (obj[lowerField] !== undefined && obj[lowerField] !== null) {
              fields += `${lowerField}, `;
              if (arr[i].fieldsRequired[field] === 'date') {
                values += `TO_DATE('${obj[lowerField]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === 'number') {
                values += `${obj[lowerField]}, `;
              } else {
                values += `'${obj[lowerField]}', `;
              }
            }
          });

          fields = fields.slice(0, -2);
          values = values.slice(0, -2);

          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueEmployeeIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${employeeCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
          console.log(query);
          await connection.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Employee Created Successfully',
  });
});



exports.updateEmployee = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please specify the Employee Code',
    });
  }
  const connection = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === 'date')
              fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === 'number') fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueEmployeeIdentifier}='${req.params.code}'`;
        console.log(query);
        await connection.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          if (obj.PARAM === 'UPDATE') {
            let fields = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                if (arr[i].fieldsRequired[field] === 'date')
                  fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === 'number') fields += `${field} = ${obj[field]}, `;
                else fields += `${field} = '${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueRowIdentifier}='${
              obj[arr[i].uniqueRowIdentifier]
            }'`;
            console.log(query);
            await connection.query(query);
          } else if (obj.PARAM === 'DELETE') {
            const query = `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueRowIdentifier}='${
              obj[arr[i].uniqueRowIdentifier]
            }'`;
            console.log(query);
            await connection.query(query);
          } else {
            let fields = ``;
            let values = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                fields += `${field}, `;
                if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueEmployeeIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            console.log(query);
            await connection.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: 'success',
    message: 'Employee Updated Successfully',
  });
});


exports.deleteEmployee = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please specify the Employee Code',
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  //console.log("fffdfdfdfdfdfdfw \n"+JSON.stringify(arr));
  const tableArray = [
    { table:"sl_sec_spec_item_hdr" , column:"spec_code"},
    { table:"sl_sec_spec_item_det" , column:"spec_cd"},
    

  ]; // List of tables to check

  
  const result = await Promise.all(
    tableArray.map(async ({table,column}) => {
      return await connection.query(
        `SELECT ref_table_c('${table}', '${column}', '${req.params.code}')`
      );
    })
  );
  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table_c);
  

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Employee is  Already Tagged",
      isUsed: true,
    });
  } else {

  for (let i = 0; i < arr.length; i++) {
    await connection.query(
      `UPDATE ${arr[i].tableName} set marked='D'   WHERE ${arr[i].uniqueEmployeeIdentifier}='${req.params.code}'`
    );

   // console.log("fffdfdfdfdfdfdfw \n"+(req.param.code));
 
  }
  
 // console.log("fffdfdfdfdfdfdfw \n"+JSON.stringify(req.param.code));
  res.status(200).json({
    status: 'success',
    message: 'Employee Deleted Successfully',
  });
}
});

//get employee data in payroll


exports.getEmployeeData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const employees = await connection.query(
    `SELECT fullNAME EMPLOYEE_NAME, DEPARTMENT_NAME, DESIGNATION_NAME, timestamptostring(DATE_OF_BIRTH), timestamptostring(JOINING_DATE),
GENDER, GROSS_SALARY FROM V_EMPLOYEE_MASTER`
  );
  res.status(200).json({
    status: 'success',
    data: {
      employees,
    },
  });
});

//get attenadance data in pyaroll 

exports.getAttendanceData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const employees = await connection.query(
    `SELECT DESIGNATION,NO_WORKING_HRS, fullname EMPLOYEE_NAME, DEPARTMENT_NAME, TIME_IN, TIME_OUT, timestamptostring(ATTEND_DATE), EMPLOYEE_CODE, STATUS2 FROM V_ATTENDANCE`
  );
  res.status(200).json({
    status: 'success',
    data: {
      employees,
    },
  });
});

