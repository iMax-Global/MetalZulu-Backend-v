/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../dealerMaster.json`, "utf8")
);

const generateDealerId = async (dealerCode, tableName, client) => {
  // console.log("mamamamaammama");
  const response = await client.query(`SELECT MAX(${dealerCode}) AS MAX FROM ${tableName}`
  );
  // console.log(response, "rerrr");
  return response.rows[0].max + 1;
};

exports.getAlldealers = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const dealers = await client.query(
    `SELECT EXTERNAL_ENTITY_CODE dealer_code, EXTERNAL_ENTITY_NAME Dealer, GROUP_NAME, ENTITY_TYPE_NM type, ADDRESS, CITY, PAN_NO, PIN_NO FROM VW_DEALER_MST where  company_code= ${req.user.company}  order by EXTERNAL_ENTITY_CODE `
  );
  res.status(200).json({
    status: "success",
    data: {
      dealers,
    },
  });
});

exports.getdealerData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Dealer Code",
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
    query += ` WHERE ${arr[i].uniqueDealerIdentifier}='${req.params.code}' and marked is null`;
     console.log(query);
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
      const obj = arr[i].lovFields;
      for (const key in obj) {
        let query = '';

        if (key === "EXTERNAL_ENTITY_GROUP_CODE") {
          // Do NOT filter by company_code
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE marked IS NULL ORDER BY 2`;
        } else {
          // Default: filter by company_code
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE marked IS NULL AND company_code = ${req.user.company} ORDER BY 2`;
        }

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


exports.createdealer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
   
  const arr = jsonData.createNupdate.fieldNames;
  const dealername = req.body.dealerMaster[0].external_entity_name;
  console.log(req.body.customerDetails[0].distributor_code,"req.body from minierp");
  const dealerCode = await generateDealerId(
    arr[0].uniqueDealerIdentifier,
    arr[0].tableName,
    client
  );
 
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
        const dealer = await client.query(
          `select count(*) from sl_mst_external_entity where UPPER(external_entity_name)=UPPER('${dealername}') and marked is null;`
        );
        // console.log(dealer.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(dealer.rows[0], "dgjejygdejydhejdyejdhejde");
        if (dealer.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Dealer Already Exists",
          });
        }
        const query = `INSERT INTO ${arr[i].tableName} (EXTERNAL_ENTITY_CODE, ${fields} , company_code, user_code, unit_code) VALUES ('${dealerCode}', ${values},  '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueDealerIdentifier}, ${fields}, company_code, user_code, unit_code) VALUES ('${dealerCode}', ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
          // console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Dealer Created Successfully",
  });
});

exports.updateDealer = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Dealer Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  console.log(req.body.dealerMaster[0]);
  const dealername = req.body.dealerMaster[0].external_entity_name;

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

        const dealer = await client.query(
          `select count(*) from sl_mst_external_entity where UPPER(external_entity_name)=UPPER('${dealername}') 
          and external_entity_code<> ${req.params.code} and marked is null;`
        );
        console.log(dealer.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(dealer.rows[0], "dgjejygdejydhejdyejdhejde");
        if (dealer.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Dealer Already Exists",
          });
        }
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueDealerIdentifier}=${req.params.code}`;
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
            console.log(query);
            await client.query(query);
          } else if (obj.PARAM === "DELETE") {
            const query = `UPDATE ${arr[i].tableName} SET MARKED='D'  WHERE ${
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueDealerIdentifier}, ${fields},  company_code, user_code, unit_code) VALUES ('${req.params.code}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
            console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Dealer Updated Successfully",
  });
});

// exports.deleteDealer = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;
//   if (!req.params.code) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Please specify the Dealer Code",
//     });
//   }
//   const arr = jsonData.getNdelete.dataSources;
//   const tableArray = [
//     "sl_trans_booking_hdr",
//     "sl_trans_invoice_hdr",
//     "sl_trans_sale_return_hdr",
//     "sl_trans_sauda_hdr"
//   ]; // List of tables to check

//   const result = await Promise.all(
//     tableArray.map(async (table) => {
//       return await client.query(
//         `SELECT ref_table('${table}', 'dealer_code', '${req.params.code}')`
//       );
//     })
//   );

//   // Check if any table returned false (indicating the item is already used)
//   const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table);

//   if (isAnyTableUsed) {
//     // If any table returns false, the item is already used
//     return res.status(200).json({
//       status: "success",
//       message: "Dealer is Already Tagged",
//       isUsed: true,
//     });
//   }else {
//   for (let i = 0; i < arr.length; i++) {
//     await client.query(
//       `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueDealerIdentifier}='${req.params.code}'`
//     );
//   }

//   res.status(200).json({
//     status: "success",
//     message: "Dealer Deleted Successfully",
//   });
// }
// });
// dealer_name

exports.deleteDealer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Dealer Code",
    });
  }

  const arr = jsonData.getNdelete.dataSources;

  // List of tables to check with their specific column names
  const tableArray = [
    { tableName: "sl_trans_booking_hdr", columnName: "dealer_name" },
    { tableName: "sl_trans_invoice_hdr", columnName: "dealer_code" },
  ];

  const result = await Promise.all(
    tableArray.map(async ({ tableName, columnName }) => {
      return await client.query(
        `SELECT ref_table('${tableName}', '${columnName}', '${req.params.code}')`
      );
    })
  );

  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table);

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Dealer Already Used",
      isUsed: true,
    });
  } else {
    // If all tables return true, proceed to delete the item
    for (let i = 0; i < arr.length; i++) {
      await client.query(
        `UPDATE ${arr[i].tableName} SET marked='D' WHERE ${arr[i].uniqueDealerIdentifier}='${req.params.code}'`
      );
    }

    // Send success response and return to avoid further execution
    return res.status(200).json({
      status: "success",
      message: "Dealer Deleted Successfully",
      isUsed: false,
    });
  }
});
