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
  fs.readFileSync(`${__dirname}/../DailyIssue.json`, "utf8")
);

// how to get data from postgres database and create a pdf file from it and save it in the folder

// const generateReqId = async (client) => {
//   //const response = await client.query(`SELECT MAX(BOOKING_CODE) AS MAX FROM SL_TRANS_BOOKING_HDR`);

//   //const response1 = await client.query(`SELECT MAX(TO_NUMBER(SUBSTR(BOOKING_CODE,8))) M FROM SL_TRANS_BOOKING_HDR`);
//   // const response1=await client.query(`SELECT max(TO_NUMBER(BOOKING_CODE,'"x"99999'))M FROM SL_TRANS_BOOKING_HDR`);
//   const response1 = await client.query(
//     `SELECT MAX(issue_code)M FROM PUR_TRANS_INGOT_ISSUE_hdr`
//   );
//   // console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(issue_code from '[0-9]+$') AS INTEGER)) AS M FROM PUR_TRANS_INGOT_ISSUE_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `D12425-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `D12425-${num}`;
  }
};

exports.getAllIssue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.user);
  const AllIssue = await client.query(
    `select issue_code, timestamptostring(issue_date)  issue_date, get_employee(emp_cd) employee_name,  req_code, get_department(dept_code) department_name
    from PUR_TRANS_INGOT_ISSUE_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
  res.status(200).json({
    status: "success",
    data: {
      AllIssue,
    },
  });
});

exports.getAllReqHdr = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(
    " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
  );
  const { issue_date, code } = req.query;

  // Log parameters to verify they are being passed
  console.log(issue_date);
  const dateParts = issue_date.split("-");
  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Rearrange to YYYY-MM-DD

  // Log to check the formatted date
  console.log("Formatted issue_date:", formattedDate);

  const AllReq = await client.query(
    `SELECT DISTINCT
    timestamptostring(h.req_date) AS req_date,
    h.req_code,
    h.dept_cd,
    h.emp_cd,
    get_department(h.dept_cd) AS dept,
    d.item_code,
    get_item(d.item_code) AS Item_name,
    d.size_code,
    get_size(d.size_code) AS Size_name,
    d.quality_code,
    get_quality(d.quality_code) AS Grade,
    get_uom(d.uom_code) AS Uom,
    d.uom_code,
    get_cost_center(d.cost_code) AS cost_center,
    d.cost_code,
    d.uniq_id,
    COALESCE(SUM(d.qty), 0) - COALESCE(sum(ISU.isqty), 0) AS qty
FROM
    pur_store_req_hdr h
JOIN
    pur_store_req_det d
    ON h.req_code = d.req_code
LEFT JOIN
    (
        SELECT
            d1.req_code,
            COALESCE(SUM(d1.Issued_qty), 0) AS isqty
        FROM
            pur_trans_ingot_issue d1
        WHERE
            d1.marked IS NULL
        GROUP BY
            d1.req_code
    ) AS ISU
    ON h.req_code = ISU.req_code
WHERE
    h.marked IS NULL
    AND d.marked IS NULL
    AND h.req_date <= '${formattedDate}'
    AND h.req_code <> '${code}'
   
GROUP BY
    h.req_date, h.req_code, h.dept_cd, h.emp_cd,
    d.item_code, d.size_code, d.quality_code, d.uom_code, d.cost_code, d.uniq_id
HAVING
    COALESCE(SUM(d.qty), 0) - COALESCE(sum(ISU.isqty), 0) > 0
ORDER BY
    req_date`
  );
  res.status(200).json({
    status: "success",
    data: {
      AllReq,
    },
  });
});

// exports.getAllReqdata = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;
//   console.log(req.query, "gtgttttttttttttttt");
//   const req2 = await client.query(
//     `SELECT  item_code ,get_item(item_code) Item_name ,size_code, get_size(size_code) Size_name,
//     get_quality(quality_code) Grade, quality_code,
//     no_of_pcs, get_uom(uom_code) Uom, uom_code,
//     qty, get_cost_center(cost_code) cost_center, cost_code, req_code,  uniq_id
//     FROM PUR_STORE_REQ_DET WHERE req_code ='${req.query.req_code}'`
//   );

//   res.status(200).json({
//     status: "success",
//     data: {
//       req2,
//     },
//   });
// });

exports.getAllReqdata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Fetch initial data
  const req2Query = `SELECT d.item_code, get_item(d.item_code) AS Item_name, 
  d.size_code, get_size(d.size_code) AS Size_name,
  get_quality(d.quality_code) AS Grade, d.quality_code,
  d.no_of_pcs, get_uom(d.uom_code) AS Uom, d.uom_code, 
  (coalesce(sum(d.qty),0)-COALESCE(SUM(ISU.isqty)))qty, 
  get_cost_center(d.cost_code)cost_center, d.cost_code, 
  d.req_code, d.uniq_id
FROM PUR_STORE_REQ_DET  d
LEFT JOIN
(
SELECT
   d1.req_code,
   COALESCE(SUM(d1.Issued_qty), 0) AS isqty
FROM
   pur_trans_ingot_issue d1
WHERE
   d1.marked IS NULL
GROUP BY
   d1.req_code
) AS ISU ON d.req_code = ISU.req_code
WHERE d.req_code = '${req.query.req_code}'
group by d.item_code,d.size_code,d.quality_code,d.no_of_pcs,d.uom_code,
d.cost_code ,d.req_code, d.uniq_id
having (coalesce(sum(d.qty),0)-COALESCE(SUM(ISU.isqty)))>0
   `;

  const req2Data = await client.query(req2Query);

  // Check if rows exist
  if (req2Data.rows.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        req2: [],
      },
    });
  }

  // Map rows and calculate `opening_value` for each
  const enrichedData = await Promise.all(
    req2Data.rows.map(async (row) => {
      const { item_code, size_code, quality_code, cost_code } = row;

      // Call stock_with_opbal for each row
      const stockQuery = `
        SELECT stock_with_opbal(
          ${item_code},        -- item
          ${quality_code},     -- quality
          ${size_code},        -- size
          TO_DATE('${req.query.req_date}', 'DD-MM-YYYY'), -- Convert date
          'M',                 -- status1
          '${req.user[0].company_code}', -- company_code
          '${req.user[0].unit_code}',  -- site
          'R',                 -- comp_type
          '1', -- store_code
          '${req.user.finyear}' -- fiscal year
        ) AS opening_value`;
      console.log(stockQuery, "tjjjjjjjjjjjjjjjjjjjjjjerrrrrrrrrrrrr");
      const stockResult = await client.query(stockQuery);
      console.log(stockResult.rows[0]?.opening_value);
      // Add `opening_value` to the row
      return {
        ...row,
        opening_value: stockResult.rows[0]?.opening_value || 0,
      };
    })
  );
  console.log(enrichedData);
  // Send the enriched data as a response
  res.status(200).json({
    status: "success",
    data: {
      req2: enrichedData,
    },
  });
});

exports.getAllReq = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { issue_date, code } = req.query;

  // Format the issue_date
  const dateParts = issue_date.split("-");
  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Convert to YYYY-MM-DD

  // Initial query to fetch data
  const allReqQuery = `SELECT DISTINCT
    timestamptostring(h.req_date) AS req_date,
    h.req_code,
    h.dept_cd,
    h.emp_cd,
    get_department(h.dept_cd) AS dept,
    d.item_code,
    get_item(d.item_code) AS Item_name,
    d.size_code,
    get_size(d.size_code) AS Size_name,
    d.quality_code,
    get_quality(d.quality_code) AS Grade,
    get_uom(d.uom_code) AS Uom,
    d.uom_code,
    get_cost_center(d.cost_code) AS cost_center,
    d.cost_code,
    d.uniq_id,
    COALESCE(SUM(d.qty), 0) - COALESCE(sum(ISU.isqty), 0) AS qty
FROM
    pur_store_req_hdr h
JOIN
    pur_store_req_det d
    ON h.req_code = d.req_code
LEFT JOIN
    (
        SELECT
            d1.req_code,
            COALESCE(SUM(d1.Issued_qty), 0) AS isqty
        FROM
            pur_trans_ingot_issue d1
        WHERE
            d1.marked IS NULL
        GROUP BY
            d1.req_code
    ) AS ISU
    ON h.req_code = ISU.req_code
WHERE
    h.marked IS NULL
    AND d.marked IS NULL
    AND h.req_date <= '${formattedDate}'
    AND h.req_code <> '${code}'
GROUP BY
    h.req_date, h.req_code, h.dept_cd, h.emp_cd,
    d.item_code, d.size_code, d.quality_code, d.uom_code, d.cost_code, d.uniq_id
HAVING
    COALESCE(SUM(d.qty), 0) - COALESCE(sum(ISU.isqty), 0) > 0
ORDER BY
    req_date`;
  console.log(allReqQuery, "ye check ");
  const allReqData = await client.query(allReqQuery);

  // Check if rows exist
  if (allReqData.rows.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        AllReq: [],
      },
    });
  }

  // Enrich data with `stock_with_opbal`
  const enrichedData = await Promise.all(
    allReqData.rows.map(async (row) => {
      const { item_code, size_code, quality_code } = row;

      // Call `stock_with_opbal` function for each row
      const stockQuery = `
        SELECT stock_with_opbal(
          ${item_code},        -- item
          ${quality_code},     -- quality
          ${size_code},        -- size
          '${formattedDate}', -- Convert date
          'M',                 -- status1
          '${req.user[0].company_code}', -- company_code
          '${req.user[0].unit_code}',    -- site
          'R',                 -- comp_type
          '1',                 -- store_code (hardcoded)
          '${req.user.finyear}' -- fiscal year
        ) AS opening_value`;

      const stockResult = await client.query(stockQuery);

      // Add `opening_value` to the row
      return {
        ...row,
        opening_value: stockResult.rows[0]?.opening_value || 0,
      };
    })
  );

  // Send enriched data as a response
  res.status(200).json({
    status: "success",
    data: {
      AllReq: enrichedData,
    },
  });
});

exports.getdailyissueData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Order Code",
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
    query += ` WHERE ${arr[i].uniqueIssueIdentifier}='${req.params.code}' and marked is null`;
    // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  const data = {};
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].lovFields) {
      let query = ``;
      const obj = arr[i].lovFields;
      for (const key in obj) {
        // query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE MARKED IS NULL ORDER BY 2`;
        query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where marked is null and company_code =${req.user.company}`;
        // console.log(query);
        const dbData = await client.query(query);
        data[key] = dbData;
      }
    }
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const hsn1 = await client.query(
    `SELECT hsn, get_uom(item_uom) uom_nm FROM sl_mst_item WHERE  item_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );

  const size = await client.query(
    `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );

  const grade = await client.query(
    `select quality_code, get_quality(quality_code) from  sl_mst_item_qual_det where item_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );
  const uom = await client.query(
    `select item_uom, get_uom(item_uom) from  sl_mst_item where item_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );

  res.status(200).json({
    status: "success",
    data: {
      hsn1,
      size,
      grade,
      uom,
    },
  });
});

exports.createOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  const openingBalanceCode = await generateReqId(client);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            fields += `${field}, `;
            if (arr[i].fieldsRequired[field] === "date")
              values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              values += `${obj[field]}, `;
            else values += `'${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        // const getYear = await client.query(
        //   `select duplicate_account_chk('${item}');`
        // );
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // if (getYear.rows[0].duplicate_account_chk >= "1") {
        //   return res.status(200).json({
        //     status: "fail",
        //     message: "Account Already Exists",
        //   });
        // }
        const query = `INSERT INTO ${arr[i].tableName} (issue_code,  ${fields}, company_code, user_code, unit_code, fin_year, status, company_type) VALUES ('${openingBalanceCode}',  ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', 'M',  'R')`;
        // console.log(query);
        await client.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let fields = ``;
          let values = ``;
          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field]) {
              fields += `${field}, `;
              if (arr[i].fieldsRequired[field] === "date")
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              else if (arr[i].fieldsRequired[field] === "number")
                values += `${obj[field]}, `;
              else values += `'${obj[field]}', `;
            }
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueIssueIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year, status, company_type, issue_date) VALUES ('${openingBalanceCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', 'M',  'R', TO_DATE('${req.body.issueHdr[0].issue_date}', 'DD-MM-YYYY'))`;
          // console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Opening Balance Created Successfully",
  });
});

exports.updateOpening = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Account Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  // const item = req.body.accountHeader[0].account_name;
  // // console.log(item);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === "date")
              fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        // const getYear = await client.query(
        //   `select duplicate_account_chk('${item}');`
        // );
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // if (getYear.rows[0].duplicate_account_chk >= "1") {
        //   return res.status(200).json({
        //     status: "fail",
        //     message: "Account Already Exists",
        //   });
        // }
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueIssueIdentifier}='${req.params.code}'`;
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
                  fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
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
            const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
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
                  values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
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
    message: "Account Updated Successfully",
  });
});

exports.deleteOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
 
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Account Code",
    });
  }
  
  const arr = jsonData.getNdelete.dataSources;
  console.log(arr,"arrrrrrrrrrrrrrrrr");
  
  const tableArray = [
    "pur_trans_issue_return_hdr",
    "pur_trans_issue_return_det",
  ]; // List of tables to check
  
  
  const result = await Promise.all(
    tableArray.map(async (table) => {
      return await client.query(
        `SELECT ref_table_c('${table}', 'issue_code', '${req.params.code}')`
      );
    })
  );
  
  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table_c);
  

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "This record is  Already Tagged",
      isUsed: true,
    });
  } else {
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueIssueIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Account Deleted Successfully",
  });
}
});




exports.OpeningValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const {
    item_code,
    quality_code,
    size_code,
    stock_date,
    store_code,
    quantity,
  } = req.query;

  // console.log("Item:", item_code);
  // console.log("Item:", item_code);
  // console.log("Item:", item_code);
  // console.log("Item:", item_code);
  // // console.log("Item:", item_code);
  // // console.log("Item:", item_code);

  // console.log(req.user.finyear);
  var year = req.user.finyear;
  var comany_code = req.user[0].company_code;
  var site = req.user[0].unit_code;

  const OpenningValue = await client.query(
    `select stock_with_opbal(
      ${item_code}, -- item
      ${quality_code}, -- quality
      ${size_code}, -- sz
      TO_DATE('${stock_date}', 'DD-MM-YYYY'),  -- Convert the date string to a proper date
      'M', -- status1 (hard-coded)
      ${comany_code}, -- comp_code
      ${site}, -- site
      'R', -- comp_type (hard-coded)
      '${store_code}', -- store_c
      '${year}' -- f_yr
    )`
  );

  res.status(200).json({
    status: "success",
    data: {
      OpenningValue,
    },
  });
});

const pdfmake = wrapper(async (req, res, str) => {
  const issue_code = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", issue_code);
  try {
    const client = req.dbConnection;
    const headerQuery = `
      SELECT p.issue_code, p.ISSUE_date, get_department(p.dept_code) as department,
             get_division(p.d_code) as division, p.REQ_CODE as requisition_code
      FROM PUR_TRANS_INGOT_ISSUE_hdr p
      WHERE p.marked IS NULL AND company_code = 1 AND unit_code = 1 AND p.issue_code = $1;
    `;

    const headerResult = await client.query(headerQuery, [issue_code]);

    // Query for detail based on issue_code
    const detailQuery = `
      SELECT get_item(h.item_code) as item_name, get_quality(h.QUALITY_CODE) as quality,
             get_size(h.SIZE_CODE) as size_name, get_uom(h.UOM_CODE) as uom,
             get_cost(h.cost_CODE) as cost_desc, h.qty
      FROM PUR_TRANS_INGOT_ISSUE h
      WHERE h.marked IS NULL AND company_code = 1 AND unit_code = 1 AND h.issue_code = $1;
    `;

    const address = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
        FROM sl_mst_site where marked is null and company=1
        and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name,state FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );

    const detailResult = await client.query(detailQuery, [issue_code]);

    // Check if any data exists for the provided issue_code
    if (headerResult.rows.length === 0) {
      return res
        .status(404)
        .json({ msg: "No data found for the provided issue code" });
    }

    // Send the results as a response
    res.json({
      header: headerResult.rows[0], // Assuming there is one header per issue_code
      details: detailResult.rows,
      address: address.rows[0],
      company: company.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

exports.downloadPDF = async (req, res, next) => {
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};
