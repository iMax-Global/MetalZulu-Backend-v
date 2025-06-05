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
  fs.readFileSync(`${__dirname}/../transPorter.json`, "utf8")
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
    `SELECT MAX(CAST(substring(order_code from '[0-9]+$') AS INTEGER)) AS M FROM fin_inv_transporter_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `T12425-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `T12425-${num}`;
  }
};

exports.getAllRequisition = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Construct the query strin
  // console.log(req.user);
  const query = `
    SELECT order_code,  net_amount, voucher_code, freight_net_amount, act_amt, short , tot_short, left_qty, timestamptostring(bill_date)  bill_date,  timestamptostring(invoice_date) invoice_date, timestamptostring(f_date) f_date, timestamptostring(t_date) t_date, reference_no, remarks
    FROM fin_inv_transporter_hdr 
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
        console.log(query,"query of additional data");
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

exports.getAdditionalDataVendor = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const dbData = await client.query(`WITH RECURSIVE account_hierarchy AS (
    SELECT
        account_code,
        account_name,
        uniq_code,
        parent_group
    FROM
        fin_mst_account
    WHERE
        account_type = 'A'
        AND marked IS NULL
        AND account_used = 'T'
        AND parent_group IN ('83', '30')  -- START WITH condition
   
    UNION ALL

    SELECT
        a.account_code,
        a.account_name,
        a.uniq_code,
        a.parent_group
    FROM
        fin_mst_account a
    INNER JOIN
        account_hierarchy ah
    ON
        a.parent_group = ah.uniq_code  -- CONNECT BY PRIOR condition
)
SELECT
    account_code,
    account_name
FROM
    account_hierarchy
ORDER BY
    account_name;
`);

  res.status(200).json({
    status: "success",
    dbData,
  });
});

exports.getInvoiceData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query);
  let { transporter_code, transaction_date } = req.query;

  // Convert transaction_date from DD/MM/YYYY to YYYY/MM/DD
  const [day, month, year] = transaction_date.split('-');
  const formattedDate = `${year}/${month}/${day}`;

  const ACCOUNT_CODEH = await client.query(`SELECT Opening_Balance(
    ${transporter_code},  
    '${formattedDate}',
    ${req.user.unit},  
    'M',
    ${req.user.company},
    'R',
    '${req.user.finyear}'
  );`);

  console.log(ACCOUNT_CODEH, "ACCOUNT CODE OPENING");

  res.status(200).json({
    status: "success",
    ACCOUNT_CODEH,
  });
});


exports.getAdditionalDataInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query.from, "yttyutyut");
  const dbData = await client.query(`WITH RECURSIVE account_hierarchy AS (
    -- Anchor member: starting rows
    SELECT
        account_code,
        account_name, 
        uniq_code,
        parent_group
    FROM
        fin_mst_account
    WHERE
        marked IS NULL
        AND account_type = 'A'
        AND group_code IN ('19', '17')

    UNION ALL

    -- Recursive member: get child rows
    SELECT
        a.account_code,
        a.account_name,  -- Use function logic if necessary
        a.uniq_code,
        a.parent_group
    FROM
        fin_mst_account a
    INNER JOIN
        account_hierarchy ah
    ON
        a.parent_group = ah.uniq_code
    WHERE
        a.marked IS NULL
        AND a.account_type = 'A'
)
SELECT DISTINCT
    account_code,
    account_name
FROM
    account_hierarchy;
`);

  const reference = await client.query(`SELECT DISTINCT
a.account_code,
a.account_name

FROM
fin_mst_account a
JOIN
fin_mst_service_tax_head t
ON
a.service_tax_code = t.service_tax_code
WHERE
a.marked IS NULL
AND t.marked IS NULL;
`);

  const mrir = await client.query(`sELECT 
  GR_NO,
  timestamptostring(GR_DATE) GR_DATE,
  TRUCK_NO,
  F_DESC,
  REF_GRN,
  timestamptostring(MRIR_INV_DATE) MRIR_INV_DATE,
  GET_LOCALITY_DESC(F_TYPE, LOCALITY) AS LOCALITY_DESC,
  GET_customer(F_TYPE, PARTY_DISTRIBUTOR) AS Party_Distributor_desc,
  Get_Account(TRANS_CODE) AS transporter_name,
  NET_WT,
  Trans_Rate(TRANS_CODE, locality, 'BR', F_TYPE, MRIR_INV) AS BASIC_RATE,
  Trans_Rate(TRANS_CODE, locality, 'FR', F_TYPE, MRIR_INV) AS FIXED_RATE,
  CASE 
      WHEN F_TYPE IN ('H', 'I', 'U') THEN 'Send'
      WHEN F_TYPE IN ('W') THEN 'Receive'
      WHEN F_TYPE IN ('M', 'N') THEN 'Rreceive'
      ELSE NULL
  END AS TRANSPORT_TYPE,
  F_TYPE,
  MRIR_INV,
  LOCALITY,
  REC_CODE
FROM 
  QUADRA_TRASPORT 
WHERE 
 --(trans_code = :account_code OR :account_code IS NULL)
  -- (f_type = :f_tr_type OR :f_tr_type IS NULL)
 --  (gr_date >= :f_date)
  --AND (gr_date <= :t_date + 1)
 -- AND (gr_date <> :t_date + 1)
   coalesce(REC_CODE,'X') NOT IN (
      SELECT 
         coalesce( ref_mrir_type || '-' || 
          SUBSTRING(REF_MRIR FROM 1 FOR 2) || '-' || 
          SUBSTRING(REF_MRIR FROM POSITION('-' IN REF_MRIR) + 1),'X') AS REC_MRIR_CODE
      FROM 
          FIN_TRANSPORT_INV_DET
      WHERE 
          MARKED IS NULL
  );
`);

  res.status(200).json({
    status: "success",
    dbData,
    reference,
    mrir,
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

exports.getAllInoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { f_date, t_date } = req.query;

  // Log parameters for debugging
  console.log("Original f_date:", f_date, "Original t_date:", t_date);

  try {
    // Convert dates from DD-MM-YYYY to YYYY-MM-DD
    const [day1, month1, year1] = f_date.split("-");
    const [day2, month2, year2] = t_date.split("-");

    const formattedFDate = `${year1}-${month1}-${day1}`;
    const formattedTDate = `${year2}-${month2}-${day2}`;

    console.log(
      "Formatted f_date:",
      formattedFDate,
      "Formatted t_date:",
      formattedTDate
    );

    // Construct the query with parameters (for logging)
    const query = `
      SELECT 
        GR_NO,
        timestamptostring(GR_DATE) GR_DATE,
        TRUCK_NO,
        F_DESC,
        REF_GRN,
        timestamptostring(MRIR_INV_DATE) MRIR_INV_DATE,
        GET_LOCALITY_DESC(F_TYPE, LOCALITY) AS LOCALITY_DESC,
        GET_customer(F_TYPE, PARTY_DISTRIBUTOR) AS Party_Distributor_desc,
        Get_Account(TRANS_CODE) AS transporter_name,
        Trans_Rate(TRANS_CODE, locality, 'BR', F_TYPE, MRIR_INV) AS BASIC_RATE,
        Trans_Rate(TRANS_CODE, locality, 'FR', F_TYPE, MRIR_INV) AS FIXED_RATE,
        CASE 
            WHEN F_TYPE IN ('H', 'I', 'U') THEN 'Send'
            WHEN F_TYPE IN ('W') THEN 'Receive'
            WHEN F_TYPE IN ('M', 'N') THEN 'Receive'
            ELSE NULL
        END AS TRANSPORT_TYPE,
        F_TYPE,
        MRIR_INV,
        LOCALITY,
        REC_CODE,(select sum(pcs) from transporter_pcs where invoice_no=MRIR_INV)pcs,
        (select sum(qty) from transporter_pcs where invoice_no=MRIR_INV)NET_WT
      FROM 
        QUADRA_TRASPORT 
      WHERE 
        gr_date >= $1
        AND gr_date <= $2
        AND coalesce(REC_CODE, 'X') NOT IN (
          SELECT 
             coalesce(ref_mrir_type || '-' || 
              SUBSTRING(REF_MRIR FROM 1 FOR 2) || '-' || 
              SUBSTRING(REF_MRIR FROM POSITION('-' IN REF_MRIR) + 1), 'X') AS REC_MRIR_CODE
          FROM 
              FIN_TRANSPORT_INV_DET
          WHERE 
              MARKED IS NULL
        );
    `;

    // Log the query and the parameters
    console.log("Executing query:", query);
    console.log("With parameters:", formattedFDate, formattedTDate);

    // Execute the query with parameters
    const mrir = await client.query(query, [formattedFDate, formattedTDate]);

    res.status(200).json({
      status: "success",
      data: {
        mrir,
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching invoices.",
    });
  }
});

exports.createOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  const body = req.body;
  console.log(body, "TTTTTTTTTTTTTTTTTTTTTTT");
  // var qty = 0;
  // for (let i = 0; i < body.mrirDetail.length; i++) {
  //   qty = qty + body.mrirDetail[i].total_qty;
  // }
  // const TOTAL_QTY = qty;
  // console.log(TOTAL_QTY, "Total qtyyyyyyyyyyyyyyyyyyyyyyyy");
  // const invoiceCode = await generateInvoiceId(client);

  /////////////////////new code voucher
  const vdate = body.prodHdr[0].bill_date;
  const vtype = 17;
  // const cdate = req.body.VoucherHeader[0].cheque_date;
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

  const response1 = await client.query(queryString);
  console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZyyyyyyyyyyyyyyyyyyyyyyyy", response1);

  const voucherCode = response1.rows[0].new_voucher_code;

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

        const query = `INSERT INTO ${arr[i].tableName} (order_code, voucher_code, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${dailyProdCode}', '${voucherCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
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
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${dailyProdCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
          console.log(query); // Log the query
          await client.query(query);
        }
      }
    }
  }

  {
    var customer_name = body.prodHdr[0].vendor_code;
    var a = await client.query(`select  get_party('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_party;
    //  this is for item account
    // const totalAmount2 = body.mrirDetail.reduce(
    //   (sum, item) => sum + item.amount2,
    //   0
    // );
    //     var itemAcc =
    //       await client.query(`select distinct account_code from sl_mst_item_account_det where marked is null
    // and item_code=${body.mrirDetail[0].item_code}`);
    //     console.log(itemAcc, "itemacc", itemAcc.rows[0].account_code);
    //     const detailitem = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE, Entry_type, account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,   VOUCHER_TYPE) VALUES
    // ('${voucherCode}', 'D', ${itemAcc.rows[0].account_code},
    //   ${totalAmount2}
    //   , ${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    //     // console.log(detailvoucher);
    //     await client.query(detailitem);

    //////////////////////////This is for tax

    //  this is for item account
    // const TaxableAmount = body.chargedata.reduce(
    //   (sum, item) => sum + item.TaxValue,
    //   0
    // );
    // var taxAcc = await client.query(
    //   `select primary_account from sl_mst_charge where marked is null and charge_code=${body.chargedata[0].charge_code}`
    // );

    for (let i = 0; i < body.prodDetail.length; i++) {
      const accountCode = body.prodDetail[i].account_code1; // Get account_code1 from each prodDetail item
      const amount = body.prodHdr[i].net_amount; // Assuming you also need to use 'amount' for the query

      // Construct the query for each prodDetail item
      const detailtax = `
        INSERT INTO fin_mst_t_voucher_det (
          VOUCHER_CODE,
          Entry_type,
          account_code,
          AMOUNT,
          COMPANY_CODE,
          UNIT_CODE,
          status,
          send_status,
          VOUCHER_TYPE
        ) 
        VALUES (
          '${voucherCode}', 
          'D', 
          ${accountCode}, 
          ${amount}, 
          ${req.user.company}, 
          ${req.user.unit}, 
          'M', 
          'A', 
          ${17}
        )
      `;

      // Execute the query
      await client.query(detailtax);
    }

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Transporter: " +
      distributor_name +
      "," +
      "bill_no: " +
      dailyProdCode +
      "," +
      "Bill_date: " +
      vdate1;
    // console.log(narration, "narration");
    // console.log(narration, "narration");

    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, dr, cr, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status,  send_status)

  VALUES ('${voucherCode}', ${17}, ${body.prodHdr[0].net_amount},${
      body.prodHdr[0].net_amount
    }, '${vdate1}',
    ${body.prodHdr[0].net_amount}
    ,'${narration}','${Year1}', ${req.user.company},${
      req.user.unit
    },  '${Year1}','M', 'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    // var account = await client.query(
    //   `select account_code from fin_mst_account where account_code=${customer_name} and account_used='T'`
    // );
    // // console.log(account);
    // const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,  VOUCHER_TYPE) VALUES
  ('${voucherCode}', 'C', ${body.prodHdr[0].vendor_code},
  ${body.prodHdr[0].net_amount}, ${req.user.company},${
      req.user.unit
    },  'M', 'A',  ${17})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
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

  const voucher = await client.query(
    `select VOUCHER_CODE from fin_inv_transporter_hdr where order_code ='${req.params.code}'`
  );

  console.log(voucher);
  const voucherId = voucher.rows[0].voucher_code;

  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`
    );
  }

  // // console.log(voucherId);
  await client.query(
    `update   FIN_MST_T_VOUCHER_HDR set marked='D' where VOUCHER_CODE='${voucherId}'`
  );
  await client.query(
    `update  FIN_MST_T_VOUCHER_DET set marked='D' where VOUCHER_CODE='${voucherId}'`
  );

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

exports.getAllPendingMrir = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  SELECT
    get_account(vendor_code) AS transporter_name,
    vendor_code,
    timestamptostring(bill_date)bill_date,
    reference_no,
    net_amount,
    act_amt,
    voucher_code,
    order_code,
    remarks,
    get_site(unit_code) AS unit_desc,
    unit_code
FROM
    fin_inv_transporter_hdr
WHERE
    marked IS NULL
    and unit_code=${req.user.unit} and company_code=${req.user.company} and fin_year='${req.user.finyear}'


    `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND bill_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }
  console.log(baseQuery, "baaaaaaaaaaaaaaaaaaaaaaaaaaase");
  const invoice = await client.query(baseQuery);
  console.log(invoice, "indeeeeeeeeeeeeeeeeeeeeeeeeeeeeeent");

  res.status(200).json({
    status: "success",
    data: {
      invoice,
    },
  });
});
exports.getAllPendingMrirByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Calculate start and end of the week
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDate = new Date(today.setDate(startOfWeek));
  const endDate = new Date(today.setDate(endOfWeek));

  // Format dates to ISO and reverse
  const startDateInISO = startDate.toISOString().split("T")[0];
  const endDateInISO = endDate.toISOString().split("T")[0];
  const startDate2 = startDateInISO.split("-").reverse().join("-");
  const endDate2 = endDateInISO.split("-").reverse().join("-");

  const dat1 = [];

  // Format date for PostgreSQL
  function date_to_postgres(dateparam) {
    const date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    const reversedDate = date
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("-");
    return reversedDate;
  }

  // Updated SQL query
  const query = `
  SELECT
    get_account(vendor_code) AS transporter_name,
    vendor_code,
    timestamptostring(bill_date)bill_date,
    reference_no,
    net_amount,
    act_amt,
    voucher_code,
    order_code,
    remarks,
    get_site(unit_code) AS unit_desc,
    unit_code
FROM
    fin_inv_transporter_hdr
WHERE
    marked IS NULL
    and unit_code=${req.user.unit} and company_code=${req.user.company} and fin_year='${req.user.finyear}'


        
AND bill_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  console.log(query, "byweeeeeeeeeeeeeeeeeeeeeeeek");
  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});
// mrir register
exports.getAllMrir = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  SELECT
    GR_NO,
    timestamptostring(GR_DATE) GR_DATE,
    TRUCK_NO,
    F_DESC,
    REF_GRN,
    timestamptostring(MRIR_INV_DATE) MRIR_INV_DATE,
    GET_LOCALITY_DESC(F_TYPE, LOCALITY) AS LOCALITY_DESC,
   -- GET_DEALER(F_TYPE, DEALER_CODE) AS DEALER,
    GET_customer(F_TYPE, PARTY_DISTRIBUTOR) AS Party_Distributor_desc,
    Get_Account(TRANS_CODE) AS transporter_name,
    NET_WT,
    -- Transporter Rates
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'PWT') AS PARTY_WT,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TWT') AS TRANS_WT,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'BRATE') AS BASIC_TR_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TRATE') AS TRAN_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'URATE') AS UPDATE_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TFIXED') AS TRANS_FIXED,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'FIXED') AS FIXED,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') AS SEL_OPT,
    CASE
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 5 THEN 'MST'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 4 THEN 'TRP'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 3 THEN 'OUR'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 2 THEN 'TFX'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 1 THEN 'OFX'
        ELSE NULL
    END AS SEL_OPT2,
    -- Freight Rate
    FRATE_TYPE(F_TYPE, MRIR_INV) AS FINAL_AMT,
    (TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TWT') * TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TRATE')) AS TR_AMT,
    -- Transport Type
    CASE
        WHEN F_TYPE IN ('H', 'I', 'U') THEN 'Send'
        WHEN F_TYPE IN ('W') THEN 'Receive'
        WHEN F_TYPE IN ('M', 'N') THEN 'Rreceive'
        ELSE NULL
    END AS TRASPORT_TYPE,
    F_TYPE,
    MRIR_INV,
    LOCALITY,
    REC_CODE
FROM quadra_transport
WHERE F_DESC IS NOT null AND REC_CODE NOT IN (SELECT REC_CODE FROM TRANS_TAG_INV )
`;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND GR_DATE BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }
  console.log(baseQuery, "baaaaaaaaaaaaaaaaaaaaaaaaaaase");
  const invoice = await client.query(baseQuery);
  console.log(invoice, "indeeeeeeeeeeeeeeeeeeeeeeeeeeeeeent");

  res.status(200).json({
    status: "success",
    data: {
      invoice,
    },
  });
});
exports.getAllMrirByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Calculate start and end of the week
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDate = new Date(today.setDate(startOfWeek));
  const endDate = new Date(today.setDate(endOfWeek));

  // Format dates to ISO and reverse
  const startDateInISO = startDate.toISOString().split("T")[0];
  const endDateInISO = endDate.toISOString().split("T")[0];
  const startDate2 = startDateInISO.split("-").reverse().join("-");
  const endDate2 = endDateInISO.split("-").reverse().join("-");

  const dat1 = [];

  // Format date for PostgreSQL
  function date_to_postgres(dateparam) {
    const date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    const reversedDate = date
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("-");
    return reversedDate;
  }

  // Updated SQL query
  const query = `
  SELECT
    GR_NO,
    GR_DATE,
    TRUCK_NO,
    F_DESC,
    REF_GRN,
    MRIR_INV_DATE,
    GET_LOCALITY_DESC(F_TYPE, LOCALITY) AS LOCALITY_DESC,
   -- GET_DEALER(F_TYPE, DEALER_CODE) AS DEALER,
    GET_customer(F_TYPE, PARTY_DISTRIBUTOR) AS Party_Distributor_desc,
    Get_Account(TRANS_CODE) AS transporter_name,
    NET_WT,
    -- Transporter Rates
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'PWT') AS PARTY_WT,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TWT') AS TRANS_WT,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'BRATE') AS BASIC_TR_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TRATE') AS TRAN_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'URATE') AS UPDATE_RATE,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TFIXED') AS TRANS_FIXED,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'FIXED') AS FIXED,
    TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') AS SEL_OPT,
    CASE
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 5 THEN 'MST'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 4 THEN 'TRP'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 3 THEN 'OUR'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 2 THEN 'TFX'
        WHEN TRASPORTER_RATES(F_TYPE, MRIR_INV, 'SOPT') = 1 THEN 'OFX'
        ELSE NULL
    END AS SEL_OPT2,
    -- Freight Rate
    FRATE_TYPE(F_TYPE, MRIR_INV) AS FINAL_AMT,
    (TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TWT') * TRASPORTER_RATES(F_TYPE, MRIR_INV, 'TRATE')) AS TR_AMT,
    -- Transport Type
    CASE
        WHEN F_TYPE IN ('H', 'I', 'U') THEN 'Send'
        WHEN F_TYPE IN ('W') THEN 'Receive'
        WHEN F_TYPE IN ('M', 'N') THEN 'Rreceive'
        ELSE NULL
    END AS TRASPORT_TYPE,
    F_TYPE,
    MRIR_INV,
    LOCALITY,
    REC_CODE
FROM quadra_transport
WHERE F_DESC IS NOT null AND REC_CODE NOT IN (SELECT REC_CODE FROM TRANS_TAG_INV )
AND GR_DATE BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  console.log(query, "byweeeeeeeeeeeeeeeeeeeeeeeek");
  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});
