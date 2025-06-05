const { client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../admin.json`, "utf8")
);

// const generateTaxId = async (client) => {
// console.log("ggjhjkkjkj")
//   const response1 = await client.query(
//     `SELECT MAX(tax_code)m FROM sl_mst_item_tax_hdr`
//   );
//    console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

exports.getAllTax = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const tax = await client.query(
    `SELECT spec_code, get_employee(spec_code) user_name, item_code, role_cd, company_code from sl_sec_spec_item_hdr  where marked is null and company_code= ${req.user.company} `
);
// `SELECT tax_code, hsn, timestamptostring(norm_date) norm_date,  timestamptostring(f_date)f_date, timestamptostring(t_date)t_date from sl_mst_item_tax_hdr  where marked is null and company_code= ${req.user.company} `
  res.status(200).json({
    status: "success",
    data: {
      tax,
      // dat1
    },
  });
});


// exports.userValue = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//    console.log("req.user.finyear");
//   var year = req.user.finyear;
//   var comany_code = req.user[0].company_code;
//   var site = req.user[0];

//   const OpenningValue = await client.query(
//     `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
//   );

//   res.status(200).json({
//     status: "success",
//     data: {
//       site,
//       OpenningValue,
//     },
//   });
// });

exports.userValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  console.log("3422222222222222fddddddddddddddddddd");
  // var year = req.user;
 var user=req.user
//  console.log(user, "ye user h")
  // var comany_code = req.user[0].company_code;
  var site = req.user.unit;
  // console.log(site[0].unit_code, "ye site h", site.unit)

  // var permission = req.user.PERMISSIONS;
  const planResult = await client.query(`SELECT plan_id FROM SL_SEC_SPEC_ITEM_HDR WHERE spec_code = '${req.user[0].spec_code}'`);

  let planId = null;
        if (planResult.rows.length > 0) {
                planId = planResult.rows[0].plan_id;
        }
      
        // 👉 Now fetch module based on planId
        let module = { rows: [] }; // default empty
        if (planId) {
          module = await client.query(`
            SELECT module_id, get_module(module_id) AS module_name 
            FROM PLAN_MODULES 
            WHERE plan_id = ${planId}
          `);
        }
  //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

  var permission = req.user.PERMISSIONS;
  // console.log(permission)
  //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

  const unit= await client.query(`select site_code, site_desc from sl_mst_site where marked is null and company=${req.user.company}`)
  const year= await client.query(`select year_nm , year_desc from fin_mst_year_mst  where marked is null and company_code=${req.user.company}`)
  
  const OpenningValue = await client.query(
    `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
  );


  // console.log("Permissions",permission);
  res.status(200).json({
    status: "success",
    data: {
      site,
      OpenningValue,
      user,
      module,
      unit,
      year,
      permission
    },
  });
});

exports.getTaxData = wrapper(async (req, res, next) => {
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
    // Modify the fieldsRequired to format from_time and to_time
    let fields = arr[i].fieldsRequired
      .split(",") // Split fieldsRequired into an array
      .map((field) => field.trim()) // Trim spaces around field names
      .map((field) => {
        if (field === 'from_time' || field === 'to_time') {
          return `TO_CHAR(${field}, 'HH24:MI') AS ${field}`; // Format time without seconds
        }
        return field;
      })
      .join(", "); // Rejoin the fields into a string

    let query = `SELECT ${fields} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    query += ` WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}' and marked is null`;

    // Execute the query
    console.log(query,"query is -------");
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

  
      const employee = await client.query(`SELECT email,  employee_name,employee_code  from sl_mst_employee where marked is null 
       and coalesce(employee_code,'X') not in (select coalesce(get_employee_cd(spec_code),'X') from sl_sec_spec_item_hdr where marked is null) 
        and company_code=${req.user.company}`);
      const role = await client.query(`select role_code, role_desc from sl_sec_role`)
      const company = await client.query(`select company_code, company_name from sl_mst_company`)
      const site = await client.query(`select site_code, site_desc from sl_mst_site`)
      const planResult = await client.query(`SELECT plan_id FROM SL_SEC_SPEC_ITEM_HDR WHERE spec_code = '${req.user[0].spec_code}'`);

let planId = null;
      if (planResult.rows.length > 0) {
              planId = planResult.rows[0].plan_id;
      }
    
      // 👉 Now fetch module based on planId
      let module = { rows: [] }; // default empty
      if (planId) {
        module = await client.query(`
          SELECT module_id, get_module(module_id) AS module_name 
          FROM PLAN_MODULES 
          WHERE plan_id = ${planId}
        `);
      }
 
 
      res.status(200).json({
   
        status: "success",
    
        employee,
   
        role,
   
        company,
  
        site,
   
        module
  });
});


exports.createTax = wrapper(async (req, res, next) => {
  console.log(req.body, "Request Body");
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  console.log(arr, "Configuration Array");

  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        // Single object case
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;

        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            fields += `${field}, `;
            if (field === "item_code") {
              // Apply decrypt10g() for item_code field
              values += `encrypt10g('${obj[field]}'), `;
            } else if (arr[i].fieldsRequired[field] === "date") {
              const formattedDate = (() => {
                const date = obj[field];
                const split = date.split("-");
                const reverse = split.reverse();
                return reverse.join("-");
              })();
              values += `TO_DATE('${formattedDate}', 'YYYY-MM-DD'), `;
            } else if (arr[i].fieldsRequired[field] === "datetime") {
              const date = new Date(obj[field]);
              const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
              values += `'${timePart}', `;
            } else if (arr[i].fieldsRequired[field] === "number") {
              values += `${obj[field]}, `;
            } else {
              values += `'${obj[field]}', `;
            }
          }
        });

        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        console.log(req.user)
        const planResult = await client.query(`SELECT plan_id FROM SL_SEC_SPEC_ITEM_HDR WHERE spec_code = '${req.user[0].spec_code}'`)
        let planId = null;
      if (planResult.rows.length > 0) {
              planId = planResult.rows[0].plan_id;
      }

        const query = `INSERT INTO ${arr[i].tableName} (user_CODE, unit_code, company_code, ${fields}) VALUES ('${req.user[0].spec_code}', '${req.user.unit}',${req.user.company}, ${values})`;
        console.log(query, "Generated Query");
        await client.query(query);

        // 👉 After Insert, Update plan_id in SL_SEC_SPEC_ITEM_HDR
if (planId) {
  const updateQuery = `
    UPDATE SL_SEC_SPEC_ITEM_HDR 
    SET plan_id = ${planId}
    WHERE user_code = '${req.user[0].spec_code}'
  `;
  console.log(updateQuery, "Generated Update Query");
  await client.query(updateQuery);
}
      } else {
        // Array of objects case
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let fields = ``;
          let values = ``;

          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field]) {
              fields += `${field}, `;
              if (field === "item_code") {
                values += `decrypt10g('${obj[field]}'), `;
              } else if (arr[i].fieldsRequired[field] === "date") {
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === "datetime") {
                const date = new Date(obj[field]);
                const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
                values += `'${timePart}', `;
              } else if (arr[i].fieldsRequired[field] === "number") {
                values += `${obj[field]}, `;
              } else {
                values += `'${obj[field]}', `;
              }
            }
          });

          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (spec_cd, company_code, ${fields}) VALUES ('${req.body.itemTax[0].spec_code}', ${req.user.company}, ${values})`;
          console.log(query, "Generated Query for Array");
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Tax Created Successfully",
  });
});



// exports.updateTax = wrapper(async (req, res, next) => {
//   console.log(req.body, "Request Body");
//   const client = req.dbConnection;
//   const arr = jsonData.createNupdate.fieldNames;

//   console.log(arr, "Configuration Array");

//   let headerSpecCode = '';

//   for (let i = 0; i < arr.length; i++) {
//     if (req.body[arr[i].responseFieldName]) {
//       const tableName = arr[i].tableName;
//       const uniqueIdentifier = arr[i].uniqueRowIdentifier;

//       if (!arr[i].typeArray) {
//         // Single object case (Header table)
//         const obj = req.body[arr[i].responseFieldName][0];
//         let updateSet = '';

//         Object.keys(arr[i].fieldsRequired).forEach((field) => {
//           if (obj[field] !== undefined && field !== uniqueIdentifier) {
//             if (field === "item_code") {
//               updateSet += `${field} = encrypt10g('${obj[field]}'), `;
//             } else if (arr[i].fieldsRequired[field] === "date") {
//               const formattedDate = (() => {
//                 const date = obj[field];
//                 const split = date.split("-");
//                 const reverse = split.reverse();
//                 return reverse.join("-");
//               })();
//               updateSet += `${field} = TO_DATE('${formattedDate}', 'YYYY-MM-DD'), `;
//             } else if (arr[i].fieldsRequired[field] === "datetime") {
//               const date = new Date(obj[field]);
//               const timePart = date.toTimeString().slice(0, 5);
//               updateSet += `${field} = '${timePart}', `;
//             } else if (arr[i].fieldsRequired[field] === "number") {
//               updateSet += `${field} = ${obj[field]}, `;
//             } else {
//               updateSet += `${field} = '${obj[field]}', `;
//             }
//           }
//         });

//         updateSet = updateSet.slice(0, -2);
//         const query = `UPDATE ${tableName} SET ${updateSet}, user_CODE = '${req.user[0].spec_code}', unit_code = '${req.user.unit}' WHERE ${uniqueIdentifier} = '${obj[uniqueIdentifier]}'`;
//         console.log(query, "Generated Query for Header");
//         await client.query(query);

//         headerSpecCode = obj[uniqueIdentifier];
//       } else {
//         // Array of objects case (Detail table)
//         const arr1 = req.body[arr[i].responseFieldName];
//         for (let j = 0; j < arr1.length; j++) {
//           const obj = arr1[j];
//           let updateSet = '';

//           Object.keys(arr[i].fieldsRequired).forEach((field) => {
//             if (obj[field] !== undefined) {
//               if (field === "item_code") {
//                 updateSet += `${field} = decrypt10g('${obj[field]}'), `;
//               } else if (arr[i].fieldsRequired[field] === "date") {
//                 updateSet += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//               } else if (arr[i].fieldsRequired[field] === "datetime") {
//                 const date = new Date(obj[field]);
//                 const timePart = date.toTimeString().slice(0, 5);
//                 updateSet += `${field} = '${timePart}', `;
//               } else if (arr[i].fieldsRequired[field] === "number") {
//                 updateSet += `${field} = ${obj[field]}, `;
//               } else {
//                 updateSet += `${field} = '${obj[field]}', `;
//               }
//             }
//           });

//           updateSet = updateSet.slice(0, -2);
//           const query = `UPDATE ${tableName} SET ${updateSet} WHERE ${uniqueIdentifier} = '${headerSpecCode}'`;
//           console.log(query, "Generated Query for Detail");
//           await client.query(query);
//         }
//       }
//     }
//   }

//   res.status(200).json({
//     status: "success",
//     message: "Tax Updated Successfully",
//   });
// });
//latest
// exports.updateTax = wrapper(async (req, res, next) => {
//   if (!req.params.code) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Please specify the User Code",
//     });
//   }
//   const client = req.dbConnection;
//  console.log("Request body",req.body);
//   const arr = jsonData.createNupdate.fieldNames;
//   // const item = req.body.accountHeader[0].account_name;
//   // // console.log(item);
//   for (let i = 0; i < arr.length; i++) {
//     if (req.body[arr[i].responseFieldName]) {
//       if (!arr[i].typeArray) {
//         const obj = req.body[arr[i].responseFieldName][0];
//         let fields = ``;
//         Object.keys(arr[i].fieldsRequired).forEach((field) => {
//           if (obj[field]) {
//             if (arr[i].fieldsRequired[field] === "date") {
//               // Handle just the date
//               field += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//             } else if (arr[i].fieldsRequired[field] === "datetime") {
//               // Handle date-time format
//               field += `TO_TIMESTAMP('${obj[field]}', 'DD-MM-YYYY HH24:MI:SS'), `;
//             } else if (arr[i].fieldsRequired[field] === "number")
//               fields += `${field} = ${obj[field]}, `;
//             else fields += `${field} = '${obj[field]}', `;
//           }
//         });
//         fields = fields.slice(0, -2);
//         // const getYear = await client.query(
//         //   `select duplicate_account_chk('${item}');`
//         // );
//         // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
//         // // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
//         // if (getYear.rows[0].duplicate_account_chk >= "1") {
//         //   return res.status(200).json({
//         //     status: "fail",
//         //     message: "Account Already Exists",
//         //   });
//         // }
//         const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`;
//         console.log(query,'hdrrrrrrrr');
//         await client.query(query);
//       } else {
//         const arr1 = req.body[arr[i].responseFieldName];
//         for (let j = 0; j < arr1.length; j++) {
//           const obj = arr1[j];
//           if (obj.PARAM === "UPDATE") {
//             let fields = ``;
//             Object.keys(arr[i].fieldsRequired).forEach((field) => {
//               if (obj[field]) {
//                 if (arr[i].fieldsRequired[field] === "date")
//                   fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//                 else if (arr[i].fieldsRequired[field] === "number")
//                   fields += `${field} = ${obj[field]}, `;
//                 else fields += `${field} = '${obj[field]}', `;
//               }
//             });
//             fields = fields.slice(0, -2);
//             const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${
//               arr[i].uniqueRowIdentifier
//             }='${obj[arr[i].uniqueRowIdentifier]}'`;
//             // console.log(query);
//             await client.query(query,"dettttttttttttt");
//           } else if (obj.PARAM === "DELETE") {
//             const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
//               arr[i].uniqueRowIdentifier
//             }='${obj[arr[i].uniqueRowIdentifier]}'`;
//             // console.log(query);
//             await client.query(query);
//           } else {
//             let fields = ``;
//             let values = ``;
//             Object.keys(arr[i].fieldsRequired).forEach((field) => {
//               if (obj[field]) {
//                 fields += `${field}, `;
//                 if (arr[i].fieldsRequired[field] === "date")
//                   values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//                 else if (arr[i].fieldsRequired[field] === "number")
//                   values += `${obj[field]}, `;
//                 else values += `'${obj[field]}', `;
//               }
//             });
//             fields = fields.slice(0, -2);
//             values = values.slice(0, -2);
//             const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
//             // console.log(query);
//             await client.query(query,"insssssssssssssert");
//           }
//         }
//       }
//     }
//   }
//   res.status(200).json({
//     status: "success",
//     message: "User Updated Successfully",
//   });
// });

// async function processField(field, data, code, client) {
//   if (!field.typeArray) {
//     await updateSingleRecord(field, data[0], code, client);
//   } else {
//     await processArrayField(field, data, code, client);
//   }
// }

// async function updateSingleRecord(field, obj, code, client) {
//   const fields = buildFieldsString(field.fieldsRequired, obj);
//   const query = `UPDATE ${field.tableName} SET ${fields} WHERE ${field.uniqueReqIdentifier}='${code}'`;
//   console.log('Update query:', query);
//   await client.query(query);
// }

// async function processArrayField(field, arr, code, client) {
//   for (const obj of arr) {
//     switch (obj.PARAM) {
//       case 'UPDATE':
//         await updateArrayRecord(field, obj, client);
//         break;
//       case 'DELETE':
//         await deleteArrayRecord(field, obj, client);
//         break;
//       default:
//         await insertArrayRecord(field, obj, code, client);
//     }
//   }
// }

// async function updateArrayRecord(field, obj, client) {
//   const fields = buildFieldsString(field.fieldsRequired, obj);
//   const query = `UPDATE ${field.tableName} SET ${fields} WHERE ${field.uniqueRowIdentifier}='${obj[field.uniqueRowIdentifier]}'`;
//   console.log('Update array query:', query);
//   await client.query(query);
// }

// async function deleteArrayRecord(field, obj, client) {
//   const query = `UPDATE ${field.tableName} SET MARKED='D' WHERE ${field.uniqueRowIdentifier}='${obj[field.uniqueRowIdentifier]}'`;
//   console.log('Delete array query:', query);
//   await client.query(query);
// }

// async function insertArrayRecord(field, obj, code, client) {
//   const { fields, values } = buildInsertStrings(field.fieldsRequired, obj);
//   const query = `INSERT INTO ${field.tableName} (${field.uniqueReqIdentifier}, ${fields}) VALUES ('${code}', ${values})`;
//   console.log('Insert array query:', query);
//   await client.query(query);
// }

// function buildFieldsString(fieldsRequired, obj) {
//   return Object.entries(fieldsRequired)
//     .filter(([field]) => obj[field])
//     .map(([field, type]) => {
//       const value = formatValue(obj[field], type);
//       return `${field} = ${value}`;
//     })
//     .join(', ');
// }

// function buildInsertStrings(fieldsRequired, obj) {
//   const entries = Object.entries(fieldsRequired).filter(([field]) => obj[field]);
//   const fields = entries.map(([field]) => field).join(', ');
//   const values = entries.map(([field, type]) => formatValue(obj[field], type)).join(', ');
//   return { fields, values };
// }

// function formatValue(value, type) {
//   switch (type) {
//     case 'date':
//       return `TO_DATE('${value}', 'DD-MM-YYYY')`;
//     case 'datetime':
//       return `TO_TIMESTAMP('${value}', 'DD-MM-YYYY HH24:MI:SS')`;
//     case 'number':
//       return value;
//     default:
//       return `'${value}'`;
//   }
// }

exports.updateTax = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the item Code",
    });
  }
  const client = req.dbConnection;
  console.log("req.body form updateUser",req.body)
  const arr = jsonData.createNupdate.fieldNames;
  // const item = req.body.accountHeader[0].account_name;
  console.log("--------------------------",arr,"-----------------------------");
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
              const date = new Date(obj[field]);
              const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
              fields += `'${timePart}', `;
            }else if (arr[i].fieldsRequired[field] === "number")
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
        console.log(query,'553 query1');
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
                else if (arr[i].fieldsRequired[field] === "datetime") {
                  const date = new Date(obj[field]);
                  const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
                  fields += `${field} ='${timePart}', `;
                } 
                else fields += `${field} = '${obj[field]}', `;
              }
            });
            console.log("--------",fields,"fields are");
            fields = fields.slice(0, -2);
            const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            console.log(query,"query 2");
            await client.query(query);
          } else if (obj.PARAM === "DELETE") {
            const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            console.log(query,"query 2");
            await client.query(query);
          } else {
            let fields = ``;
            let values = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                fields += `${field}, `;
                if (arr[i].fieldsRequired[field] === "date")
                  values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "datetime") {
                  const date = new Date(obj[field]);
                  const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
                  values += `'${timePart}', `;
                }
                else if (arr[i].fieldsRequired[field] === "number")
                  values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}, company_code) VALUES ('${req.params.code}', ${values}, ${req.user.company})`;
            console.log(query,"insert query");
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "User Updated Successfully",
  });
});





exports.deleteTax = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Tax Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Tax Deleted Successfully",
  });
});
