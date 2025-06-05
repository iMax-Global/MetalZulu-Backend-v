const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");
const { get } = require("http");
const { max } = require("pg/lib/defaults");

exports.insert_breakDown_data = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("Aman");
  // console.log("Aman");
  //
  const getYear = await client.query(
    `select fin_yr('${req.body.breakdownHeader.Feeding_Date}');`
  );
  // console.log(getYear, 'yearrrrrrrrrrrrrrrrrr' );
  const year = getYear.rows[0].fin_yr;
  // console.log(year,'asgieguacgduofhcdc');
  const maxcode = await client.query(`WITH MaxbreakdownCode AS (

     SELECT COALESCE(MAX(CAST(SUBSTR(code, 8) AS INTEGER)), 0) AS breakdown_code

     FROM BREAKDOWN_Feeding_HDR

    )



     SELECT 'A'||1||'${year}'||'-'||(breakdown_code + 1) AS new_breakdown_code

     FROM MaxbreakdownCode;`);
  // Construct the SQL query
  // console.log(maxcode,'uyygyyyggygy');
  const highstValue = maxcode.rows[0].new_breakdown_code;
  // Assuming req.body.breakdownDetails is an array of objects
  const breakdownDetails = req.body.breakdownDetails;
  console.log(breakdownDetails);

  // Start building the SQL query
  let querydet =
    "INSERT INTO BREAKDOWN_Feeding_DET (code, f_date, from_time, t_date, to_time, solution, reason_code, location_code, no_of_hors, include_speed, company_code, user_code, unit_code, fin_year) VALUES ";

  // Create an array to hold the value sets
  const valueSets = [];

  // Iterate over each breakdown detail and construct the value set
  breakdownDetails.forEach((detail) => {
    const reasonCode = detail.breakdownReason
      ? `'${detail.breakdownReason}'`
      : "NULL";
    const locationCode = detail.location ? `'${detail.location}'` : "NULL";

    // Construct the value set, ensuring that strings are properly enclosed in quotes
    const valueSet = `('${highstValue}', '${detail.f_date}', '${detail.f_time}', '${detail.t_date}', '${detail.t_time}', '${detail.solution}', ${reasonCode}, ${locationCode}, ${detail.breakdownTime}, '${detail.includeInSpeed}' , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;

    valueSets.push(valueSet);
  });

  // Join the value sets with commas
  querydet += valueSets.join(", ") + ";";

  // Now querydet contains the complete SQL insert statement
  // console.log(querydet);
  const queryHdr = `
  INSERT INTO BREAKDOWN_Feeding_HDR (code, Feeding_Date, Remarks,  company_code, user_code, unit_code, fin_year) VALUES ('${highstValue}', '${req.body.breakdownHeader.Feeding_Date}', '${req.body.breakdownHeader.Remarks}', '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')
`;

  try {
    // Execute the SQL query
    console.log(querydet);
    console.log(queryHdr);
    const account = await client.query(querydet);
    const account1 = await client.query(queryHdr);

    // Respond with success message and data
    res.status(200).json({
      status: "success",
      data: {
        account,
      },
    });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to insert data",
      error: err.message, // Optionally include the error message for debugging
    });
  }
});

exports.getAllBRK = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const BREAKDOWN = await client.query(
    `SELECT 
    Code, 
    TO_CHAR(feeding_date, 'DD-MM-YYYY') AS formatted_date, 
    Remarks 
FROM 
    BREAKDOWN_Feeding_HDR 
WHERE 
    marked IS NULL;`
  );

  res.status(200).json({
    status: "success",
    data: {
      BREAKDOWN,
    },
  });
});

exports.getReason = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const reason = await client.query(
    `SELECT reason_code , reason_name from BREAKDOWN_reason_mst where marked IS null`
  );

  const location = await client.query(
    "select location_code , location from location_master"
  );

  res.status(200).json({
    status: "success",
    data: {
      reason,
      location,
    },
  });
});

exports.deleteAccount = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Account Code",
    });
  }
  // console.log("sfdfdfdfdfdf delete");
  await client.query(
    `update BREAKDOWN_Feeding_hdr set marked='D' where code='${req.params.code}'`
  );

  res.status(200).json({
    status: "success",
    message: "Account Deleted Successfully",
  });
});
