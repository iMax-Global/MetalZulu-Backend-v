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
  fs.readFileSync(`${__dirname}/../chargeMaster.json`, "utf8")
);
console.log(jsonData);
// how to get data from postgres database and create a pdf file from it and save it in the folder

const generateAccId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(charge_code)M FROM sl_mst_charge`
  );

  return Number(response1.rows[0].m) + 1;
};

exports.getAllAcc = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const account = await client.query(
    `SELECT 
    charge_code,
    charge_desc,
    get_account(primary_account) AS primary_account,
    CASE 
        WHEN trans_type = 'p' THEN 'PUR'
        WHEN trans_type = 's' THEN 'SLS'
        ELSE trans_type
    END AS trans_type
FROM 
    sl_mst_charge
WHERE 
    marked IS NULL 
    AND company_code = ${req.user.company}
ORDER BY 
    charge_code;
`
  );
  res.status(200).json({
    status: "success",
    data: {
      account,
    },
  });
});

exports.getAccData = wrapper(async (req, res, next) => {
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
    query += ` WHERE ${arr[i].uniqueChargedentifier}='${req.params.code}' and marked is null`;
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
console.log('vandna1111111111111111111111111111111111111')
  // const arr = jsonData.createNupdate.fieldNames;
  // const data = {};
  // for (let i = 0; i < arr.length; i++) {
  //   if (arr[i].lovFields) {
  //     let query = ``;
  //     const obj = arr[i].lovFields;
  //     console.log(obj);
  //     for (const key in obj) {
  //       if (key == "ACC_GROUP_CODE") {
  //         query = `SELECT ${obj[key].columnsRequired}, uniq_code FROM ${obj[key].masterName} WHERE MARKED IS NULL and company_code =${req.user.company} order by 2 `;
  //       } else {
  //         query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE MARKED IS NULL and company_code =${req.user.company} order by 2 `;
  //       }
     const query=`select account_code,account_name from fin_mst_account where marked is null and account_type='A' and company_code='${req.user.company}'  order by 1`
        console.log(query);
        const dbData = await client.query(query);
  //       data[key] = dbData;
  //     }
  //   }
  // }

  res.status(200).json({
    status: "success",
    dbData,
  });
});

exports.createCharge = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  // console.log(arr);
  const item = req.body.chargeHeader[0].charge_desc;
  // console.log(item);
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
          `select count(*) from sl_mst_charge where UPPER(CHARGE_DESC)=UPPER('${item}') and company_code='${req.user.company}'  and marked is null ;`
        );
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Account Already Exists",
          });
        }
        console.log(values);
        const query = `INSERT INTO ${arr[i].tableName} (CHARGE_CODE, ${fields}, company_code, user_code, unit_code) VALUES ('${accountCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
        console.log(query);
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueChargeIdentifier}, ${fields}, company_code, user_code, unit_code) VALUES ('${accountCode}', ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}')`;
          // console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Account Created Successfully",
  });
});

exports.updateAccount = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Charge Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  const item = req.body.chargeHeader[0].charge_name;
  // console.log(item);
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
        const getYear = await client.query(
          `select count(*) from fin_mst_account where UPPER(account_name)=UPPER('${item}') 
          and account_code<>${req.params.code} and marked is null
          ;`
        );
        // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
        if (getYear.rows[0].count >= "1") {
          return res.status(200).json({
            status: "fail",
            message: "Account Already Exists",
          });
        }
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueChargedentifier}='${req.params.code}'`;
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueChargedentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
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

exports.deleteAccount = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Charge Code",
    });
  }
  
  const arr = jsonData.getNdelete.dataSources;
  
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i].uniqueChargedentifier,'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv')
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueChargedentifier}=${req.params.code}`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Charge Deleted Successfully",
  });
});

exports.getParrent = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const parent = await client.query(
    `SELECT ACCOUNT_NAME,ACCOUNT_CODE FROM FIN_MST_ACCOUNT WHERE MARKED IS null`
  );

  res.status(200).json({
    data: parent,
  });
});
