/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { Console } = require("console");





const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../itemMasterData.json`, "utf8")
);
//const client = req.dbConnection;
const generateItemId = async (itemCode, tableName, client) => {
  const response = await client.query(
    `SELECT MAX(${itemCode}) AS MAX FROM ${tableName}`
  );
  //return response.rows[0].MAX + 1;
  // console.log(response);
  return response.rows[0].max + 1;
};
//// console.log(generateItemId);

exports.getAllItems = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

 console.log("user1",req.user);
  // console.log("user1");
  // console.log("user1");
  // console.log("user1");
  // console.log("user1");
  // console.log("user1");
  const items = await client.query(
    `SELECT ITEM_CODE, ITEM_NAME, ITEM_UOM, CATEGORY_DESC, HSN_NO, ITEM_GROUP, SUB_GROUP_NAME, ACTUAL_NAME, MIN_LEVEL, MAX_LEVEL  FROM V_ITEM_MASTER where company_code= ${req.user.company} order by item_code`
  );
  res.status(200).json({
    status: "success",
    data: {
      items,
    },
  });
});



exports.getItemData = wrapper(async (req, res, next) => {
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
    query += ` WHERE ${arr[i].uniqueItemIdentifier}='${req.params.code}' and marked is null`;
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
        if (key === "ACCOUNT_CODE") {
          // Special handling for ACCOUNT_CODE with additional condition on account_type
          query = `SELECT ${obj[key].columnsRequired} 
                   FROM ${obj[key].masterName} 
                   WHERE marked IS NULL 
                   AND company_code = ${req.user.company} 
                   AND account_type = 'A'`;
        } else {
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where marked is null and company_code =${req.user.company}`;
        } //   // console.log(obj[key]+"\n");
        console.log(query,"----------");
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



exports.createItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  const item = req.body.itemMaster[0].item_name;
  console.log(req.body);
  // // console.log(item);
  const itemCode = await generateItemId(
    arr[0].uniqueItemIdentifier,
    arr[0].tableName,
    client
  );
  // console.log(itemCode);
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
          // // console.log(field);
          // // console.log(field);
        });
        // // console.log(fields);
        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        const getYear = await client.query(
          `select count(*) from sl_mst_item where UPPER(item_name)=upper('${item}') and marked is null;`
        );
        console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Item Already Exists",
          });
        }
        const query = `INSERT INTO ${arr[i].tableName} (ITEM_CODE, ${fields}, company_code, user_code, unit_code) VALUES ('${itemCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
        // console.log("ghghguuhjh", query);

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
            // // console.log(values += `'${obj[field]}' `);
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueItemIdentifier}, ${fields}, company_code, user_code, unit_code) VALUES ('${itemCode}', ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
          // console.log("zzzzzzz", query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "item master Created Successfully",
  });
});



exports.updateItem = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Employee Code",
    });
  }
  console.log("req.body from item master",req.body)
  const client = req.dbConnection;
  const item = req.body.itemMaster[0].item_name;
  // console.log(item, "update-------------------------");
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
        // console.log(fields);
        fields = fields.slice(0, -2);
        const getYear = await client.query(
          `select count(*) from sl_mst_item where UPPER(item_name)=UPPER('${item}')and item_code<>${req.params.code} and marked is null;`
        );
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Item Already Exists",
          });
        }
        // console.log(fields);
        // console.log(fields);
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueItemIdentifier}=${req.params.code}`;
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
            // console.log("zzzz", arr[i].uniqueRowIdentifier);
            // console.log("zzzz", arr[i].uniqueRowIdentifier);
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
                  values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "number")
                  values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueItemIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "item master Updated Successfully",
  });
});



exports.deleteItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Employee Code",
    });
  }

  const arr = jsonData.getNdelete.dataSources;
 

  const tableArray = [
    { table:"sl_trans_booking_size_detail" , column:"item_code"},
    { table:"sl_trans_inv_size_detail" , column:"item_code"},
    { table:"pur_rmdeal_det" , column:"item_code"},
    { table:"pur_mrir_det" , column:"item_code"},
    { table:"pur_purchase_return_det" , column:"item_code"},
    { table:"pur_trans_issue_return_det" , column:"item_code"},
    { table:"pur_factory_arrival_det" , column:"item_code"},
    { table:"pur_stock_adju_det" , column:"item_code"},
    { table:"pur_trans_ingot_issue" , column:"item_code"},
    { table:"sl_item_opening_balance_det" , column:"item_code"},
    { table:"pur_store_req_det" , column:"item_code"},
    { table:"pur_trans_sauda_hdr" , column:"item_code"},
    { table:"pur_rm_requisition_det" , column:"item_code"},
    { table:"sl_sale_return_size_detail" , column:"item_code"},
    { table:"sl_stock_status_consumption" , column:"item_code"},
   
    { table: "prod_exec_product_det" , column:"item_cd"},
    { table: "prod_exec_item_det" , column:"item_cd"}

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
  console.log(isAnyTableUsed,"Sales contract");

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Item Already Used",
      isUsed: true,
    });
  } else {
    // If all tables return true, proceed to delete the item
    for (let i = 0; i < arr.length; i++) {
      await client.query(
        `UPDATE ${arr[i].tableName} SET marked='D' WHERE ${arr[i].uniqueItemIdentifier}='${req.params.code}'`
      );
    }

    // Send success response and return to avoid further execution
    return res.status(200).json({
      status: "success",
      message: "Item Deleted Successfully",
      isUsed: false,
    });
  }
});


//get employee data in payroll

// exports.getEmployeeData = wrapper(async (req, res, next) => {
//   const connection = req.dbConnection;
//   const employees = await connection.execute(
//     `SELECT EMPLOYEE_NAME, DEPARTMENT_NAME, DESIGNATION_NAME, DATE_OF_BIRTH, JOINING_DATE, GENDER, GROSS_SALARY FROM V_EMPLOYEE_MASTER`
//   );
//   res.status(200).json({
//     status: 'success',
//     data: {
//       employees,
//     },
//   });
// });

//get attenadance data in pyaroll

// exports.getAttendanceData = wrapper(async (req, res, next) => {
//   const connection = req.dbConnection;
//   const employees = await connection.execute(
//     `SELECT DESIGNATION,NO_WORKING_HRS, EMPLOYEE_NAME, DEPARTMENT_NAME,DEPARTMENT_CODE , TIME_IN, TIME_OUT, ATTEND_DATE, EMPLOYEE_CODE, STATUS2,DESIGNATION_CODE FROM V_ATTENDANCE`
//   );
//   res.status(200).json({
//     status: 'success',
//     data: {
//       employees,
//     },
//   });
// });
