const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { Console } = require("console");


exports.getAllTables = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const tables = await client.query(`SELECT * FROM DYN_PAYROLL_MISC_DATA1`);
  res.status(200).json({
    status: "success",
    data: {
      tables,
    },
  });
});



exports.getTableData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  console.log(`SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}' and company_code='${req.user.company}' ye hi h`);
  const table = await client.query(
    `SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}'`
  );
  //and company_code='${req.user.company}'
  console.log("manoj");
  if (!table.rows[0]) {
    return res.status(404).json({
      status: "fail",
      message: "The table does not exist",
    });
  }
  console.log("manoj");
  console.log(table.rows[0].ROW_IDENTIFIER,"uuuuuuuuuuuuuu");
  console.log(table);
  let query = `SELECT ${table.rows[0].row_identifier}, ${
    table.rows[0].required_fields || table.rows[0].table_fields
  } FROM ${table.rows[0].table_name}  `;
  console.log(query);

  if (table.rows[0].left_joiner) {
    query += ` ${table.rows[0].left_joiner} where ${table.rows[0].marked} and company_code='${req.user.company}'`;
  } 

  else query += `where ${table.rows[0].marked} and company_code='${req.user.company}'`;
  console.log(query);
  const tableData = await client.query(query);
  const obj = {};
  if (table.rows[0].master_lists) {
    const masterLists = table.rows[0].master_lists.split(", ");
    console.log(masterLists);

    const masterFields = table.rows[0].master_fields.split("; ");
    console.log(masterFields);
    for (let i = 0; i < masterLists.length; i++) {
      if (masterLists[i] === "#") {
        obj[i] = [];
      } else {
        console.log(`SELECT ${masterFields[i]} FROM ${masterLists[i]}`);
        const data = await client.query(
          `SELECT ${masterFields[i]} FROM ${masterLists[i]}`
        );
        obj[i] = data.rows;
      }
    }
  }

  console.log("tableData \n" + JSON.stringify(tableData));
  console.log("table.rows[0] \n" + JSON.stringify(table.rows[0]));
  console.log("obj \n" + JSON.stringify(obj));

  tableData.rows.map((row) => {
    // console.log("row \n" + JSON.stringify((msToTime(new Date(row.IN_TIME)))));
    row.IN_TIME = msToTime(row.IN_TIME);
    row.TIME_OUT = msToTime(row.TIME_OUT);
  });

  res.status(200).json({
    status: "success",
    data: {
      tableData,
      tableHeader: table.rows[0],
      obj,
    },
  });
});



exports.createRow = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.params.slug,"req param slug is this ");
  console.log(`SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}'`)
  const table = await client.query(
    `SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}'`
  );

  if (!table.rows[0]) {
    return res.status(404).json({
      status: "fail",
      message: "The table does not exist",
    });
  }
 console.log(`SELECT MAX(${table.rows[0].row_identifier}) AS MAX FROM ${table.rows[0].table_name}`)
  let max = await client.query(
    `SELECT MAX(${table.rows[0].row_identifier}) AS MAX FROM ${table.rows[0].table_name}`
  );
  max = Number(max.rows[0].max) + 1;

  let values = ``;
  const fieldsArr = table.rows[0].table_fields.split(", ");
  const fieldTypes = table.rows[0].input_type.split(", ");
  fieldsArr.forEach((field, index) => {
    if (fieldTypes[index] === "Date")
      values += `TO_DATE('${req.body[field]}', 'DD-MM-YYYY HH24:MI:SS'), `;
    else if (typeof req.body[field] === "number")
      values += `${req.body[field]}, `;
    else values += `'${req.body[field]}', `;
  });
  values = values.split(`'undefined'`).join(null);
  values = values.split(`'null'`).join(null);
  values = values.slice(0, -2);
  //by vandna
  console.log(`select count(*) from ${table.rows[0].table_name} where UPPER(${table.rows[0].table_fields})=UPPER(${values})
  and ${table.rows[0].marked}`, "6777777777777777777777777777777777777777")
  const getYear = await client.query(
    `select count(*) from ${table.rows[0].table_name} where UPPER(${table.rows[0].table_fields})=UPPER(${values})
    and ${table.rows[0].marked} and company_code='${req.user.company}';`
  );
 
  // console.log(getYear.rows[0].duplicate_item_chk == "1");
  if (getYear.rows[0].count >= "1") {
    return res.status(200).json({
      status: "fail",
      message: "This is Already Exists",
    });
  }

  // const duplicateCheckResult = await client.query(
  //   `select count(*)  from ${table.rows[0].table_name} where UPPER(${table.rows[0].table_fields})=UPPER(${values}) and marked is null`
  // );
  // console.log(duplicateCheckResult, "gggfggfg");
  // const count = duplicateCheckResult.rows[0].count;

  // if (error) {
  //   //   // If count is greater than 0, a duplicate exists
  //   return res.status(400).json({
  //     status: "error",
  //     message: "Manoj data found. Cannot insert duplicate data.",
  //   });
  // }
  //else {
    console.log("manoj88888");
  console.log("manoj88888", req.user[0]);
  console.log(`INSERT INTO ${table.rows[0].table_name} (${table.rows[0].row_identifier}, ${table.rows[0].table_fields},  company_code, user_code, unit_code) VALUES (${max}, ${values},  '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}'`)
  // console.log("manoj", ttt);
  await client.query(
    `INSERT INTO ${table.rows[0].table_name} (${table.rows[0].row_identifier}, ${table.rows[0].table_fields},  company_code, user_code, unit_code) VALUES (${max}, ${values},  '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`
  );
  res.status(200).json({
    status: "success",
    message: "Data Inserted Successfully",
  });
  //}
});



exports.updateRow = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const table = await client.query(
    `SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}'`
  );

  if (!table.rows[0]) {
    return res.status(404).json({
      status: "fail",
      message: "The table does not exist",
    });
  }
  if (!req.query.identifier) {
    return res.status(404).json({
      status: "fail",
      message: "Please Specify a Unique Identifier",
    });
  }
  console.log(req.body, "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
  // const val = Object.keys(req.body)[0];
  // console.log(val);
  const firstKey = Object.keys(req.body)[0];

  // Use the first key to get its value
  const countryName = req.body[firstKey];

  console.log(countryName);
  let fields = ``;
  const fieldTypes = table.rows[0].input_type.split(", ");
  if (req.body) {
    Object.keys(req.body).forEach((key, index) => {
      if (fieldTypes[index] === "Date")
        fields += `${key} = TO_DATE('${req.body[key]}', 'DD-MM-YYYY HH24:MI:SS'), `;
      else if (typeof req.body[key] === "number")
        fields += `${key} = ${req.body[key]}, `;
      else fields += `${key} = '${req.body[key]}', `;
    });
    fields = fields.slice(0, -2);
  }
  // console.log(values);

  const getYear = await client.query(
    `select count(*) from ${table.rows[0].table_name} where UPPER(${table.rows[0].table_fields})=UPPER('${countryName}')
    and ${table.rows[0].row_identifier}<>${req.query.identifier} and ${table.rows[0].marked} and company_code='${req.user.company}';`
  );
  console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
  // console.log(getYear.rows[0].duplicate_item_chk == "1");
  if (getYear.rows[0].count >= "1") {
    return res.status(200).json({
      status: "fail",
      message: "This is Already Exists",
    });
  }

  await client.query(
    `UPDATE ${table.rows[0].table_name} SET ${fields} WHERE ${table.rows[0].row_identifier}=${req.query.identifier}`
  );
  res.status(200).json({
    status: "success",
    message: "Data Updated Successfully",
  });
});



exports.deleteRow = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log("manoj");
  const table = await client.query(
    `SELECT * FROM DYN_PAYROLL_MISC_DATA1 WHERE SLUG='${req.params.slug}'`
  );
  console.log("saun");
  if (!table.rows[0]) {
    return res.status(404).json({
      status: "fail",
      message: "The table does not exist",
    });
  }
  if (!req.query.identifier) {
    return res.status(404).json({
      status: "fail",
      message: "Please Specify a Unique Identifier",
    });
  }

  await client.query(
    `UPDATE  ${table.rows[0].table_name}  SET MARKED='d' WHERE  ${table.rows[0].row_identifier}=${req.query.identifier}`
    //  `DELETE FROM ${table.rows[0].TABLE_NAME} WHERE ${table.rows[0].ROW_IDENTIFIER}=${req.query.identifier}`
  );
  res.status(200).json({
    status: "success",
    message: "Row Deleted Successfully",
  });
});



function msToTime(duration) {
  hours = new Date(Date.parse(duration)).getHours();
  minutes = new Date(Date.parse(duration)).getMinutes();
  // seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes;
}

