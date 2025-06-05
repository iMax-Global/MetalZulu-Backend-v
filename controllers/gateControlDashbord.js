const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  // console.log("manoj");
  const client = req.dbConnection;

  const TotalSaudaMonthly = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company} and against_of='P' AND arrival_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date;`
  );

  const TotalSaudaMonthlyValue = TotalSaudaMonthly.rows[0].count;

  const TotalSaudaYearly = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company}  and against_of='P' AND arrival_date BETWEEN current_date::date -  INTERVAL '1 year' AND current_date;`
  );

  const TotalSaudaYearlyValue = TotalSaudaYearly.rows[0].count;

  const TotalPendingSauda = await client.query(
    `select count(*) from Pur_factory_arrival_hdr where marked is null and unit_code=1 and
    company_code=${req.user.company} and against_of='P' and coalesce(factory_arrival_code,'A') not in (select coalesce(gate_pass,'A') from
    pur_mrir_hdr where marked is null and company_code=${req.user.company}  and unit_code=${req.user.unit} )`
  );

  const TotalPendingSaudaValue = TotalPendingSauda.rows[0].count;

  const TotalMonthlyOrder = await client.query(
    `select count(*) from gate_pass_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company} AND gp_date 
    BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

  const TotalMonthlyOrderValue = TotalMonthlyOrder.rows[0].count;

  const TotalYearlyOrder = await client.query(
    `select count(*) from gate_pass_hdr where marked is null and unit_code=${req.user.unit} and
    company_code=${req.user.company}  AND gp_date
    BETWEEN current_date::date - INTERVAL '1 year' AND current_date;`
  );

  const TotalYearlyOrderValue = TotalYearlyOrder.rows[0].count;

  const TotalPendingOrder = await client.query(
    `SELECT count(*)
    FROM sl_trans_booking_hdr
    WHERE marked IS NULL
      AND company_code =${req.user.company}
      AND unit_code =  ${req.user.unit}
     and coalesce(booking_code,'A') not in (select coalesce(booking_NO,'A') from sl_trans_invoice_hdr where marked is null and unit_code= ${req.user.unit}
     and company_code=${req.user.company})`
  );

  const TotalPendingOrderValue = TotalPendingOrder.rows[0].count;

  const TotalInvoiceMonthly = await client.query(
    ` select count(*) from sl_trans_invoice_hdr where marked is null AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    AND invoice_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date;`
  );

  const TotalInvoiceMonthlyValue = TotalInvoiceMonthly.rows[0].count;

  const TotalInvoiceYearly = await client.query(
    ` select count(*) from sl_trans_invoice_hdr where marked is null AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    AND invoice_date BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
  );

  const TotalInvoiceYearlyValue = TotalInvoiceYearly.rows[0].count;

  const allItemWithAmount = await client.query(
    `select sum(quantity) qty, get_item(item_code)item
from Pur_factory_arrival_det where marked is null and unit_code=${req.user.unit} and
company_code=${req.user.company} and fin_year ='${req.user.finyear}'
group by item_code`
  );
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    item: row.item, // Convert amount to number
  }));

  const allSizeWithAmount = await client.query(
    `select get_item(d.item_code)item,sum(d.quantity)qty
    from gate_pass_hdr h, gate_pass_det d
    where h.marked is null and d.marked is null and h.gp_code=d.gp_code
    and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}'
    group by d.item_code`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    item: row.item, // Convert amount to number
  }));

  const allGradeWithAmount = await client.query(
    `SELECT  get_quality(quality_code) AS grade, SUM(total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        quality_code 
    LIMIT 5;`
  );
  const formattedDataGrade = allGradeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allCustomerWithAmount = await client.query(
    `SELECT  get_distributor(h.distributor_code) AS customer, SUM(d.total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_invoice_hdr h, sl_trans_inv_size_detail D
    WHERE 
        h.marked IS NULL and d.marked is null  AND h.company_code = ${req.user.company} AND h.unit_code = ${req.user.unit} and h.invoice_no=d.invoice_no
    GROUP BY 
        h.distributor_code 
    LIMIT 5;`
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
      TotalSaudaMonthlyValue,
      TotalSaudaYearlyValue,
      TotalPendingSaudaValue,
      TotalMonthlyOrderValue,
      TotalYearlyOrderValue,
      TotalPendingOrderValue,
      TotalInvoiceMonthlyValue,
      TotalInvoiceYearlyValue,
      allItemWithAmount,
      formattedData,
      formattedDataSize,
      formattedDataGrade,
      formattedDataCustomer,
    },
  });
});
