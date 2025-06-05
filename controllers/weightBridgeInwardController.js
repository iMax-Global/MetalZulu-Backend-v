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
  fs.readFileSync(`${__dirname}/../WeightBridge.json`, "utf8")
);

exports.getAllBevarage = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const Bev = await client.query(
    `Select wt_code, timestamptostring(dt) as Date, CASE 
        WHEN wb_type = 'I' THEN 'Inward'
        WHEN wb_type = 'O' THEN 'Outward'
    END AS WB_Type, truck_no as Vehicle_No, get_party(cust_party_type) as PARTY, get_distributor(cust_party_code) as CUSTOMER,
    gate_no as Gate_Pass_No, invoice_code as Invoice_Code, in_time as In_Time, out_time as Out_Time, in_wt as In_Weight, out_wt as Out_Weight, 
    rmk as Remark, net_wt as Net_Weight, acid_wt as Deduction_Weight from sl_mst_wtbridge WHERE MARKED IS NULL and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
  res.status(200).json({
    status: "success",
    data: {
      Bev,
    },
  });
});

// exports.userValue = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//   // console.log(req.user.finyear);
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
 console.log(user, "ye user h")
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
  console.log(permission)
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


exports.getSingleBevarage = wrapper(async (req, res, next) => {
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
    query += ` WHERE ${arr[i].uniqueBevIdentifier}='${req.params.code}'`;
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

  // const PARTY_NAME = await client.query(`select party_code, party_name from pur_mst_party where marked is null order by party_name asc`)
  //  const GATE_NO = await client.query(`select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr	where marked is null `)
  // const CUST_NAME = await client.query(`select distributor_code, distributor_name as customer_name from sl_mst_Distributor where marked is null order by distributor_name asc`)
  const GATE1 =
    await client.query(`select truck_no, factory_arrival_code, get_party(party_code) as party_display_name, party_code
	  from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='P' and coalesce(factory_arrival_code,'X') not in (select coalesce(gate_no,'X') from sl_mst_wtbridge where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit})`);
  const GATE2 = await client.query(
    `select truck_no,factory_arrival_code from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='D' and coalesce(factory_arrival_code,'X') not in (select coalesce(gate_no,'X') from sl_mst_wtbridge where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} )`
  );

  const ONGATE1 = await client.query(
    `select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='P' and coalesce(factory_arrival_code,'X') not in (select coalesce(gate_no,'X') from sl_mst_wtbridge where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit})`
  );

  const ONGATE2 = await client.query(
    `select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='D' and coalesce(factory_arrival_code,'X') not in (select coalesce(gate_no,'X') from sl_mst_wtbridge where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit})`
  );

  res.status(200).json({
    status: "success",
    data: {
      //PARTY_NAME,
      //GATE_NO,
      //CUST_NAME,
      GATE1,
      GATE2,
      ONGATE1,
      ONGATE2,
    },
  });
});

exports.getviewAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // const PARTY_NAME = await client.query(`select party_code, party_name from pur_mst_party where marked is null order by party_name asc`)
  //  const GATE_NO = await client.query(`select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr	where marked is null `)
  // const CUST_NAME = await client.query(`select distributor_code, distributor_name as customer_name from sl_mst_Distributor where marked is null order by distributor_name asc`)
  const VIEWGATE1 =
    await client.query(`select truck_no, factory_arrival_code, get_party(party_code) as party_display_name, party_code
	  from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='P'`);
  const VIEWGATE2 = await client.query(
    `select truck_no,factory_arrival_code from Pur_factory_arrival_hdr where marked is null  and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='D'`
  );

  const VIEWONGATE1 = await client.query(
    `select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and AGAINST_OF='P'`
  );

  const VIEWONGATE2 = await client.query(
    `select factory_arrival_code, factory_arrival_code from Pur_factory_arrival_hdr where marked is null and company_code= ${req.user.company}  and unit_code =${req.user.unit} and  AGAINST_OF='D'`
  );

  res.status(200).json({
    status: "success",
    data: {
      //PARTY_NAME,
      //GATE_NO,
      //CUST_NAME,
      VIEWGATE1,
      VIEWGATE2,
      VIEWONGATE1,
      VIEWONGATE2,
    },
  });
});

exports.getInvoiceData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("jhkkjkj");
  console.log(req.params.code);
  const GATE3 =
    await client.query(`select invoice_code, entity_code, get_distributor(entity_code) as customer_display_name from gate_pass_hdr where 
	in_out_code='${req.params.code}'`);
  const ONGATE3 = await client.query(
    `select invoice_code, invoice_code from gate_pass_hdr where in_out_code='${req.params.code}'`
  );
  // console.log(ONGATE3);

  res.status(200).json({
    status: "success",
    data: {
      GATE3,
      ONGATE3,
    },
  });
});

exports.createInward = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  // console.log(arr);
  // console.log(arr);

  const vdate = req.body.BevHeader[0].dt;
  // console.log(vdate);

  const reverseDate = (date) => {
    const parts = date.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };
  const reversedDate = reverseDate(vdate);
  // console.log(reversedDate);

  const getYear = await client.query(`Select fin_yr('${reversedDate}');`);
  // console.log(getYear);
  const year = getYear.rows[0].fin_yr;
  // console.log(year);

  const response1 = await client.query(`
      WITH MaxWbCode AS (
      SELECT COALESCE(MAX(CAST(SUBSTR(wt_code, 8) AS INTEGER)), 0) AS max_wt_code
      FROM sl_mst_wtbridge
  )
      -- Step 2: Generate the new voucher code
      SELECT 'A'||1||'${year}'||'-'||(max_wt_code + 1) AS new_wb_code
      FROM MaxWbCode;`);

  // console.log(response1.rows[0].new_wb_code);

  const wcode = response1.rows[0].new_wb_code;
  // console.log("wcode", wcode);

  // const voucherCode =response1.rows[0].voucher_id_1
  // ----------

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
              values += `TO_DATE(TO_CHAR(TO_DATE('${obj[field]}', 'DD-MM-YYYY'), 'YYYY-MM-DD'),'YYYY-MM-DD'),`;
            else if (arr[i].fieldsRequired[field] === "number")
              values += `${obj[field]}, `;
            else values += `'${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        const query = `INSERT INTO ${arr[i].tableName} (WT_CODE, ${fields},  company_code, user_code, unit_code, fin_year) VALUES ('${wcode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueBevIdentifier}, ${fields}) VALUES ('${wcode}', ${values})`;
          console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Weighbridge Record Created Successfully",
  });
});

exports.updateRecord = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Weigh Code",
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
              fields += `${field} = TO_DATE(TO_CHAR(TO_DATE('${obj[field]}', 'DD-MM-YYYY'), 'YYYY-MM-DD'),'YYYY-MM-DD'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueBevIdentifier}='${req.params.code}'`;
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueBevIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Record Updated Successfully",
  });
});

exports.deleteRecord = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("ekansh");
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Weight Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  // console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueBevIdentifier}='${req.params.code}'`;
    // console.log(query);
    await client.query(query);
  }

  res.status(200).json({
    status: "success",
    message: "Record Deleted Successfully",
  });
});
