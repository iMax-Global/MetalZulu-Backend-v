const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  console.log("---------------manoj from purchase dashboard------------------------------");
  console.log(req.user,"req.user is this");
  const client = req.dbConnection;

  const TotalIndentMonthly = await client.query(
    `select count(*) from PUR_RM_REQUISITION_HDR where marked is null AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    AND plan_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date;`
  );

  const TotalIndentMonthlyValue = TotalIndentMonthly.rows[0].count;

  const TotalIndentYearly = await client.query(
    `select count(*) from PUR_RM_REQUISITION_HDR where marked is null AND company_code = ${req.user.company} AND unit_code  = ${req.user.unit}
    AND plan_date BETWEEN current_date::date - INTERVAL '1 year' AND current_date;`
  );

  const TotalIndentYearlyValue = TotalIndentYearly.rows[0].count;

  const TotalPendingIndent = await client.query(
    `select count(*) from PUR_RM_REQUISITION_HDR where marked is null AND company_code = ${req.user.company} AND unit_code =${req.user.unit}
    and coalesce(rq_code,'A') not in (select coalesce(req_code,'A') from PUR_RMDEAL_HDR where marked is null
    and unit_code=${req.user.unit} and company_code=${req.user.company})`
  );

  const TotalPendingIndentValue = TotalPendingIndent.rows[0].count;

  const TotalMonthlyPo = await client.query(
    `select count(*) from PUR_RMDEAL_HDR  where  marked is null and unit_code=${req.user.unit} and company_code=${req.user.company} 
    AND deal_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date;`
  );

  const TotalMonthlyPoValue = TotalMonthlyPo.rows[0].count;

  const TotalYearlyPo = await client.query(
    `select count(*) from PUR_RMDEAL_HDR  where  marked is null and unit_code=${req.user.unit} and company_code=${req.user.company}
    AND deal_date BETWEEN current_date::date - INTERVAL '1 year' AND current_date;`
  );

  const TotalYearlyPoValue = TotalYearlyPo.rows[0].count;

  const TotalPendingPoforgatepass = await client.query(
    `select count(*) from PUR_RMDEAL_HDR  where  marked is null and unit_code=${req.user.unit} and company_code=${req.user.company}
    and coalesce(rmd_code,'A') not in (select coalesce(po_ref,'A') from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and company_code=${req.user.company}
    and against_of='P')`
  );

  const TotalPendingPoValue = TotalPendingPoforgatepass.rows[0].count;

  const TotalPendingPoformrir = await client.query(
    `SELECT COUNT(*)
    FROM PUR_RMDEAL_HDR
    WHERE marked IS NULL
      AND unit_code = ${req.user.unit}
      AND company_code = ${req.user.company}
      AND COALESCE(rmd_code, 'A')
      NOT IN (
            SELECT COALESCE(po_ref, 'A')
            FROM pur_mrir_hdr
            WHERE marked IS NULL
              AND unit_code =${req.user.unit}
              AND company_code = ${req.user.company}
          )`
  );

  const TotalPendingPoformrirValue = TotalPendingPoformrir.rows[0].count;

  const TotalMonthlyGate = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company} and against_of='P' AND arrival_date 
    BETWEEN current_date::date - INTERVAL '30 days' AND current_date;`
  );

  const TotalMonthlyGateValue = TotalMonthlyGate.rows[0].count;

  const TotalYearlyGatePass = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and company_code=${req.user.company} and against_of='P' AND arrival_date BETWEEN current_date::date -  INTERVAL '1 year' AND current_date;`
  );

  const TotalYearlyGatePassValue = TotalYearlyGatePass.rows[0].count;

  const TotalPendingGatepassforgatepass = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company} and against_of='P' and coalesce(factory_arrival_code,'A') not in (select coalesce(gate_pass,'A') from
    pur_mrir_hdr where marked is null and company_code=${req.user.company} and unit_code=${req.user.unit})`
  );

  const TotalPendingGatepassforgatepassValue =
    TotalPendingGatepassforgatepass.rows[0].count;
  console.log(TotalPendingGatepassforgatepassValue);

  const allItemWithAmount = await client.query(
    `SELECT  get_item(item_code) AS row_meterial, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM
        pur_mrir_det
    WHERE
        marked IS null and company_code=${req.user.company} and unit_code=${req.user.unit} and item_code in (select item_code from
        sl_mst_item where marked is null and item_category=4)
    GROUP BY
        item_code
    LIMIT 5;`
  );
  // console.log(allItemWithAmount.rows);
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  // console.log(`Executing query:
  // SELECT  get_item_group(s.item_group_cd) AS item, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
  //   FROM
  //       sl_mst_item s, pur_mrir_det d
  //   where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit}and d.item_code=s.item_code
  //   and d.item_code in (select item_code from
  //       sl_mst_item where marked is null and item_category=5)
  //   GROUP BY
  //       s.item_group_cd
  //   LIMIT 5;
  // `);

  const allSizeWithAmount = await client.query(
    `SELECT  get_item_group(s.item_group_cd) AS consumable_group, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
    FROM
        sl_mst_item s, pur_mrir_det d
    where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit} and d.item_code=s.item_code
    and d.item_code in (select item_code from
        sl_mst_item where marked is null and item_category=5)
    GROUP BY
        s.item_group_cd
    LIMIT 5;`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,
    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allGradeWithAmount = await client.query(
    `SELECT  get_party(s.party_code) AS vendor, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
    FROM
        pur_mrir_hdr s, pur_mrir_det d
    where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit} and s.mrir_code=d.mrir_code
    GROUP BY
        s.party_code
    LIMIT 5;`
  );
  const formattedDataGrade = allGradeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allCustomerWithAmount = await client.query(
    `SELECT  get_item(item_code) AS consumable_item, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM
        pur_mrir_det
    WHERE
        marked IS null and company_code=${req.user.company} and unit_code=${req.user.unit} and item_code in (select item_code from
        sl_mst_item where marked is null and item_group_cd=7)
    GROUP BY
        item_code
    LIMIT 10;`
  );
  const formattedDataCustomer = allCustomerWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));
  ///////////////////////////////////////////////////////////NNNNNNNNNNNNNNNEWWWWWWWWWWWWWDDDDDDDDDDDDDDDDDDDDDD

  res.status(200).json({
    status: "success",
    data: {
      TotalIndentMonthlyValue,
      TotalIndentYearlyValue,
      TotalPendingIndentValue,
      TotalMonthlyPoValue,
      TotalYearlyPoValue,
      TotalPendingPoValue,
      TotalPendingPoformrirValue,
      TotalMonthlyGateValue,
      TotalYearlyGatePassValue,
      TotalPendingGatepassforgatepassValue,
      allItemWithAmount,
      formattedData,
      formattedDataSize,
      formattedDataGrade,
      formattedDataCustomer,
    },
  });
});
