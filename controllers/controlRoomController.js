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

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const site_list = await client.query(
    `SELECT site_code,site_desc FROM sl_mst_site`
  );
  console.log("check one");
  const dealer_naem = await client.query(
    `SELECT external_entity_code, external_entity_name FROM sl_mst_external_entity`
  );
  console.log("check two");
  const headlist = await client.query(`SELECT distinct ha FROM fin_mst_t_voucher_det where ha is not null`);
  console.log("check three");
  // const delearlistcode = await client.query(
  //   "SELECT distributor_code, get_distributor(distributor_code)distributor_name, account_code  from sl_mst_dealer_dist_det where marked is null and external_entity_code=${dealer_code}"
  // );
  res.status(200).json({
    status: "success",
    data: {
      site_list,
      dealer_naem,
      headlist,
      // delearlistcode,
    },
  });
});

exports.getCustomerData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { dealer_code } = req.query;
  const delearlistcode = await client.query(
    `SELECT distributor_code, get_distributor(distributor_code)distributor_name, account_code  from sl_mst_dealer_dist_det where marked is null and external_entity_code=${dealer_code}`
  );
  res.status(200).json({
    status: "success",
    data: {
       delearlistcode,
    },
  });
});

exports.getAdditionalDataledger = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const ACCOUNT_CODEH = await client.query(`SELECT ACCOUNT_CODE,
  Get_Account(ACCOUNT_CODE) AS ACCOUNT
  
  FROM
      fin_mst_account
  WHERE
      account_type='A'
      AND marked IS NULL`);

  res.status(200).json({
    status: "success",
    data: {
      ACCOUNT_CODEH,
    },
  });
});

exports.getAdditionalDataledgerTable = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query);

  const originalStartDate = new Date(req.query.start_date);
  originalStartDate.setDate(originalStartDate.getDate() - 1);
  const adjustedStartDate = originalStartDate.toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'
  console.log(
    adjustedStartDate,
    "ttttttttttttttttttttttttttttttttttttttttttttttyuyu"
  );
  const q = 
    `select FIN_MST_T_VOUCHER_DET.voucher_code,FIN_MST_T_VOUCHER_DET.entry_type,FIN_MST_T_VOUCHER_DET.amount,
    FIN_MST_ACCOUNT.account_name,FIN_MST_T_VOUCHER_DET.account_code,timestamptostring(FIN_MST_T_VOUCHER_hdr.voucher_date) voucher_date,
    FIN_MST_T_VOUCHER_hdr.narration,SL_MST_SITE.site_desc,
    FIN_MST_T_VOUCHER_hdr.voucher_year , fin_mst_T_voucher_hdr.voucher_type vt,
    FIN_MST_T_VOUCHER_hdr.audit_trial
    from  FIN_MST_T_VOUCHER_DET,FIN_MST_ACCOUNT,FIN_MST_T_VOUCHER_hdr,sl_mst_site
    where  FIN_MST_T_VOUCHER_DET.account_code= FIN_MST_ACCOUNT.account_code and
    FIN_MST_T_VOUCHER_hdr.voucher_code=FIN_MST_T_VOUCHER_det.voucher_code and
    FIN_MST_T_VOUCHER_hdr.unit_code=SL_MST_SITE.site_code   and  FIN_MST_T_VOUCHER_hdr.marked is null
    and  FIN_MST_T_VOUCHER_det.marked is null
    and FIN_MST_T_VOUCHER_det.account_code=${req.query.account_code}
    and FIN_MST_T_VOUCHER_hdr.voucher_date between '${req.query.start_date}' and '${req.query.end_date}'
    and FIN_MST_T_VOUCHER_hdr.voucher_type<>13 order by (FIN_MST_T_VOUCHER_hdr.voucher_date)
    `
    console.log(q,"querrrrrrrrrrrrrry");
  const site_list =   await client.query(q);

  const ACCOUNT_CODEH = await client.query(`SELECT Opening_Balance(
    ${req.query.account_code},  
    '${adjustedStartDate}',
    ${req.user.unit},  
    'M',
    ${req.user.company},
    'R',
    '${req.user.finyear}'
);`);

  res.status(200).json({
    status: "success",
    data: {
      site_list,
      ACCOUNT_CODEH,
    },
  });
});

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

exports.controldata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query)
  let account_code = req.query.account_code === undefined ? null : req.query.account_code;
  let unit_code = req.query.unit_code === undefined ? null : req.query.unit_code;
  let  from_date = formatDate(req.query.from_date);
  let start_date = from_date == 'NaN/NaN/NaN' ? null : from_date;
  console.log("from date",from_date)
  let to_date = formatDate(req.query.to_date);
  let end_date = to_date == 'NaN/NaN/NaN' ? null : to_date;
  console.log("to date",to_date)
  const tableQuery = `

    SELECT
        h.voucher_code,
        d.entry_type,d.unique_id,
        get_voucher_type(h.voucher_type) AS voucher_type_desc,
        h.voucher_type,
        d.no_days,
        timestamptostring(h.voucher_date) voucher_date,
        get_account(d.account_code) AS account_name, d.account_code,
        d.amount,
        d.ha,
        d.unit_code,
        d.rec_type,
        timestamptostring((h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day')::date )AS due_date
    FROM
        fin_mst_t_voucher_hdr h
    JOIN
        fin_mst_t_voucher_det d
        ON h.voucher_code::text = d.voucher_code::text
         where d.account_code in (select account_code from sl_mst_distributor where marked is null
        and distributor_code in (select distributor_code from sl_mst_dealer_dist_det where marked is null
      and external_entity_code=${req.query.dealer_code})) and (d.account_code=${account_code} or ${account_code} is NULL)
      and (d.unit_code=${unit_code} or ${unit_code} is NULL) 
      and h.voucher_date >= '${start_date}'
      and h.voucher_date <= '${end_date}'
        
        ;`
  console.log(tableQuery);
  const table_data = await client.query(tableQuery);

  const ac_data = await client.query(
    "SELECT distributor_code, distributor_name, account_code  from sl_mst_distributor"
  );
 console.log("account code",account_code);
 console.log("start date",from_date);
 console.log("unit",req.user.unit);
 console.log("company",req.user.company);
 console.log("finyear",req.user.finyear);
  const ACCOUNT_CODEH = await client.query(`SELECT Opening_Balance(
    ${account_code},  
    '${from_date}',
    ${req.user.unit},  
    'M',
    ${req.user.company},
    'R',
    '${req.user.finyear}'
);`);

  res.status(200).json({
    status: "success",
    data: {
      table_data,
      ac_data,
      ACCOUNT_CODEH,
    },
  });
});

exports.update_headd = wrapper(async (req, res, next) => {
  if (!req.body || !req.body.rowKeys || !req.body.newHeadValue) {
    return res.status(400).json({
      status: "fail",
      message: "failed",
    });
  }

  const client = req.dbConnection;
  const { rowKeys, newHeadValue } = req.body;

  // Parse unique_ids into numeric IDs (assuming they are mapped as A1, A2, A3, ...)
  // const numeric_ids = rowKeys.map(id => parseInt(id.substring(1)));

  try {
    // Update ha values for all numeric_ids with the same ha value
    const updateQuery = `UPDATE fin_mst_t_voucher_DET SET ha = $1 WHERE unique_id = ANY($2::varchar[])    `;
    const values = [newHeadValue, rowKeys];
    await client.query(updateQuery, values);

    res.status(200).json({
      status: "success",
      message: "ha values updated successfully",
    });
  } catch (error) {
    console.error("Error updating ha values:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update ha values",
    });
  }
});

exports.getAdditionalDataOfTrailTable = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const getFiscalYearDates = (finYear) => {
    // Extract the start year from `FinYear`
    const startYear = parseInt(
      // finYear.toString().slice(0, 2) + finYear.toString().slice(2, 4)
      "20"+ finYear.toString().slice(2, 4)
    ); // E.g., 2425 -> 2024
    console.log(startYear,"-----------StartYear--------------");
    // Define start date: April 1 of the calculated start year
    const start_date = new Date(startYear - 1, 3, 1); // Subtract 1 to get the correct calendar year
    console.log(start_date,"-----------Startdate--------------");
    // Define end date: March 31 of the following year
    const end_date = new Date(startYear, 2, 31); // March 31 of `startYear`
    console.log(end_date,"-----------end_date--------------");
    // Return dates formatted as YYYY-MM-DD
    return {
      start_date: start_date.toISOString().split("T")[0],
      end_date: end_date.toISOString().split("T")[0],
    };
  };

  // Example usage
  const FinYear = req.user.finyear; // Assume 2425
  console.log(FinYear,"finyear---------");
  const { start_date, end_date } = getFiscalYearDates(FinYear);

  console.log(start_date, "start dateeeeeeeeeee"); // Outputs: "2024-04-01"
  console.log(end_date); // Outputs: "2025-03-31"

  const q=
    `SELECT accountdtl.group_code,
    accountdtl.account_name,
    accountdtl.uniq_code,
    accountdtl.account_type,
    accountdtl.account_code,
    accountdtl.company_code,
    accountdtl.financial_year,
    COALESCE(drcrvalues.cr_opening_value, 0::numeric) + COALESCE(drcrvalues.cr_value1, 0::numeric) - (COALESCE(drcrvalues.dr_opening_value, 0::numeric) + COALESCE(drcrvalues.dr_value1, 0::numeric)) AS opening_value,
    COALESCE(drcrvalues.dr_value, 0::numeric) AS dr_value,
    COALESCE(drcrvalues.cr_value, 0::numeric) AS cr_value,
    COALESCE(drcrvalues.dr_opening_value, 0::numeric) + COALESCE(drcrvalues.dr_value1, 0::numeric) + COALESCE(drcrvalues.dr_value, 0::numeric) - COALESCE(drcrvalues.cr_opening_value, 0::numeric) - COALESCE(drcrvalues.cr_value1, 0::numeric) - COALESCE(drcrvalues.cr_value, 0::numeric) AS closing_balance
FROM (
 SELECT fin_mst_account.group_code,
        fin_mst_account.account_name,
        fin_mst_account.account_code,
        fin_mst_account.uniq_code,
        fin_mst_account.account_type,
        fin_mst_account.parent_group,
        fin_mst_account.company_code,
        fin_mst_account.financial_year
 FROM fin_mst_account
 WHERE fin_mst_account.marked IS NULL AND fin_mst_account.account_type::text = 'A'::text
) accountdtl
LEFT JOIN (
 SELECT det.account_code AS value_account_cd,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type = 13 THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS dr_opening_value,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type = 13 THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS cr_opening_value,
COALESCE(sum(
             CASE
                 WHEN det.entry_type::text = 'D'::text AND (hdr.voucher_type = 13 OR hdr.voucher_type <> 13 AND hdr.voucher_date >= (( SELECT fin_mst_year_mst.st_date
                    FROM fin_mst_year_mst
                   WHERE fin_mst_year_mst.marked IS NULL AND fin_mst_year_mst.company_code ='${req.user.company}' AND fin_mst_year_mst.year_nm::text = '${req.user.finyear}'::text)) AND hdr.voucher_date <= '${end_date}') THEN det.amount
                 ELSE 0::numeric
             END), 0::numeric) AS dr_closing_value,
         COALESCE(sum(
             CASE
                 WHEN det.entry_type::text = 'C'::text AND (hdr.voucher_type = 13 OR hdr.voucher_type <> 13 AND hdr.voucher_date >= (( SELECT fin_mst_year_mst.st_date
                    FROM fin_mst_year_mst
                   WHERE fin_mst_year_mst.marked IS NULL AND fin_mst_year_mst.company_code = '${req.user.company}' AND fin_mst_year_mst.year_nm::text ='${req.user.finyear}'::text)) AND hdr.voucher_date <= '${end_date}') THEN det.amount
                 ELSE 0::numeric
             END), 0::numeric) AS cr_closing_value,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date >= '${start_date}' AND hdr.voucher_date <= '${end_date}' THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS dr_value,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date >= '${start_date}' AND hdr.voucher_date <= '${end_date}' THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS cr_value,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date < '${start_date}' THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS dr_value1,
        COALESCE(sum(
            CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date < '${start_date}' THEN det.amount ELSE 0::numeric END
        ), 0::numeric) AS cr_value1
 FROM fin_mst_t_voucher_hdr hdr
 JOIN fin_mst_t_voucher_det det ON hdr.voucher_code::text = det.voucher_code::text
 WHERE hdr.marked IS NULL AND det.marked IS NULL
 GROUP BY det.account_code
) drcrvalues ON accountdtl.account_code = drcrvalues.value_account_cd
ORDER BY accountdtl.group_code, accountdtl.account_code;
`
console.log(q, "yyyyyyyyyy")
  const site_list = await client.query(q)

  const ACCOUNT_CODEH = await client.query(`SELECT ACCOUNT_CODE,
  Get_Account(ACCOUNT_CODE) AS ACCOUNT
  
  FROM
      fin_mst_account
  WHERE
      account_type='A'
      AND marked IS NULL`);

  res.status(200).json({
    status: "success",
    data: {
      site_list,
      ACCOUNT_CODEH,
    },
  });
});


exports.getAdditionalDataOfTrailTablewithDate = wrapper(
  async (req, res, next) => {
    const client = req.dbConnection;
    console.log(req.user, "t6iuuuuuuuuuuuy");
    // Define the query
    const query = `
      SELECT accountdtl.group_code,
        accountdtl.account_name,
        accountdtl.uniq_code,
        accountdtl.account_type,
        accountdtl.account_code,
        accountdtl.company_code,
        accountdtl.financial_year,
        COALESCE(drcrvalues.cr_opening_value, 0::numeric) + COALESCE(drcrvalues.cr_value1, 0::numeric) - (COALESCE(drcrvalues.dr_opening_value, 0::numeric) + COALESCE(drcrvalues.dr_value1, 0::numeric)) AS opening_value,
        COALESCE(drcrvalues.dr_value, 0::numeric) AS dr_value,
        COALESCE(drcrvalues.cr_value, 0::numeric) AS cr_value,
        COALESCE(drcrvalues.dr_opening_value, 0::numeric) + COALESCE(drcrvalues.dr_value1, 0::numeric) + COALESCE(drcrvalues.dr_value, 0::numeric) - COALESCE(drcrvalues.cr_opening_value, 0::numeric) - COALESCE(drcrvalues.cr_value1, 0::numeric) - COALESCE(drcrvalues.cr_value, 0::numeric) AS closing_balance
      FROM (
        SELECT fin_mst_account.group_code,
              fin_mst_account.account_name,
              fin_mst_account.account_code,
              fin_mst_account.uniq_code,
              fin_mst_account.account_type,
              fin_mst_account.parent_group,
              fin_mst_account.company_code,
              fin_mst_account.financial_year
        FROM fin_mst_account
        WHERE fin_mst_account.marked IS NULL AND fin_mst_account.account_type::text = 'A'::text
      ) accountdtl
      LEFT JOIN (
        SELECT det.account_code AS value_account_cd,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type = 13 THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS dr_opening_value,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type = 13 THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS cr_opening_value,
              COALESCE(sum(
                  CASE
                      WHEN det.entry_type::text = 'D'::text AND (hdr.voucher_type = 13 OR hdr.voucher_type <> 13 AND hdr.voucher_date >= (( SELECT fin_mst_year_mst.st_date
                        FROM fin_mst_year_mst
                      WHERE fin_mst_year_mst.marked IS NULL AND fin_mst_year_mst.company_code = '${req.user.company}' AND fin_mst_year_mst.year_nm::text = '${req.user.finyear}'::text)) AND hdr.voucher_date <= '${req.query.end_date}') THEN det.amount
                      ELSE 0::numeric
                  END), 0::numeric) AS dr_closing_value,
              COALESCE(sum(
                  CASE
                      WHEN det.entry_type::text = 'C'::text AND (hdr.voucher_type = 13 OR hdr.voucher_type <> 13 AND hdr.voucher_date >= (( SELECT fin_mst_year_mst.st_date
                        FROM fin_mst_year_mst
                      WHERE fin_mst_year_mst.marked IS NULL AND fin_mst_year_mst.company_code = '${req.user.company}' AND fin_mst_year_mst.year_nm::text ='${req.user.finyear}'::text)) AND hdr.voucher_date <= '${req.query.end_date}') THEN det.amount
                      ELSE 0::numeric
                  END), 0::numeric) AS cr_closing_value,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date >= '${req.query.start_date}' AND hdr.voucher_date <= '${req.query.end_date}' THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS dr_value,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date >= '${req.query.start_date}' AND hdr.voucher_date <= '${req.query.end_date}' THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS cr_value,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'D'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date < '${req.query.start_date}' THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS dr_value1,
              COALESCE(sum(
                  CASE WHEN det.entry_type::text = 'C'::text AND hdr.voucher_type <> 13 AND hdr.voucher_date < '${req.query.start_date}' THEN det.amount ELSE 0::numeric END
              ), 0::numeric) AS cr_value1
        FROM fin_mst_t_voucher_hdr hdr
        JOIN fin_mst_t_voucher_det det ON hdr.voucher_code::text = det.voucher_code::text
        WHERE hdr.marked IS NULL AND det.marked IS NULL
        GROUP BY det.account_code
      ) drcrvalues ON accountdtl.account_code = drcrvalues.value_account_cd
      ORDER BY accountdtl.group_code, accountdtl.account_code;
    `;

    // Log the query
    console.log("Executing SQL Query:", query);

    // Execute the query
    const site_list = await client.query(query);

    // Respond with the data
    res.status(200).json({
      status: "success",
      data: {
        site_list,
      },
    });
  }
);


exports.getReportForm = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query);

  const dealer_name = await client.query(
    `SELECT external_entity_code, external_entity_name FROM sl_mst_external_entity where marked is null`
  );
  
  const groups = await client.query(
    `select group_code, group_name from v_debitor_account WHERE MARKED IS NULL and company_code =${req.user.company} order by 2`
  );
  
  const accountdr = await client.query(
    `select  account_code,
DISTRIBUTOR_NAME
FROM SL_MST_DISTRIBUTOR
WHERE MARKED IS NULL
ORDER BY DISTRIBUTOR_NAME`
  );
  
  const accountcr = await client.query(
    `SELECT   ACCOUNT_CODE , PARTY_NAME
FROM PUR_MST_PARTY WHERE MARKED IS NULL ORDER BY PARTY_NAME`
  );



  res.status(200).json({
   
    data: {
      dealer_name,
      groups,
      accountdr,
      accountcr
    }
  });
});


exports.getReport = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log("Query Params:", req.query);
  
  const { category, filter } = req.query;
  const dealer_code = req.query.dealer_code || null; // Extract from params
  const account_code = req.query.account_code || null; // Extract from params
  console.log("Dealer Code:",req.params );

  let query;
  let values = [];

  if (category === "netdue" && filter === "dealer") {

    
    query = `select dealer,(dbit-cedit)value
from (SELECT get_external_entity(d.EXTERNAL_ENTITY_CODE)dealer ,        
    COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'D' THEN ROUND(d.amount) ELSE 0 END), 0) AS dbit,        
    COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'C' THEN ROUND(d.amount) ELSE 0 END), 0) AS cedit
FROM FIN_MST_T_VOUCHER_HDR h    
JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code    
WHERE h.marked IS NULL    
AND d.marked IS NULL    
 AND (d.EXTERNAL_ENTITY_CODE = ${dealer_code} OR ${dealer_code} IS NULL) -- 
 AND h.voucher_date <= CURRENT_DATE 
 AND h.status = 'M'  
 AND h.unit_code = ${req.user.unit}  AND h.COMPANY_code = '${req.user.company}'
 AND (h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day') <= CURRENT_DATE  
GROUP BY d.EXTERNAL_ENTITY_CODE)a
    `;
   
  } 

  else if (category === "netduebillwise" && filter === "dealer") 
    {
      query = `
      WITH voucher_data AS (
  SELECT
    d.amount,
    d.entry_type,
    h.voucher_date,
    h.voucher_code,
    d.account_code,
    get_account(d.account_code) AS acc_nm,
    h.invoice_code,
    COALESCE(d.no_days, 0) AS no_days,
    d.EXTERNAL_ENTITY_CODE,
    h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' due_date
  FROM
    FIN_MST_T_VOUCHER_HDR h
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
  WHERE
    h.marked IS NULL
    AND d.marked IS NULL  
    AND h.unit_code = ${req.user.unit} 
    AND (d.EXTERNAL_ENTITY_CODE = COALESCE(${dealer_code}, d.EXTERNAL_ENTITY_CODE))  
    AND h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' <= CURRENT_DATE
),
credit_sum AS (
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'C' THEN amount ELSE 0 END), 0) AS total_credit
  FROM voucher_data
),
running_balance AS (
  SELECT
    v.*,
    SUM(CASE WHEN v.entry_type = 'D' THEN v.amount ELSE 0 END)
      OVER (ORDER BY v.due_date, v.voucher_code) - cs.total_credit AS balance
  FROM
    voucher_data v
    CROSS JOIN credit_sum cs
  WHERE
    v.entry_type = 'D'
)
SELECT
  voucher_code,
  invoice_code,
  voucher_date,
  CASE
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) <= 0
    THEN balance
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) > 0
    THEN amount
    ELSE balance
  END AS pending_amount,
  entry_type,
  get_account(account_code) AS account_name,
  account_code,
  no_days,
  EXTERNAL_ENTITY_CODE,
  due_date,
  GREATEST(EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER, 0) AS overdue_days
FROM
  running_balance
WHERE
  balance > 0
ORDER BY
  due_date,
  voucher_code;
`;

    
  }

  if (category === "netdue" && filter === "customer") {
    
    query = `SELECT
    dist.distributor_name AS customer,
    (dbit - cedit) AS value
FROM (
    SELECT
        d.account_code,
        COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'D' THEN ROUND(d.amount) ELSE 0 END), 0) AS dbit,        
        COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'C' THEN ROUND(d.amount) ELSE 0 END), 0) AS cedit
    FROM FIN_MST_T_VOUCHER_HDR h    
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code    
    WHERE h.marked IS NULL    
    AND d.marked IS NULL    
    AND d.account_code = ${account_code} OR ${account_code} IS NULL
    AND h.voucher_date <= CURRENT_DATE
    AND h.status = 'M'  
    AND h.unit_code =${req.user.unit} 
    AND h.COMPANY_code = '${req.user.company}'
    AND (h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day') <= CURRENT_DATE  
    GROUP BY d.account_code
) a
LEFT JOIN sl_mst_distributor dist
    ON a.account_code = dist.account_code
WHERE dist.marked IS NULL;
    `;
   
  } 


  else if (category === "netduebillwise" && filter === "customer") 
    {
      query = `
     WITH voucher_data AS (
  SELECT
    d.amount,
    d.entry_type,
    h.voucher_date,
    h.voucher_code,
    d.account_code,
    get_account(d.account_code) AS acc_nm,
    h.invoice_code,
    COALESCE(d.no_days, 0) AS no_days,
    h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' due_date
  FROM
    FIN_MST_T_VOUCHER_HDR h
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
  WHERE
    h.marked IS NULL
    AND d.marked IS NULL  
    AND h.unit_code = ${req.user.unit}  
    AND (d.account_code = COALESCE( ${account_code}, d.account_code))  
  AND h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' <= CURRENT_DATE
),
credit_sum AS (
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'C' THEN amount ELSE 0 END), 0) AS total_credit
  FROM voucher_data
),
running_balance AS (
  SELECT
    v.*,
    SUM(CASE WHEN v.entry_type = 'D' THEN v.amount ELSE 0 END)
      OVER (ORDER BY v.due_date, v.voucher_code) - cs.total_credit AS balance
  FROM
    voucher_data v
    CROSS JOIN credit_sum cs
  WHERE
    v.entry_type = 'D'
)
SELECT
  voucher_code,
  invoice_code,
  voucher_date,
  CASE
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) <= 0
    THEN balance
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) > 0
    THEN amount
    ELSE balance
  END AS pending_amount,
  entry_type,
  get_account(account_code) AS account_name,
  account_code,
  no_days,
  due_date,
  GREATEST(EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER, 0) AS overdue_days
FROM
  running_balance
WHERE
  balance > 0
ORDER BY
  due_date,
  voucher_code;
`;

    
  }

  if (category === "netdue" && filter === "vendor") {
    
    query = `select vendor  ,(CR-DR)Due
from (SELECT
    COALESCE(SUM(CASE WHEN d.entry_type = 'D' THEN ROUND(d.amount) ELSE 0 END), 0) AS DR,
    COALESCE(SUM(CASE WHEN d.entry_type = 'C' THEN ROUND(d.amount) ELSE 0 END), 0) AS CR,
    get_party(p.party_code)vendor  
FROM FIN_MST_T_VOUCHER_HDR h
JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
LEFT JOIN pur_mst_party p ON d.account_code = p.account_code AND p.marked IS NULL -- Fetch party details
WHERE h.marked IS NULL
AND d.marked IS NULL
AND d.account_code = ${account_code} OR ${account_code} IS NULL
AND h.voucher_date <= CURRENT_DATE
AND h.status = 'M'
AND h.unit_code = ${req.user.unit} 
AND h.company_code = '${req.user.company}'
AND (h.voucher_date + COALESCE(d.no_days::INT, 0) * INTERVAL '1 day') <= CURRENT_DATE
GROUP BY d.account_code, p.party_code
ORDER BY UPPER(TRIM(p.party_name)))a
    `;
   
  } 


  else if (category === "netduebillwise" && filter === "vendor") 
    {
      query = `
     WITH voucher_data AS (
  SELECT
    d.amount,
    d.entry_type,
    h.voucher_date,
    h.voucher_code,
    d.account_code,
    get_account(d.account_code) AS acc_nm,
    h.invoice_code,
    COALESCE(d.no_days, 0) AS no_days,
    h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' due_date
  FROM
    FIN_MST_T_VOUCHER_HDR h
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
  WHERE
    h.marked IS NULL
    AND d.marked IS NULL  
    AND h.unit_code = ${req.user.unit}  
    AND (d.account_code = COALESCE(${account_code}, d.account_code))  
  AND h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' <= CURRENT_DATE
),
credit_sum AS (
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'C' THEN amount ELSE 0 END), 0) AS total_credit
  FROM voucher_data
),
running_balance AS (
  SELECT
    v.*,
    SUM(CASE WHEN v.entry_type = 'D' THEN v.amount ELSE 0 END)
      OVER (ORDER BY v.due_date, v.voucher_code) - cs.total_credit AS balance
  FROM
    voucher_data v
    CROSS JOIN credit_sum cs
  WHERE
    v.entry_type = 'D'
)
SELECT
  voucher_code,
  invoice_code,
  voucher_date,
  CASE
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) <= 0
    THEN balance
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) > 0
    THEN amount
    ELSE balance
  END AS pending_amount,
  entry_type,
  get_account(account_code) AS account_name,
  account_code,
  no_days,
  due_date,
  GREATEST(EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER, 0) AS overdue_days
FROM
  running_balance
WHERE
  balance > 0
ORDER BY
  due_date,
  voucher_code;
`;

    
  }
  if (!query) {
    return res.status(400).json({ status: "error", message: "Invalid category or filter" });
  }

  try {
    console.log("Executing Query:", query, values);
    const result = await client.query(query, values);
    res.status(200).json({ status: "success", data: result.rows });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});

exports.getReportDebit = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log("Query Params:", req.query);
  
  const { category, filter } = req.query;
  const dealer_code = req.query.dealer_code || null; // Extract from params
  const account_code = req.query.account_code || null; // Extract from params
  const report_date = req.query.report_date || null; // Extract from params
  const formatdate =report_date.split("-").reverse().join("-");
  console.log("Dealer Code:",req.params );

  let query;
  let values = [];

  if (category === "debtor" && filter === "dealer_wise") {

    
    query = `SELECT * FROM (
    SELECT
        AccountDtl.external_entity_code,
        GET_EXTERNAL_ENTITY(AccountDtl.external_entity_code) AS Dealer,
        AccountDtl.ACCOUNT_CODE,
        GET_ACCOUNT(AccountDtl.ACCOUNT_CODE) AS ACCOUNT_name,
        ROUND(
            (COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0)) -
            (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0))
        ) AS Opening_Value,
        ROUND(dr_value) AS dr_value,
        ROUND(cr_value) AS cr_value,
        ROUND(
            (COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0) + COALESCE(dr_value, 0)) -
            (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0) + COALESCE(cr_value, 0))
        ) AS CLOSING_BALANCE
    FROM  
        (SELECT S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE  
         FROM CONSO_DISTRIBUTOR S  
         WHERE S.DISTRIBUTOR_CODE IS NOT NULL
           AND S.REC_TYPE = 'SLS'
           AND S.ACCOUNT_CODE IN (SELECT DISTINCT ACCOUNT_CODE FROM PRIOR_ACCT WHERE SESS_ID = 8560372)
         GROUP BY S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE
        ) AccountDtl
    INNER JOIN (
        SELECT
            fin_mst_t_voucher_det.account_code AS Value_Account_cd,
            external_entity_code,
            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND FIN_MST_T_VOUCHER_HDR.VOUCHER_YEAR IN (
                        SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL
                    )
                THEN FIN_MST_T_VOUCHER_DET.amount ELSE 0 END
            ), 0) AS Dr_Opening_Value,
           
            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND FIN_MST_T_VOUCHER_HDR.VOUCHER_YEAR IN (
                        SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL
                    )
                THEN FIN_MST_T_VOUCHER_DET.amount ELSE 0 END
            ), 0) AS Cr_Opening_Value,
           
            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END
            ), 0) AS dr_value,
           
            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END
            ), 0) AS Cr_value,

            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND FIN_MST_T_VOUCHER_HDR.VOUCHER_YEAR IN (
                        SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL
                    )
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END
            ), 0) AS dr_value1,

            COALESCE(SUM(
                CASE WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND FIN_MST_T_VOUCHER_HDR.VOUCHER_YEAR IN (
                        SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL
                    )
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(${formatdate} AS TEXT), 'YYYY-MM-DD')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END
            ), 0) AS Cr_value1
        FROM
            fin_mst_t_voucher_hdr
        JOIN fin_mst_t_voucher_det
            ON fin_mst_t_voucher_hdr.voucher_code = fin_mst_t_voucher_det.voucher_code
        WHERE
            fin_mst_t_voucher_hdr.billing_co_cd = COALESCE(${req.user.company}, fin_mst_t_voucher_hdr.billing_co_cd)
            AND fin_mst_t_voucher_hdr.status = COALESCE('M', fin_mst_t_voucher_hdr.status)
            AND fin_mst_t_voucher_hdr.company_code = COALESCE(${req.user.company}, fin_mst_t_voucher_hdr.company_code)
            AND fin_mst_t_voucher_hdr.unit_code = COALESCE(${req.user.unit}, fin_mst_t_voucher_hdr.unit_code)
            AND fin_mst_t_voucher_hdr.marked IS NULL
            AND fin_mst_t_voucher_det.marked IS NULL
            AND fin_mst_t_voucher_hdr.company_type = COALESCE('R', fin_mst_t_voucher_hdr.company_type)
        GROUP BY fin_mst_t_voucher_det.account_code, external_entity_code
    ) drcrvalues
    ON drcrvalues.Value_Account_cd = AccountDtl.account_code  
    AND drcrvalues.EXTERNAL_ENTITY_CODE = AccountDtl.EXTERNAL_ENTITY_CODE
    WHERE
        NULLIF(
            COALESCE(drcrvalues.Dr_Opening_Value, 0) + COALESCE(drcrvalues.dr_value1, 0) + COALESCE(drcrvalues.dr_value, 0),
            COALESCE(drcrvalues.Cr_Opening_Value, 0) + COALESCE(drcrvalues.Cr_value1, 0) + COALESCE(drcrvalues.Cr_value, 0)
        ) IS NOT NULL
) AS FinalResult
ORDER BY Dealer ASC, ACCOUNT_name ASC;
    `;
   
  } 


  else if (category === "debtor" && filter === "all") 
    {
      query = `
      SELECT GROUP_CODE, ACCOUNT_NAME, UNIQ_CODE, ACCOUNT_TYPE, ACCOUNT_CODE, Opening_Value, DR_VALUE, CR_VALUE, CLOSING_BALANCE
FROM (
    SELECT
        group_code,
        ACCOUNT_NAME,
        uniq_code,
        account_type,
        account_code,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0)) - (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0))) AS Opening_Value,
        ROUND(dr_value) AS dr_value,
        ROUND(cr_value) AS cr_value,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0) + COALESCE(dr_value, 0)) -
              (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0) + COALESCE(cr_value, 0))) AS CLOSING_BALANCE
    FROM (
        SELECT
            group_code,
            account_name,
            ACCOUNT_CODE,
            uniq_code,
            account_type,
            parent_group
        FROM fin_mst_account
        WHERE marked IS NULL
            AND ACCOUNT_TYPE = 'A'
            AND ACCOUNT_CODE IN (SELECT DISTINCT ACCOUNT_CODE FROM PRIOR_ACCT WHERE SESS_ID = 8560372)
    ) AccountDtl
    LEFT JOIN (
        SELECT
            fin_mst_t_voucher_det.account_code AS Value_Account_cd,
           
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                     AND fin_mst_t_voucher_hdr.voucher_type = 13  
                     AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS Dr_Opening_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'  
                     AND fin_mst_t_voucher_hdr.voucher_type = 13  
                     AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS Cr_Opening_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'  
                     AND (fin_mst_t_voucher_hdr.voucher_type <> 13
                          AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                          AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY'))
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS Dr_Closing_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'  
                     AND (fin_mst_t_voucher_hdr.voucher_type <> 13
                          AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                          AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY'))
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS Cr_Closing_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'  
                     AND fin_mst_t_voucher_hdr.voucher_type <> 13
                     AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                     AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS dr_value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'  
                     AND fin_mst_t_voucher_hdr.voucher_type <> 13
                     AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                     AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS cr_value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'  
                     AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                     AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                     AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS dr_value1,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'  
                     AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                     AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                     AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(${formatdate} AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0 END), 0) AS cr_value1
        FROM fin_mst_t_voucher_hdr
        JOIN fin_mst_t_voucher_det
            ON fin_mst_t_voucher_hdr.voucher_code = fin_mst_t_voucher_det.voucher_code
        WHERE fin_mst_t_voucher_hdr.billing_co_cd = COALESCE(${req.user.company}, fin_mst_t_voucher_hdr.billing_co_cd)
            AND fin_mst_t_voucher_hdr.status = COALESCE('M', fin_mst_t_voucher_hdr.status)
            AND fin_mst_t_voucher_hdr.company_code = COALESCE(${req.user.company}, fin_mst_t_voucher_hdr.company_code)
            AND fin_mst_t_voucher_hdr.unit_code = COALESCE(${req.user.unit}, fin_mst_t_voucher_hdr.unit_code)
            AND fin_mst_t_voucher_hdr.marked IS NULL
            AND fin_mst_t_voucher_det.marked IS NULL
            AND fin_mst_t_voucher_hdr.company_type = COALESCE('R', fin_mst_t_voucher_hdr.company_type)
        GROUP BY fin_mst_t_voucher_det.account_code
    ) drcrvalues
    ON AccountDtl.ACCOUNT_CODE = drcrvalues.Value_Account_cd
    WHERE NULLIF(drcrvalues.Cr_Closing_Value, drcrvalues.Dr_Closing_Value) IS NOT NULL
) AS FinalResult
`

    
  }


  else if (category === "debtor" && filter === "creditor_closing_balance") 
    {
      query = `
      


SELECT * FROM (
    SELECT  
        AccountDtl.external_entity_code,
        GET_EXTERNAL_ENTITY(AccountDtl.external_entity_code) AS Dealer,
        AccountDtl.ACCOUNT_CODE,
        GET_ACCOUNT(AccountDtl.ACCOUNT_CODE) AS ACCOUNT_name,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0)) -
              (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0))) AS Opening_Value,
        ROUND(dr_value) AS dr_value,
        ROUND(cr_value) AS cr_value,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0) + COALESCE(dr_value, 0)) -
              (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0) + COALESCE(cr_value, 0))) AS Closing_Balance
    FROM  
    (
        SELECT S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE  
        FROM  CONSO_DISTRIBUTOR S
        WHERE S.DISTRIBUTOR_CODE IS NOT NULL
            AND S.REC_TYPE = 'SLS'
            AND EXISTS (
                SELECT 1 FROM PRIOR_ACCT P WHERE P.ACCOUNT_CODE = S.ACCOUNT_CODE AND P.SESS_ID = 8560372
            )
        GROUP BY S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE
    ) AS AccountDtl  
    LEFT JOIN (
        SELECT  
            external_entity_code,
            fin_mst_t_voucher_det.account_code AS Value_Account_cd,
           
            -- Opening Balances
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Dr_Opening_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_Opening_Value,

            -- Transactions in selected period
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(:TO_DATE AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS dr_value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(:TO_DATE AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_value,

            -- Transactions before selected period
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')  
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS dr_value1,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')  
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_value1

        FROM fin_mst_t_voucher_hdr
        JOIN fin_mst_t_voucher_det ON fin_mst_t_voucher_hdr.voucher_code = fin_mst_t_voucher_det.voucher_code
        WHERE
            (fin_mst_t_voucher_hdr.billing_co_cd = COALESCE(:p_bill, fin_mst_t_voucher_hdr.billing_co_cd))
            AND (fin_mst_t_voucher_hdr.status = COALESCE(:p_status, fin_mst_t_voucher_hdr.status))
            AND (fin_mst_t_voucher_hdr.company_code = COALESCE(:p_comp, fin_mst_t_voucher_hdr.company_code))
            AND (fin_mst_t_voucher_hdr.unit_code = COALESCE(:p_site, fin_mst_t_voucher_hdr.unit_code))
            AND fin_mst_t_voucher_hdr.marked IS NULL
            AND fin_mst_t_voucher_det.marked IS NULL
            AND (fin_mst_t_voucher_hdr.company_type = COALESCE(:p_comp_type, fin_mst_t_voucher_hdr.company_type))
        GROUP BY fin_mst_t_voucher_det.account_code, external_entity_code
    ) AS drcrvalues
    ON (drcrvalues.Value_Account_cd = AccountDtl.account_code)  
    AND (drcrvalues.EXTERNAL_ENTITY_CODE = AccountDtl.EXTERNAL_ENTITY_CODE)
    WHERE
        AccountDtl.ACCOUNT_CODE IN ('1165')
        AND NULLIF(
            COALESCE(drcrvalues.Dr_Opening_Value, 0) + COALESCE(drcrvalues.dr_value1, 0) + COALESCE(drcrvalues.dr_value, 0),            
            COALESCE(drcrvalues.Cr_Opening_Value, 0) + COALESCE(drcrvalues.Cr_value1, 0) + COALESCE(drcrvalues.Cr_value, 0)
        ) IS NOT NULL
) AS FinalResult
ORDER BY DEALER ASC, ACCOUNT_NAME ASC;


`

    
  }



  else if (category === "debtor" && filter === "debtor_closing_balance") 
   
   
    {
      query = `
      


SELECT * FROM (
    SELECT  
        AccountDtl.external_entity_code,
        GET_EXTERNAL_ENTITY(AccountDtl.external_entity_code) AS Dealer,
        AccountDtl.ACCOUNT_CODE,
        GET_ACCOUNT(AccountDtl.ACCOUNT_CODE) AS ACCOUNT_name,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0)) -
              (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0))) AS Opening_Value,
        ROUND(dr_value) AS dr_value,
        ROUND(cr_value) AS cr_value,
        ROUND((COALESCE(Dr_Opening_Value, 0) + COALESCE(dr_value1, 0) + COALESCE(dr_value, 0)) -
              (COALESCE(cr_Opening_Value, 0) + COALESCE(cr_value1, 0) + COALESCE(cr_value, 0))) AS Closing_Balance
    FROM  
    (
        SELECT S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE  
        FROM  CONSO_DISTRIBUTOR S
        WHERE S.DISTRIBUTOR_CODE IS NOT NULL
            AND S.REC_TYPE = 'SLS'
            AND EXISTS (
                SELECT 1 FROM PRIOR_ACCT P WHERE P.ACCOUNT_CODE = S.ACCOUNT_CODE AND P.SESS_ID = 8560372
            )
        GROUP BY S.external_entity_code, S.DISTRIBUTOR_CODE, S.ACCOUNT_CODE
    ) AS AccountDtl  
    LEFT JOIN (
        SELECT  
            external_entity_code,
            fin_mst_t_voucher_det.account_code AS Value_Account_cd,
           
            -- Opening Balances
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Dr_Opening_Value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type = 13
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_Opening_Value,

            -- Transactions in selected period
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(:TO_DATE AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS dr_value,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13
                    AND fin_mst_t_voucher_hdr.voucher_date >= TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')
                    AND fin_mst_t_voucher_hdr.voucher_date <= TO_DATE(CAST(:TO_DATE AS TEXT), 'DD-MM-YYYY')
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_value,

            -- Transactions before selected period
            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Debit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')  
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS dr_value1,

            COALESCE(SUM(CASE
                WHEN fin_mst_t_voucher_det.entry_type = 'Credit'
                    AND fin_mst_t_voucher_hdr.voucher_type <> 13  
                    AND fin_mst_t_voucher_hdr.VOUCHER_YEAR IN
                        (SELECT DISTINCT VOUCHER_YEAR FROM FIN_MST_T_VOUCHER_HDR WHERE MARKED IS NULL)
                    AND fin_mst_t_voucher_hdr.voucher_date < TO_DATE(CAST(:From_date AS TEXT), 'DD-MM-YYYY')  
                THEN fin_mst_t_voucher_det.amount ELSE 0
            END), 0) AS Cr_value1

        FROM fin_mst_t_voucher_hdr
        JOIN fin_mst_t_voucher_det ON fin_mst_t_voucher_hdr.voucher_code = fin_mst_t_voucher_det.voucher_code
        WHERE
            (fin_mst_t_voucher_hdr.billing_co_cd = COALESCE(:p_bill, fin_mst_t_voucher_hdr.billing_co_cd))
            AND (fin_mst_t_voucher_hdr.status = COALESCE(:p_status, fin_mst_t_voucher_hdr.status))
            AND (fin_mst_t_voucher_hdr.company_code = COALESCE(:p_comp, fin_mst_t_voucher_hdr.company_code))
            AND (fin_mst_t_voucher_hdr.unit_code = COALESCE(:p_site, fin_mst_t_voucher_hdr.unit_code))
            AND fin_mst_t_voucher_hdr.marked IS NULL
            AND fin_mst_t_voucher_det.marked IS NULL
            AND (fin_mst_t_voucher_hdr.company_type = COALESCE(:p_comp_type, fin_mst_t_voucher_hdr.company_type))
        GROUP BY fin_mst_t_voucher_det.account_code, external_entity_code
    ) AS drcrvalues
    ON (drcrvalues.Value_Account_cd = AccountDtl.account_code)  
    AND (drcrvalues.EXTERNAL_ENTITY_CODE = AccountDtl.EXTERNAL_ENTITY_CODE)
    WHERE
        AccountDtl.ACCOUNT_CODE IN ('1165')
        AND NULLIF(
            COALESCE(drcrvalues.Dr_Opening_Value, 0) + COALESCE(drcrvalues.dr_value1, 0) + COALESCE(drcrvalues.dr_value, 0),            
            COALESCE(drcrvalues.Cr_Opening_Value, 0) + COALESCE(drcrvalues.Cr_value1, 0) + COALESCE(drcrvalues.Cr_value, 0)
        ) IS NOT NULL
) AS FinalResult
ORDER BY DEALER ASC, ACCOUNT_NAME ASC;


`  
  }


  if (category === "netdue" && filter === "customer") {
    
    query = `SELECT
    dist.distributor_name AS customer,
    (dbit - cedit) AS value
FROM (
    SELECT
        d.account_code,
        COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'D' THEN ROUND(d.amount) ELSE 0 END), 0) AS dbit,        
        COALESCE(SUM(CASE WHEN d.ENTRY_TYPE = 'C' THEN ROUND(d.amount) ELSE 0 END), 0) AS cedit
    FROM FIN_MST_T_VOUCHER_HDR h    
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code    
    WHERE h.marked IS NULL    
    AND d.marked IS NULL    
    AND d.account_code = ${account_code} OR ${account_code} IS NULL
    AND h.voucher_date <= CURRENT_DATE
    AND h.status = 'M'  
    AND h.unit_code =${req.user.unit} 
    AND h.COMPANY_code = '${req.user.company}'
    AND (h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day') <= CURRENT_DATE  
    GROUP BY d.account_code
) a
LEFT JOIN sl_mst_distributor dist
    ON a.account_code = dist.account_code
WHERE dist.marked IS NULL;
    `;
   
  } 


  else if (category === "netduebillwise" && filter === "customer") 
    {
      query = `
     WITH voucher_data AS (
  SELECT
    d.amount,
    d.entry_type,
    h.voucher_date,
    h.voucher_code,
    d.account_code,
    get_account(d.account_code) AS acc_nm,
    h.invoice_code,
    COALESCE(d.no_days, 0) AS no_days,
    h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' due_date
  FROM
    FIN_MST_T_VOUCHER_HDR h
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
  WHERE
    h.marked IS NULL
    AND d.marked IS NULL  
    AND h.unit_code = ${req.user.unit}  
    AND (d.account_code = COALESCE( ${account_code}, d.account_code))  
  AND h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' <= CURRENT_DATE
),
credit_sum AS (
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'C' THEN amount ELSE 0 END), 0) AS total_credit
  FROM voucher_data
),
running_balance AS (
  SELECT
    v.*,
    SUM(CASE WHEN v.entry_type = 'D' THEN v.amount ELSE 0 END)
      OVER (ORDER BY v.due_date, v.voucher_code) - cs.total_credit AS balance
  FROM
    voucher_data v
    CROSS JOIN credit_sum cs
  WHERE
    v.entry_type = 'D'
)
SELECT
  voucher_code,
  invoice_code,
  voucher_date,
  CASE
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) <= 0
    THEN balance
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) > 0
    THEN amount
    ELSE balance
  END AS pending_amount,
  entry_type,
  get_account(account_code) AS account_name,
  account_code,
  no_days,
  due_date,
  GREATEST(EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER, 0) AS overdue_days
FROM
  running_balance
WHERE
  balance > 0
ORDER BY
  due_date,
  voucher_code;
`;

    
  }
 
 
  if (category === "netdue" && filter === "vendor") {
    
    query = `select vendor  ,(CR-DR)Due
from (SELECT
    COALESCE(SUM(CASE WHEN d.entry_type = 'D' THEN ROUND(d.amount) ELSE 0 END), 0) AS DR,
    COALESCE(SUM(CASE WHEN d.entry_type = 'C' THEN ROUND(d.amount) ELSE 0 END), 0) AS CR,
    get_party(p.party_code)vendor  
FROM FIN_MST_T_VOUCHER_HDR h
JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
LEFT JOIN pur_mst_party p ON d.account_code = p.account_code AND p.marked IS NULL -- Fetch party details
WHERE h.marked IS NULL
AND d.marked IS NULL
AND d.account_code = ${account_code} OR ${account_code} IS NULL
AND h.voucher_date <= CURRENT_DATE
AND h.status = 'M'
AND h.unit_code = ${req.user.unit} 
AND h.company_code = '${req.user.company}'
AND (h.voucher_date + COALESCE(d.no_days::INT, 0) * INTERVAL '1 day') <= CURRENT_DATE
GROUP BY d.account_code, p.party_code
ORDER BY UPPER(TRIM(p.party_name)))a
    `;
   
  } 


  else if (category === "netduebillwise" && filter === "vendor") 
    {
      query = `
     WITH voucher_data AS (
  SELECT
    d.amount,
    d.entry_type,
    h.voucher_date,
    h.voucher_code,
    d.account_code,
    get_account(d.account_code) AS acc_nm,
    h.invoice_code,
    COALESCE(d.no_days, 0) AS no_days,
    h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' due_date
  FROM
    FIN_MST_T_VOUCHER_HDR h
    JOIN FIN_MST_T_VOUCHER_DET d ON h.voucher_code = d.voucher_code
  WHERE
    h.marked IS NULL
    AND d.marked IS NULL  
    AND h.unit_code = ${req.user.unit}  
    AND (d.account_code = COALESCE(${account_code}, d.account_code))  
  AND h.voucher_date + COALESCE(d.no_days, 0) * INTERVAL '1 day' <= CURRENT_DATE
),
credit_sum AS (
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'C' THEN amount ELSE 0 END), 0) AS total_credit
  FROM voucher_data
),
running_balance AS (
  SELECT
    v.*,
    SUM(CASE WHEN v.entry_type = 'D' THEN v.amount ELSE 0 END)
      OVER (ORDER BY v.due_date, v.voucher_code) - cs.total_credit AS balance
  FROM
    voucher_data v
    CROSS JOIN credit_sum cs
  WHERE
    v.entry_type = 'D'
)
SELECT
  voucher_code,
  invoice_code,
  voucher_date,
  CASE
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) <= 0
    THEN balance
    WHEN balance > 0 AND LAG(balance) OVER (ORDER BY due_date, voucher_code) > 0
    THEN amount
    ELSE balance
  END AS pending_amount,
  entry_type,
  get_account(account_code) AS account_name,
  account_code,
  no_days,
  due_date,
  GREATEST(EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INTEGER, 0) AS overdue_days
FROM
  running_balance
WHERE
  balance > 0
ORDER BY
  due_date,
  voucher_code;
`;

    
  }


  if (!query) {
    return res.status(400).json({ status: "error", message: "Invalid category or filter" });
  }


  try {
    console.log("Executing Query:", query, values);
    const result = await client.query(query, values);
    res.status(200).json({ status: "success", data: result.rows });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});









