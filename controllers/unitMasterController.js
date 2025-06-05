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
  fs.readFileSync(`${__dirname}/../unitMaster.json`, "utf8")
);
// console.log(jsonData)
// how to get data from postgres database and create a pdf file from it and save it in the folder

const generateCityId = async (client) => {
  //const response = await client.query(`SELECT MAX(BOOKING_CODE) AS MAX FROM SL_TRANS_BOOKING_HDR`);

  //const response1 = await client.query(`SELECT MAX(TO_NUMBER(SUBSTR(BOOKING_CODE,8))) M FROM SL_TRANS_BOOKING_HDR`);
  // const response1=await client.query(`SELECT max(TO_NUMBER(BOOKING_CODE,'"x"99999'))M FROM SL_TRANS_BOOKING_HDR`);
  const response1 = await client.query(
    `SELECT MAX(site_code)M FROM sl_mst_site`
  );
  console.log("ggjhjkkjkj", response1);

  return Number(response1.rows[0].m) + 1;
};

exports.getAllCity = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const city = await client.query(
    `SELECT site_code, site_desc, get_city(city_code) city_name,
    get_state(state_code) state_name, add1 address FROM sl_mst_site where marked is null and company=${req.user.company}`
  );
  res.status(200).json({
    status: "success",
    data: {
      city,
    },
  });
});

exports.getCityData = wrapper(async (req, res, next) => {
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
    query += ` WHERE ${arr[i].uniqueCityIdentifier}='${req.params.code}'`;
    console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.createCity = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  const cityCode = await generateCityId(client); // Generate city code as smallint

  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        // Handle single object insert
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;

        // Iterate over each required field
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field] ) { // Exclude 'country_code'
            fields += `${field}, `;
            if (arr[i].fieldsRequired[field] === "date") {
              values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            } else if (arr[i].fieldsRequired[field] === "number") {
              values += `${obj[field]}, `;
            } else {
              values += `'${obj[field]}', `;
            }
          }
        });

        fields = fields.slice(0, -2); // Remove trailing comma
        values = values.slice(0, -2); // Remove trailing comma

        // Construct and execute the insert query
        const query = `INSERT INTO ${arr[i].tableName} (site_CODE, company, ${fields} ) VALUES (${cityCode}, ${req.user.company}, ${values})`;
        console.log(query);
        await client.query(query);

      } else {
        // Handle array of objects for inserts
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let fields = ``;
          let values = ``;

          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field] && field !== 'country_code') { // Exclude 'country_code'
              fields += `${field}, `;
              if (arr[i].fieldsRequired[field] === "date") {
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === "number") {
                values += `${obj[field]}, `;
              } else {
                values += `'${obj[field]}', `;
              }
            }
          });

          fields = fields.slice(0, -2); // Remove trailing comma
          values = values.slice(0, -2); // Remove trailing comma

          // Construct and execute the insert query
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueAccIdentifier}, ${fields}) VALUES (${cityCode}, ${values})`;
          console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "unit Created Successfully",
  });
});


exports.updateCity = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Com Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
 
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
        
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueCityIdentifier}=${req.params.code}`;
     
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
            console.log(query);
            await client.query(query);
          } else if (obj.PARAM === "DELETE") {
            const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            console.log(query);
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueAccIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;

            console.log(query<"eitiiiiiiiiiiiiiiiii");
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "City Updated Successfully",
  });
});

exports.deleteCity = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the City Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  const tableArray = [
    "sl_mst_distributor"
    
  ]; // List of tables to check

  
  const result = await Promise.all(
    tableArray.map(async (table) => {
      return await client.query(
        `SELECT ref_table('${table}', 'city', '${req.params.code}')`
      );
    })
  );

  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table);

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "City is Already Used",
      isUsed: true,
    });
  } else {
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueCityIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "City Deleted Successfully",
  });
}
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
        query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} order by 2`;
        console.log(query);
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
