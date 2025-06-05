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
  fs.readFileSync(`${__dirname}/../dailyProd.json`, "utf8")
);

// how to get data from postgres database and create a pdf file from it and save it in the folder

// const generateReqId = async (client) => {
//   //const response = await client.query(`SELECT MAX(BOOKING_CODE) AS MAX FROM SL_TRANS_BOOKING_HDR`);

//   //const response1 = await client.query(`SELECT MAX(TO_NUMBER(SUBSTR(BOOKING_CODE,8))) M FROM SL_TRANS_BOOKING_HDR`);
//   // const response1=await client.query(`SELECT max(TO_NUMBER(BOOKING_CODE,'"x"99999'))M FROM SL_TRANS_BOOKING_HDR`);
//   const response1 = await client.query(
//     `SELECT MAX(ssh_code)M FROM SL_STOCK_STATUS_HDR`
//   );
//   // console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(ssh_code from '[0-9]+$') AS INTEGER)) AS M FROM SL_STOCK_STATUS_HDR`
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

exports.getAllRequisition = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Construct the query strin
  // console.log(req.user);
  const query = `
    SELECT ssh_code prod_code, 
           timestamptostring(stock_date) AS  prod_date, 
           parse_time_string(from_time::VARCHAR) AS from_time, 
           parse_time_string(to_time::VARCHAR) AS to_time 
    FROM SL_STOCK_STATUS_HDR 
    WHERE MARKED IS NULL and
    company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}
  `;

  // Log the constructed query
  // console.log("SQL Query:", query);

  // Execute the query
  const Requisition = await client.query(query);

  // Log the query result
  console.log("Query Result:", Requisition);

  // Send the response
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
  // // console.log(req.body);
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

exports.getRate = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // // console.log(req.body);
  // console.log(req.body);
  const rate = await client.query(
    `SELECT  rate_per_unit FROM pur_mst_meter WHERE  meter_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );

  const preading = await client.query(
    `select COALESCE(max(current_reading),0) reading from T_ELECTRICITY_CONS_det where marked is null
    and METER_no=${req.params.code} and prod_type ='R';`
  );
  res.status(200).json({
    status: "success",
    data: {
      rate,
      preading,
    },
  });
});

exports.createOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  const dailyProdCode = await generateReqId(client);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            fields += `${field}, `;
            if (arr[i].fieldsRequired[field] === "date") {
              // Handle just the date
              values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            } else if (arr[i].fieldsRequired[field] === "datetime") {
              // Handle date-time format
              values += `TO_TIMESTAMP('${obj[field]}', 'DD-MM-YYYY HH24:MI:SS'), `;
            } else if (arr[i].fieldsRequired[field] === "number") {
              values += `${obj[field]}, `;
            } else {
              values += `'${obj[field]}', `;
            }
          }
        });
        fields = fields.slice(0, -2);
        values = values.slice(0, -2);

        const query = `INSERT INTO ${arr[i].tableName} (ssh_code,  ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${dailyProdCode}',  ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
        console.log(query); // Log the query
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
              if (arr[i].fieldsRequired[field] === "date") {
                // Handle just the date
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === "datetime") {
                // Handle date-time format
                values += `TO_TIMESTAMP('${obj[field]}', 'DD-MM-YYYY HH24:MI:SS'), `;
              } else if (arr[i].fieldsRequired[field] === "number") {
                values += `${obj[field]}, `;
              } else {
                values += `'${obj[field]}', `;
              }
            }
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year, prod_type, stock_date) VALUES ('${dailyProdCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', 'R', TO_Date('${req.body.prodHdr[0].stock_date}', 'DD-MM-YYYY'))`;
          console.log(query); // Log the query
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
  console.log("req.body form daily production",req.body)
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
            if (arr[i].fieldsRequired[field] === "date") {
              // Handle just the date
              field += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            } else if (arr[i].fieldsRequired[field] === "datetime") {
              // Handle date-time format
              field += `TO_TIMESTAMP('${obj[field]}', 'DD-MM-YYYY HH24:MI:SS'), `;
            } else if (arr[i].fieldsRequired[field] === "number")
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
        console.log(query);
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

exports.deleteprod = wrapper(async (req, res, next) => {
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

exports.prodValue = wrapper(async (req, res, next) => {
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

  res.status(200).json({
    status: "success",
    data: {
      prodValue,
    },
  });
});
