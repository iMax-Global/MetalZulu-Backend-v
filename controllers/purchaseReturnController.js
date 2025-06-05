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
  fs.readFileSync(`${__dirname}/../purchasereturn.json`, "utf8")
);

// how to get data from postgres database and create a pdf file from it and save it in the folder

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(preturn_code from '[0-9]+$') AS INTEGER)) AS M FROM pur_purchase_return_hdr`
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

// const generateReqId = async (client) => {
//   const response1 = await client.query(
//     `SELECT MAX(mrir_code)M FROM pur_purchase_return_hdr`
//   );
//   // console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

exports.getAllRequisition = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const Requisition = await client.query(
    `select mrir_code, timestamptostring(mrir_date)mrir_date ,truck_no,remarks, preturn_code, timestamptostring(preturn_date)mrir_date, get_party(party_code) vendor from pur_purchase_return_hdr where marked is null  and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

exports.getReqData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the MRIR Code",
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
    query += ` WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}' and marked is null`;
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

  const ACCOUNT_CODE = await client.query(
    // `select truck_no,  timestamptostring(BILL_DATE) BILL_DATE, MRIR_CODE,
    //  timestamptostring(mrir_date) mrir_date, deal_code, get_dealtype(deal_code) deal_type, remarks, bill_no,
    //   party_code, get_party(party_code) vendor from pur_mrir_hdr where marked is
    `SELECT
    H.truck_no,
    timestamptostring(H.BILL_DATE) AS BILL_DATE,
    H.MRIR_CODE,
    timestamptostring(H.mrir_date) AS MRIR_DATE,
    H.deal_code,
    get_dealtype(H.deal_code) AS deal_type,
    H.remarks,
    H.bill_no,
    H.party_code,
    get_party(H.party_code) AS vendor,
    (COALESCE(SUM(D.total_qty), 0) - COALESCE(SUM(SI.return_qty), 0)) AS pending_qty
FROM
    pur_mrir_hdr H
JOIN (
    -- Aggregate total_qty for each MRIR_CODE
    SELECT 
        MRIR_CODE,
        SUM(total_qty) AS total_qty
    FROM 
        pur_mrir_det
    WHERE
        marked IS NULL
    GROUP BY 
        MRIR_CODE
) D ON H.MRIR_CODE = D.MRIR_CODE
LEFT JOIN (
    -- Aggregate return_qty for each MRIR_CODE
    SELECT 
        MRIR_CODE,
        SUM(COALESCE(ret_net_wt, 0)) AS return_qty
    FROM 
        pur_purchase_return_det
    WHERE
        marked IS NULL
    GROUP BY 
        MRIR_CODE
) SI ON H.MRIR_CODE = SI.MRIR_CODE
WHERE
    H.marked IS NULL
     and h.company_code=${req.user.company} and h.unit_code=${req.user.unit} and h.fin_year ='${req.user.finyear}'
GROUP BY
    H.truck_no,
    H.BILL_DATE,
    H.MRIR_CODE,
    H.mrir_date,
    H.deal_code,
    H.remarks,
    H.bill_no,
    H.party_code
HAVING
    (COALESCE(SUM(D.total_qty), 0) - COALESCE(SUM(SI.return_qty), 0)) > 0
     `
  );

  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
  });
});

exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const hsn1 = await client.query(
    `SELECT hsn FROM sl_mst_item WHERE  item_code=${req.params.code}`
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

exports.getitemDetail = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const item = await client.query(
    `select get_item(ITEM_CODE) item_name,unique_code, mrir_code, received_qty,item_code, get_size(size_code) size_name , size_code,no_pcs,get_quality(quality_code) grade , quality_code
    from pur_mrir_det 
WHERE
    MARKED IS NULL  and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code =${req.user.unit}
    AND MRIR_CODE = COALESCE('${req.params.code}';)
`
  );

  res.status(200).json({
    status: "success",
    data: {
      item,
    },
  });
});

exports.getAdditionalDataofTable = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("fuhiiiiiiiiiiiiiiiiiiiiiiiiii");
  // console.log("fuhiiiiiiiiiiiiiiiiiiiiiiiiii");
  const ACCOUNT_CODE = await client.query(
    //     `
    // //   select get_item(ITEM_CODE) item_name,unique_code,rate, mrir_code, total_qty,item_code, get_size(size_code) size_name , size_code,no_pcs,get_quality(quality_code) grade , quality_code
    // //     from pur_mrir_det
    // // WHERE
    // //     marked is null
    `SELECT
    get_item(d.ITEM_CODE) item_name,d.unique_code, d.mrir_code,d.item_code,
    get_size(d.size_code) size_name ,
    d.size_code,d.no_pcs,get_quality(d.quality_code) grade , d.quality_code,d.unique_code , d.rate,
    (coalesce(d.total_qty,0)-coalesce(SI.return_qty,0))total_qty
FROM
    pur_mrir_det d
    left join
    ( select sum(coalesce(ret_net_wt,0))return_qty,mrir_code,mrir_uniq from pur_purchase_return_det
    where marked is null
  group by mrir_code,mrir_uniq)SI ON d.mrir_code = SI.mrir_code and d.unique_code=SI.mrir_uniq
WHERE
    d.marked IS null and d.company_code= ${req.user.company} and d.unit_code=${req.user.unit} and d.fin_year= '${req.user.finyear}' 
    
 
    AND d.MRIR_CODE ='${req.params.code}'
    and (coalesce(d.total_qty,0)-coalesce(SI.return_qty,0))>0`
  );

  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
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
        const query = `INSERT INTO ${arr[i].tableName} (Rq_code,  ${fields}) VALUES ('${openingBalanceCode}',  ${values})`;
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}) VALUES ('${openingBalanceCode}', ${values})`;
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
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`;
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
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
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Account Deleted Successfully",
  });
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

exports.createissue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const issueData = req.body.purreqDetail;
  const issueHeaderData = req.body.poHdr[0];
  // const uniquePreturnCode = generateUniquePreturnCode();
  const uniquePreturnCode = await generateReqId(client);
  // Function to format date from 'dd-MM-yyyy' to 'yyyy-MM-dd'
  const formatDateString = (dateString) => {
    const [day, month, year] = dateString.split("-");
    return `${year}-${month}-${day}`; // 'yyyy-MM-dd' format
  };

  // Format header dates
  const mrir_date = formatDateString(issueHeaderData.mrir_date);
  const bill_date = formatDateString(issueHeaderData.bill_date);
  const preturn_date = formatDateString(issueHeaderData.preturn_date);

  try {
    await client.query("BEGIN"); // Start transaction

    // Insert into pur_purchase_return_hdr
    const insertHdrQuery = `
        INSERT INTO pur_purchase_return_hdr (
          truck_no, remarks, party_code, mrir_date, bill_date, bill_no, 
          preturn_date, dealtype_cd, preturn_code, mrir_code, 
          company_code, user_code, unit_code, fin_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;
    const hdrParams = [
      issueHeaderData.truck_no,
      issueHeaderData.remarks,
      issueHeaderData.party_code,
      mrir_date,
      bill_date,
      issueHeaderData.bill_no,
      preturn_date,
      issueHeaderData.dealtype_cd,
      uniquePreturnCode,
      issueHeaderData.mrir_code,
      req.user.company,
      req.user[0].spec_code,
      req.user.unit,
      req.user.finyear,
    ];
    await client.query(insertHdrQuery, hdrParams);

    // Insert into pur_purchase_return_det for each item in issueData
    for (const row of issueData) {
      const insertDetQuery = `
        INSERT INTO pur_purchase_return_det (
          item_code, size_code, quality_code, net_rate, preturn_date, 
          return_pcs, ret_net_wt, no_pcs, amount, remark, 
          preturn_code, company_code, user_code, unit_code, fin_year, mrir_code, mrir_uniq
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `;
      const detParams = [
        row.item_code,
        row.size_code,
        row.quality_code,
        row.rate,
        preturn_date,
        row.return_pcs,
        row.return_wt,
        row.no_pcs,
        row.amount,
        row.remark,
        uniquePreturnCode,
        req.user.company,
        req.user[0].spec_code,
        req.user.unit,
        req.user.finyear,
        row.mrir_code,
        row.unique_code,
      ];
      await client.query(insertDetQuery, detParams);
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

exports.deleteReturn = wrapper(async (req, res, next) => {
  // console.log("hi");
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Sales contract Code",
    });
  }

  await client.query(
    `Update pur_purchase_return_hdr SET MARKED='D' WHERE  preturn_code='${req.params.code}'`
  );

  await client.query(
    `Update pur_purchase_return_det SET MARKED='D' WHERE  preturn_code='${req.params.code}'`
  );

  res.status(200).json({
    status: "success",
    message: "Sales Contract Deleted Successfully",
  });
});
