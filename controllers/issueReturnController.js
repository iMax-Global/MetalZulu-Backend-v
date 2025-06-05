const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");
//const jimp=require('jimp');

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../issuereturn.json`, "utf8")
);

// const generateOrderId = async (client) => {

//   //const response = await client.query(`SELECT MAX(BOOKING_CODE) AS MAX FROM SL_TRANS_BOOKING_HDR`);

//   //const response1 = await client.query(`SELECT MAX(TO_NUMBER(SUBSTR(BOOKING_CODE,8))) M FROM SL_TRANS_BOOKING_HDR`);
//   // const response1=await client.query(`SELECT max(TO_NUMBER(BOOKING_CODE,'"x"99999'))M FROM SL_TRANS_BOOKING_HDR`);
// //   const response1 = await client.query(`select Voucher_Id_1('2023',to_char(to_date('15-11-2010', 'DD-MM-YYYY'), 'MM'),to_char(to_date('15-11-2010', 'DD-MM-YYYY'), 'DD'),
// //   to_date('15-11-2010', 'DD-MM-YYYY'),1,1 );`);
// //   // console.log("ggjhjkkjkj", response1);

// }

// const AllVoucherId = await client.query(
//     `select Voucher_Id_1(${Year1},('${date}', 'MM'),('${date}', 'DD'),

//       '${date}',1,1,'A' ); `

//     `select Voucher_Id_1('${Year1}',to_char(to_date('${date1}', 'DD-MM-YYYY'), 'MM'),to_char(to_date('${date1}', 'DD-MM-YYYY'), 'DD'),
//     to_date('${date1}', 'DD-MM-YYYY'),1,1,'A' );`

//   );
// // console.log(AllVoucherId);

//  res.status(200).json({
//   status: 'success',
//   data: {
//       getYear,
//       AllVoucherId

//   },
//   });

exports.getAllissues = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const order = await client.query(
    `select timestamptostring(return_date) return_date, issue_code, timestamptostring(issue_date) issue_date, return_code,  get_department(dept_code) Department
      from pur_trans_issue_return_hdr where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

exports.getissueData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Issue Code",
    });
  }

  const data = {};
  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    let query = `SELECT ${arr[i].fieldsRequired} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    query += ` WHERE ${arr[i].uniqueIssueIdentifier}='${req.params.code}'`;
    // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

const getissue = wrapper(async (req, client) => {
  // const client = req.dbConnection;
  //const { site, date, send_status, voucher_type} = req.query;
  // console.log(req);
  // console.log(req);
  // const f_yr= fin_yr(${date});
  // console.log("hudhdhd", date);
  const date1 = date.split("-").reverse().join("-");
  // console.log(date1);
  const getYear = await client.query(`select fin_yr('${date1}'); `);
  const Year1 = getYear.rows[0].fin_yr;
  return Year1;
});

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(return_code from '[0-9]+$') AS INTEGER)) AS M FROM pur_trans_issue_return_HDR`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `R12425-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `R12425-${num}`;
  }
};

// const generateYear = async (client) => {

//     const date1 = await client.query(`select fin_yr('${date}')`);
//     // console.log("ggjhjkkjkj", response1);
//     return date1;

//   }

//const date1=date.split("-").reverse().join("-");
// const generateVoucherId = async (req,client) => {
//     const Year1 = await getVoucherid(req , client);
//     const response1 = await client.query(` select Voucher_Id_1('${Year1}',to_char(to_date('${date1}', 'DD-MM-YYYY'), 'MM'),to_char(to_date('${date1}', 'DD-MM-YYYY'), 'DD'),
//     to_date('${date1}', 'DD-MM-YYYY'),${voucher_type},${site},'${send_status}' )`);
//     // console.log("ggjhjkkjkj", response1);
//     return response1;

//  }

exports.createissue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const issueData = req.body.IssueDetail;
  const issueHeaderData = req.body.IssueReturnHeader[0];
  const retdate = req.body.IssueReturnHeader[0].return_date;
  const openingBalanceCode = await generateReqId(client);
  const formattedIssueDate = issueHeaderData.issue_date
    .split("-")
    .reverse()
    .join("-"); // Convert to YYYY-MM-DD
  const formattedReturnDate = issueHeaderData.return_date
    ? issueHeaderData.return_date.split("-").reverse().join("-")
    : null; // Handle null return date

  console.log("IssueReturnHeader:", formattedReturnDate);

  try {
    await client.query("BEGIN"); // Start transaction

    // Log and execute the header query
    const headerQuery = `
      INSERT INTO pur_trans_issue_return_HDR (
        return_code, return_date, issue_code, issue_date, dept_code, d_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )
    `;
    const headerParams = [
      openingBalanceCode,
      formattedReturnDate,
      issueHeaderData.issue_code,
      formattedIssueDate,
      issueHeaderData.depttcode,
      issueHeaderData.dcccode,
    ];
    console.log("Executing Header Query:", headerQuery);
    console.log("With Parameters:", headerParams);
    await client.query(headerQuery, headerParams);

    for (const row of issueData) {
      // Log and execute the detail query
      const detailQuery = `
        INSERT INTO pur_trans_issue_return_DET (
          item_code, size_code, qualty_code, company_code, uom_code, rate, from_store_code, 
          to_store_code, from_account_code, to_account_code, op_qty, issue_code, return_date, return_code
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
      `;
      const detailParams = [
        row.item_code,
        row.size_code,
        row.quality_code,
        row.uom_code,
        row.cc_code,
        row.rate,
        row.from_store_code,
        row.to_store_code,
        row.from_account_code,
        row.to_account_code,
        row.return_qty,
        row.issue_code,
        formattedReturnDate,
        openingBalanceCode,
      ];
      console.log("Executing Detail Query:", detailQuery);
      console.log("With Parameters:", detailParams);
      await client.query(detailQuery, detailParams);
    }

    await client.query("COMMIT"); // Commit transaction

    res.status(201).json({
      status: "success",
      message: "Data inserted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback transaction on error
    console.error("Error inserting data:", error);
    res.status(500).json({
      status: "error",
      message: "Error inserting data",
      error: error.message,
    });
  }
});

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const ACCOUNT_CODE = await client.query(`SELECT
  h.ISSUE_CODE,
  timestamptostring(h.ISSUE_DATE) date,  -- Use TO_CHAR for formatting dates in PostgreSQL
  h.DEPT_CODE,
  GET_DEPARTMENT(h.DEPT_CODE) AS DEPT_NM,
  h.D_CODE,
  GET_DIVISION(h.D_CODE) AS DIVISION_NM,
  (COALESCE(SUM(d.issued_qty), 0)- COALESCE(SUM(ISU.isqty), 0)) AS qty
FROM
  PUR_TRANS_INGOT_ISSUE_HDR h
JOIN
  pur_trans_ingot_issue d ON h.ISSUE_CODE = d.ISSUE_CODE  -- Explicit JOIN syntax
LEFT JOIN
  (
      SELECT
          d1.issue_code,
          COALESCE(SUM(d1.op_qty), 0) AS isqty
      FROM
          pur_trans_issue_return_det d1
      WHERE
          d1.marked IS NULL
      GROUP BY
          d1.issue_code
  ) AS ISU ON h.ISSUE_CODE = ISU.issue_code
WHERE
  h.MARKED IS NULL
GROUP BY
  h.ISSUE_CODE, h.ISSUE_DATE, h.DEPT_CODE, h.D_CODE
  having (COALESCE(SUM(d.issued_qty), 0)- COALESCE(SUM(ISU.isqty), 0))>0
`);

  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
  });
});

exports.getAdditionalDataofTable = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("fuhiiiiiiiiiiiiiiiiiiiiiiiiii");
  // console.log("fuhiiiiiiiiiiiiiiiiiiiiiiiiii");
  const ACCOUNT_CODE = await client.query(`
  SELECT D.ISSUE_CODE,
  D.ITEM_CODE,
  GET_ITEM(D.ITEM_CODE) AS ITM_NM,
  D.quality_code,
  GET_QUALITY(D.quality_code) AS QUALITY_NM,
  D.SIZE_CODE,
  GET_SIZE(D.SIZE_CODE) AS SIZE_NM,
  D.FROM_STORE_CODE,
  D.TO_STORE_CODE,
  D.FROM_ACCOUNT_CODE,
  D.TO_ACCOUNT_CODE,
  D.QTY,
  D.UOM_CODE,
  GET_UOM(D.UOM_CODE) AS UOM_NM,
  D.RATE, (COALESCE(SUM(d.issued_qty), 0)- COALESCE(SUM(ISU.isqty), 0)) AS qty
FROM PUR_TRANS_INGOT_ISSUE D
JOIN PUR_TRANS_INGOT_ISSUE_HDR H ON H.ISSUE_CODE = D.ISSUE_CODE
LEFT JOIN
(
SELECT
   d1.issue_code,
   COALESCE(SUM(d1.op_qty), 0) AS isqty
FROM
   pur_trans_issue_return_det d1
WHERE
   d1.marked IS NULL
GROUP BY
   d1.issue_code
) AS ISU ON h.ISSUE_CODE = ISU.issue_code
WHERE H.MARKED IS NULL
AND D.MARKED IS NULL
 AND H.ISSUE_CODE = '${req.params.code}'  --------detail
group by D.ISSUE_CODE,
  D.ITEM_CODE,
  D.quality_code,
  D.SIZE_CODE,
  D.FROM_STORE_CODE,
  D.TO_STORE_CODE,
  D.FROM_ACCOUNT_CODE,
  D.TO_ACCOUNT_CODE,
  D.QTY,
  D.UOM_CODE,
  D.RATE
  having (COALESCE(SUM(d.issued_qty), 0)- COALESCE(SUM(ISU.isqty), 0))>0 `);

  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
  });
});

exports.updateissue = wrapper(async (req, res, next) => {
  // console.log("manoj make other controller");
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Issue Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  // // console.log(arr);
  // // console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];

        // console.log(obj);
        // console.log(obj);
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === "date")
              fields += `${field} ('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        // console.log("ddfdfdfdfddfddfddfd");
        // console.log("ddfdfdfdfddfddfddfd");
        const query = `UPDATE ${arr[i].tableName} SET  ${fields} WHERE ${arr[i].uniqueVoucherIdentifier}='${req.params.code}'`;
        // console.log(query);
        await client.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          if (obj.PARAM === "UPDATE") {
            let fields = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                if (arr[i].fieldsRequired[field] === "date")
                  fields += `${field} = VOUCHER_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "number")
                  fields += `${field} = ${obj[field]}, `;
                else fields += `${field} = '${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            // console.log(query);
            await client.query(query);
          } else if (obj.PARAM === "DELETE") {
            const query = `DELETE FROM ${arr[i].tableName} WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            // console.log(query);
            await client.query(query);
          } else {
            let fields = ``;
            let values = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                fields += `${field}, `;
                if (arr[i].fieldsRequired[field] === "date")
                  values += `VOUCHER_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "number")
                  values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueIssueIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Issue Updated Successfully",
  });
});

exports.deleteissue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Voucher Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `Update  ${arr[i].tableName} set marked='D' WHERE ${arr[i].uniqueIssueIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Voucher Deleted Successfully",
  });
});
