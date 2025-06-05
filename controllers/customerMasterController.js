/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../customerMasterData.json`, "utf8")
);

const generateCustomerId = async (customerCode, tableName, client) => {
  const response = await client.query(
    `SELECT MAX(${customerCode}) AS MAX FROM ${tableName}`
  );
  return response.rows[0].max + 1;
};

const generateAccId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(account_code)M FROM fin_mst_account`
  );

  return Number(response1.rows[0].m) + 1;
};

exports.getAllCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const customer = await client.query(
    `SELECT DISTRIBUTOR_CODE customer_code, DISTRIBUTOR_NAME customer_name,  ACCOUNT_GROUP,   ADDRESS,  CITY,   GST_NO FROM VW_CUSTOMER_MST where company_code= ${req.user.company}`
  );
  res.status(200).json({
    status: "success",
    data: {
      customer,
    },
  });
});

exports.getAccGroup = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const ACC_GROUP_CODE = await client.query(
    `SELECT ACCOUNT_CODE, ACCOUNT_NAME FROM FIN_MST_ACCOUNT`
  );
  res.status(200).json({
    status: "success",
    data: {
      ACC_GROUP_CODE,
    },
  });
});

exports.getCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Item Code",
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
    query += ` WHERE ${arr[i].uniqueCustomerIdentifier}='${req.params.code}' and marked is null`;
    // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

// exports.getAdditionalData = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//   const arr = jsonData.createNupdate.fieldNames;
//   const data = {};
//   for (let i = 0; i < arr.length; i++) {
//     if (arr[i].lovFields) {
//       let query = ``;
//       const obj = arr[i].lovFields;
//       for (const key in obj) {
//         query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where marked is null and company_code =${req.user.company} order by 2`;
//         console.log(query);
//         const dbData = await client.query(query);
//         data[key] = dbData;
//       }
//     }
//   }

//   res.status(200).json({
//     status: "success",
//     data,
//   });
// });


exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  const data = {};

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].lovFields) {
      const obj = arr[i].lovFields;
      for (const key in obj) {
        let query = ``;
        if (key === "ACC_GROUP_CODE" || key==="EXT_ENTITY_TYPE_CODE") {
          // Don't filter by company_code
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE marked IS NULL ORDER BY 2`;
        } else {
          // Default with company_code filter
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




exports.createCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.body, "req body dal de");
  const arr = jsonData.createNupdate.fieldNames;
  // console.log(arr, "arrrrrrrr");
  const item = req.body.customerMaster[0].distributor_name;
  // console.log(item);
  const customerCode = await generateCustomerId(
    arr[0].uniqueCustomerIdentifier,
    arr[0].tableName,
    client
  );

  const accountCode = await generateAccId(client);

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
        const getYear = await client.query(
          `select count(*) from sl_mst_distributor where UPPER(distributor_name)=UPPER('${item}') and marked is null;`
        );
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Customer Already Exists",
          });
        }
        // const Dealer_code = await client.query(
        //   `select EXTERNAL_ENTITY_CODE from sl_mst_dealer_dist_det where DISTRIBUTOR_CODE='${customerCode}' and MARKED is null and
        //   COMPANY_CODE='${req.user.company}'`
        // );
        // console.log(Dealer_code, "delarrrr");
        await client.query(
          `insert into fin_mst_account (account_code,  account_name, ACCOUNT_TYPE,  company_code, user_code, unit_code) values( ${accountCode},  '${req.body.customerMaster[0].distributor_name}' , 'A',  '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`
        );
        const uni = await client.query(
          `select uniq_code from fin_mst_account where account_type ='G' and group_code='${req.body.customerMaster[0].acc_group_code}'`
        );

        console.log(uni.rows[0].uniq_code, "this is");
        await client.query(
          `update fin_mst_account set parent_group =${uni.rows[0].uniq_code}, group_code='${req.body.customerMaster[0].acc_group_code}' where account_code=${accountCode}`
        );

        const query = `INSERT INTO ${arr[i].tableName} (DISTRIBUTOR_CODE, account_code, ${fields}, company_code, user_code, unit_code) VALUES ('${customerCode}', ${accountCode}, ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
        console.log(query);
        await client.query(query);
      } else {
        // console.log(i, "iiiii");

        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          // console.log(j, "jjjjj");
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
          // Check if fields and values are not empty
          if (fields && values) {
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueCustomerIdentifier}, ${fields}, company_code, user_code, unit_code) VALUES ('${customerCode}', ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
            console.log(query);
            await client.query(query);
          } else {
            console.log(
              `Skipping query for ${arr[i].tableName} as no fields are provided.`
            );
          }

          // const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueCustomerIdentifier}, ${fields} ,company_code, user_code, unit_code) VALUES ('${customerCode}', ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
          // console.log(query);
          // await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Customer master Created Successfully",
  });
});



exports.updateCustomer = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Customer Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  const item = req.body.customerMaster[0].distributor_name;
  // console.log(item);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === "date")
              fields += `${field} = TO_CHAR('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        const getYear = await client.query(
          `select count(*) from sl_mst_distributor where UPPER(distributor_name)=UPPER('${item}') 
          and distributor_code<>${req.params.code} and marked is null;`
        );
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Customer Already Exists",
          });
        }
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueCustomerIdentifier}=${req.params.code}`;
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
                  fields += `${field} = TO_CHAR('${obj[field]}', 'DD-MM-YYYY'), `;
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
                  values += `TO_CHAR('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "number")
                  values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueCustomerIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Customer master Updated Successfully",
  });
});

// exports.deleteCustomer = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;
//   if (!req.params.code) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Please specify the Customer Code",
//     });
//   }
//   const arr = jsonData.getNdelete.dataSources;
//   for (let i = 0; i < arr.length; i++) {
//     await client.query(
//       `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueCustomerIdentifier}='${req.params.code}'`
//     );
//   }

//   res.status(200).json({
//     status: "success",
//     message: "Item Deleted Successfully",
//   });
// });

exports.deleteCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Customer Code",
    });
  }

  const arr = jsonData.getNdelete.dataSources;

  const tableArray = [
    {table:"sl_trans_booking_hdr", column:"distributor_code"},
    {table:"sl_trans_invoice_hdr",column:"distributor_code"},
    {table:"sl_trans_sauda_hdr",column:"cust_code"},
    {table:"sl_trans_sale_return_hdr",column:"distributor_code"},
  ]; // List of tables to check

  const result = await Promise.all(
    tableArray.map(async ({table,column}) => {
      return await client.query(
        `SELECT ref_table('${table}', '${column}', '${req.params.code}')`
      );
    })
  );

  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table);

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Customer Already Used",
      isUsed: true,
    });
  } else {
    // If all tables return true, proceed to delete the item
    for (let i = 0; i < arr.length; i++) {
      await client.query(
        `UPDATE ${arr[i].tableName} SET marked='D' WHERE ${arr[i].uniqueCustomerIdentifier}='${req.params.code}'`
      );
    }

    // Send success response and return to avoid further execution
    return res.status(200).json({
      status: "success",
      message: "Customer Deleted Successfully",
      isUsed: false,
    });
  }
});
