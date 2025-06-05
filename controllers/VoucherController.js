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
  fs.readFileSync(`${__dirname}/../voucher.json`, "utf8")
);

exports.getAllVoucher = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const order = await client.query(
    `select get_voucher_type(Voucher_type)voucher_type_desc, voucher_code, timestamptostring(voucher_date) voucher_date, ref_voucher_code, cheque_no, timestamptostring(cheque_date) cheque_date, cr, dr
      from fin_mst_t_voucher_hdr where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

// exports.userValue = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//   // console.log(req.user.finyear);
//   var year = req.user.finyear;
//   var comany_code = req.user[0].company_code;
//   var site = req.user[0];
//   var permission = req.user.PERMISSIONS;

//   const OpenningValue = await client.query(
//     `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
//   );

//   res.status(200).json({
//     status: "success",
//     data: {
//       site,
//       OpenningValue,
//       permission,
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

exports.getVoucherData = wrapper(async (req, res, next) => {
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
    query += ` WHERE ${arr[i].uniqueVoucherIdentifier}='${req.params.code}'`;
    // // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

const getVoucherid = wrapper(async (req, client) => {
  // const client = req.dbConnection;
  const { site, date, send_status, voucher_type } = req.query;
  // // console.log(req);
  // // console.log(req);
  // const f_yr= fin_yr(${date});
  // // console.log('hudhdhd',date);
  const date1 = date.split("-").reverse().join("-");
  // // console.log(date1);
  const getYear = await client.query(`select fin_yr('${date1}'); `);
  const Year1 = getYear.rows[0].fin_yr;
  return Year1;
});

exports.createVoucher = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  console.log(req.body);
  const vdate = req.body.VoucherHeader[0].voucher_date;
  const vtype = req.body.VoucherHeader[0].voucher_type;
  const cdate = req.body.VoucherHeader[0].cheque_date;
  console.log(":vandna######", vtype);
  // // console.log(":vandna######", vtype);
  const vdate1 = vdate.split("-").reverse().join("-");
  // const cdate1=cdate.split("-").reverse().join("-");
  // console.log(vdate, "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@vdate");
  // console.log(vdate, "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@vdate");
  const getYear = await client.query(`select fin_yr('${vdate1}');`);
  console.log(getYear);
  const vtypedesc = await client.query(
    `select vshort_code from fin_mst_voucher_type where voucher_type_code=${vtype};`
  );

  const desc = vtypedesc.rows[0].vshort_code;
  const Year1 = getYear.rows[0].fin_yr;
  // console.log(":gfhggjgjhjhjhkj", Year1);
  // console.log(":gfhggjgjhjhjhkj", Year1);
  const queryString = `WITH MaxVoucherCode AS (
      SELECT COALESCE(MAX(CAST(SUBSTR(VOUCHER_CODE, 15, 4) AS INTEGER)), 0) AS max_voucher_code
      FROM FIN_MST_T_VOUCHER_HDR
      WHERE VOUCHER_CODE LIKE 'A%' || TO_CHAR(NOW(), 'MMDD') || '-' || '${desc}' || '-%'
  )
  -- Step 2: Generate the new voucher code
  SELECT 'A'||1||'${Year1}'|| TO_CHAR(NOW(), 'MMDD') || '-' || '${desc}' || '-' || LPAD((max_voucher_code + 1)::text, 4, '0') AS new_voucher_code
  FROM MaxVoucherCode;`;
  console.log(queryString, "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ");

  //   const queryString = `
  //   SELECT Voucher_Id_1(
  //     '${Year1}',
  //     to_char(to_date('${vdate1}', 'YYYY-MM-DD'), 'MM'),
  //     to_char(to_date('${vdate1}', 'YYYY-MM-DD'), 'DD'),
  //     to_date('${vdate1}', 'YYYY-MM-DD'),
  //     1, 1, 'A'
  //   )
  // `;

  // console.log(queryString, "eqyerureueie");
  // const response1 = await client.query(` select Voucher_Id_1('${Year1}',to_char(to_date('${vdate}', 'YYYY-MM-DD'), 'MM'),to_char(to_date('${vdate}', 'YYYY-MM-DD'), 'DD'),
  // to_date('${vdate}', 'YYYY-MM-DD'),1,1,'A' )`);
  const response1 = await client.query(queryString);
  console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZyyyyyyyyyyyyyyyyyyyyyyyy", response1);

  const voucherCode = response1.rows[0].new_voucher_code;
  // console.log(req.body, "dudfhudfhudvhuduhdhudhuduhuhds");
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
        const query = `INSERT INTO ${arr[i].tableName} (VOUCHER_CODE, ${fields}, company_code, user_code, unit_code, fin_year, status, company_type, voucher_year) VALUES ('${voucherCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', 'M', 'R', '${req.user.finyear}')`;
        // const query = `INSERT INTO ${arr[i].tableName} (VOUCHER_CODE,cheque_date, voucher_date, ${fields}) VALUES ('${voucherCode}','${cdate}','${vdate}', ${values})`;
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueVoucherIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year, status, company_type, voucher_year) VALUES ('${voucherCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', 'M', 'R', '${req.user.finyear}')`;
          console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Voucher Created Successfully",
  });
});

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("vandna");
  //   const ACCOUNT_CODEH = await client.query(`SELECT
  //     Get_Account(ACCOUNT_CODE) AS ACCOUNT,
  //     REC_TYPE,
  //     ACCOUNT_CODE,
  //     EXTERNAL_ENTITY_CODE,
  //     DISTRIBUTOR_CODE
  // FROM (
  //     SELECT
  //         ACCOUNT_CODE,
  //         EXTERNAL_ENTITY_CODE,
  //         DISTRIBUTOR_CODE,
  //         'SLS' AS REC_TYPE,
  //         LINK_TYPE
  //     FROM
  //         SL_MST_DEALER_DIST_DET
  //     WHERE
  //         marked IS NULL
  //     GROUP BY
  //         EXTERNAL_ENTITY_CODE,
  //         ACCOUNT_CODE,
  //         DISTRIBUTOR_CODE,
  //         LINK_TYPE

  //     UNION

  //     SELECT
  //         ACCOUNT_CODE,
  //         EXTERNAL_ENTITY_CODE,
  //         DISTRIBUTOR_CODE,
  //         'PUR' AS REC_TYPE,
  //         LINK_TYPE
  //     FROM
  //         PUR_MST_DEALER_DIST_DET
  //     WHERE
  //         marked IS NULL
  //     GROUP BY
  //         EXTERNAL_ENTITY_CODE,
  //         ACCOUNT_CODE,
  //         DISTRIBUTOR_CODE,
  //         LINK_TYPE

  //     UNION

  //     SELECT
  //         account_code,
  //         NULL AS EXTERNAL_ENTITY_CODE,
  //         NULL AS DISTRIBUTOR_CODE,
  //         NULL AS REC_TYPE,
  //         NULL AS LINK_TYPE
  //     FROM
  //         fin_mst_account
  //     WHERE
  //         account_type='A'
  //         AND marked IS NULL
  //         AND account_code NOT IN (SELECT account_code FROM SALE_PUR_ACCT GROUP BY account_code, REC_TYPE)
  // ) AS combined`);

  const ACCOUNT_CODEH = await client.query(`SELECT ACCOUNT_CODE,
Get_Account(ACCOUNT_CODE) AS ACCOUNT

FROM
    fin_mst_account
WHERE
    account_type='A'
    AND marked IS NULL`);

  const VOUCHER_TYPE = await client.query(
    `select voucher_type_code,voucher_type_desc from fin_mst_voucher_type where marked is null and company_code=${req.user.company} `
  );

  const Department = await client.query(
    `select dept_code, dept_name from  sl_mst_department where marked is null and company_code=${req.user.company} `
  );

  const Cost = await client.query(
    `select cost_code, cost_desc from  fin_mst_cost_center where marked is null and company_code=${req.user.company} `
  );

  const Budget = await client.query(
    `select budget_code, budget_desc  from fin_mst_budget  where marked is null and company_code=${req.user.company} `
  );

  // const ACCOUNT_CODE = await client.query(`with recursive cte_connect_by as (
  //   select 1 as level, s.* from fin_mst_account s
  //   where marked is null and account_type='A'
  //   union all
  //   select level + 1 as level, s.* from cte_connect_by r inner join fin_mst_account s on   r.uniq_code =s.parent_group
  //   )
  //   select  account_code, account_name from cte_connect_by  `);

  const ACCOUNT_CODE = await client.query(`SELECT
    Get_Account(ACCOUNT_CODE) AS ACCOUNT,
    REC_TYPE,
    ACCOUNT_CODE,
    EXTERNAL_ENTITY_CODE,
    DISTRIBUTOR_CODE
FROM (
    SELECT
        ACCOUNT_CODE,
        EXTERNAL_ENTITY_CODE,
        DISTRIBUTOR_CODE,
        'SLS' AS REC_TYPE,
        LINK_TYPE
    FROM
        SL_MST_DEALER_DIST_DET    
    WHERE
        marked IS NULL
    GROUP BY
        EXTERNAL_ENTITY_CODE,
        ACCOUNT_CODE,
        DISTRIBUTOR_CODE,
        LINK_TYPE

    UNION

    SELECT
        ACCOUNT_CODE,
        EXTERNAL_ENTITY_CODE,
        DISTRIBUTOR_CODE,
        'PUR' AS REC_TYPE,
        LINK_TYPE
    FROM
        PUR_MST_DEALER_DIST_DET    
    WHERE
        marked IS NULL
    GROUP BY
        EXTERNAL_ENTITY_CODE,
        ACCOUNT_CODE,
        DISTRIBUTOR_CODE,
        LINK_TYPE

    UNION

    SELECT
        account_code,
        NULL AS EXTERNAL_ENTITY_CODE,
        NULL AS DISTRIBUTOR_CODE,
        NULL AS REC_TYPE,
        NULL AS LINK_TYPE
    FROM
        fin_mst_account
    WHERE
        account_type='A'
        AND marked IS NULL
      --  AND account_code NOT IN (SELECT account_code FROM SALE_PUR_ACCT GROUP BY account_code, REC_TYPE)
) AS combined`);
  res.status(200).json({
    status: "success",
    data: {
      ACCOUNT_CODEH,
      ACCOUNT_CODE,
      VOUCHER_TYPE,
      Department,
      Cost,
      Budget,
    },
  });
});

exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const hsn1 = await client.query(
    `select distributor_code from sl_mst_distributor where marked is null and account_code=${req.params.code} and MARKED is null and company_code= ${req.user.company}`
  );

  res.status(200).json({
    status: "success",
    data: {
      hsn1,
    },
  });
});

exports.updateVoucher = wrapper(async (req, res, next) => {
  // console.log("manoj  mmake othher constoeller");
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Voucher Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  // // console.log(arr);
  // // console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];

        // console.log(obj);
        // console.log(obj);
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === "date")
              fields += `${field} ('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        // console.log("ddfdfdfdfddfddfddfd");
        // console.log("ddfdfdfdfddfddfddfd");
        const query = `UPDATE ${arr[i].tableName} SET  ${fields} WHERE ${arr[i].uniqueVoucherIdentifier}='${req.params.code}'`;
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
                  fields += `${field} = VOUCHER_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
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
                  values += `VOUCHER_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === "number")
                  values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueVoucherIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Voucher Updated Successfully",
  });
});

exports.deleteVoucher = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Voucher Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueVoucherIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Voucher Deleted Successfully",
  });
});

const pdfmake = wrapper(async (req, res, str) => {
  const voucher_code = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", voucher_code);

  try {
    const client = req.dbConnection;

    const query = `
      SELECT DISTINCT
        h.account_code AS account_codeh,
        d.cost_code,
        d.vref_code,
        h.voucher_code,
        TO_NUMBER(SUBSTRING(d.unique_id FROM 2 FOR LENGTH(d.unique_id) - 1)::TEXT, '999999999999') AS ud,
        d.entry_type,
        d.amount,
        get_account(d.account_code) AS Account_Name,
        h.voucher_date,
        h.narration,
        h.voucher_type
      FROM
        FIN_MST_T_VOUCHER_DET d
      JOIN
        FIN_MST_T_VOUCHER_hdr h ON d.voucher_code = h.voucher_code
      WHERE  
        h.marked IS NULL
        AND d.marked IS NULL
        -- AND h.voucher_type = 5
        AND h.voucher_code = $1
      ORDER BY
        d.entry_type DESC;
    `;

    const itemLogoQuery = `
      SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
      FROM sl_mst_site 
      WHERE marked IS NULL 
      AND company = 1 
      AND site_code = 1
    `;

    const companyQuery = `
      SELECT company_name 
      FROM sl_mst_company 
      WHERE MARKED IS NULL 
      AND COMPANY_CODE = 1
    `;

    const [result, itemlogo, company] = await Promise.all([
      client.query(query, [voucher_code]),
      client.query(itemLogoQuery),
      client.query(companyQuery),
    ]);

    res.json({
      voucherDetails: result.rows,
      itemlogo: itemlogo.rows,
      company: company.rows,
    });
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.downloadPDF = async (req, res, next) => {
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};
