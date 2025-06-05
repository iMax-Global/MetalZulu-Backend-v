const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  // console.log("manoj");
  const client = req.dbConnection;

  const TotalSaudaMonthly = await client.query(
    `select coalesce(SUM(CLOSING_BALANCE),0) from vw_financial_account_summary
    where ACCOUNT_CODE in (select ACCOUNT_CODE from FIN_MST_ACCOUNT where PARENT_GROUP='37')`
  );

  const TotalSaudaMonthlyValue = TotalSaudaMonthly.rows[0].coalesce;

  const TotalSaudaYearly =
    await client.query(`select coalesce(SUM(CLOSING_BALANCE),0) from vw_financial_account_summary
  where ACCOUNT_CODE in (select ACCOUNT_CODE from FIN_MST_ACCOUNT where PARENT_GROUP='15')`);

  const TotalSaudaYearlyValue = TotalSaudaYearly.rows[0].coalesce;

  const TotalPendingSauda = await client.query(
    `
      select count(*)
from PUR_STORE_REQ_HDR  
where marked is null AND company_code = ${req.user.company}
AND unit_code = ${req.user.unit}
AND req_code not in (select req_code from PUR_TRANS_INGOT_ISSUE_hdr where marked is null)`
  );

  const TotalPendingSaudaValue = TotalPendingSauda.rows[0].count;

  const TotalMonthlyOrder = await client.query(
    `SELECT count(*)
FROM pur_trans_ingot_issue_hdr p
WHERE
    p.marked IS NULL
    AND company_code =  ${req.user.company}
    AND unit_code = ${req.user.unit}
    AND issue_date = current_date - INTERVAL '1 day';`
  );

  const TotalMonthlyOrderValue = TotalMonthlyOrder.rows[0].count;

  const TotalYearlyOrder = await client.query(
    `SELECT count(*)
FROM pur_trans_ingot_issue_hdr p
WHERE
    p.marked IS NULL
    AND company_code = ${req.user.company}
    AND unit_code = ${req.user.unit}
    AND issue_date = current_date`
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

  // graph
  const allItemWithAmount = await client.query(
    `select coalesce(SUM(CLOSING_BALANCE),0) as balance from vw_financial_account_summary
    where ACCOUNT_CODE in (select ACCOUNT_CODE from FIN_MST_ACCOUNT where PARENT_GROUP='37')`
  );
  console.log(allItemWithAmount, "rttttttttttttttttttttttttt");
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    balance: Number(row.balance), // Convert qty to number
    // Convert amount to number
  }));

  const allSizeWithAmount = await client.query(
    `select coalesce(SUM(CLOSING_BALANCE),0) as balance from vw_financial_account_summary
    where ACCOUNT_CODE in (select ACCOUNT_CODE from FIN_MST_ACCOUNT where PARENT_GROUP='15')`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,

    balance: Number(row.balance), // Convert qty to number
    // Convert amount to number
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
    `select account_name,sum(closing_balance)outstanding from vw_financial_account_summary where closing_balance>0
    group by account_name
    limit 10 `
  );

  console.log(
    allCustomerWithAmount,
    "TTTTTTTTTTTTTTTTTTTTTTTTTyyyyyyyyyyyyyyyyyyyyy"
  );
  const formattedDataCustomerNew = allCustomerWithAmount.rows.map((row) => ({
    ...row,

    account_name: row.account_name, // Convert qty to number
    outstanding: Number(row.outstanding), // Convert amount to number
  }));

  const allCustomerWithQuantity = await client.query(
    `select account_name,sum(closing_balance)outstanding from vw_financial_account_summary where closing_balance>0
    group by account_name
    limit 10`
  );

  const formattedDataCustomerty = allCustomerWithQuantity.rows.map((row) => ({
    ...row,

    account_name: row.account_name, // Convert qty to number
    outstanding: Number(row.outstanding), // Convert amount to number
  }));
  ///////////////////////////////////////////////////////////NNNNNNNNNNNNNNNEWWWWWWWWWWWWWDDDDDDDDDDDDDDDDDDDDDD

  const allSalesOrder = await client.query(
    `select count(*) from sl_trans_booking_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  );

  const totalSalesOrder = allSalesOrder.rows[0].count;

  const totalQty = await client.query(
    `select sum(total_qty)  from sl_trans_booking_size_detail where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  );
  const totalQtyOfOrder = totalQty.rows[0].sum;
  // console.log(totalQtyOfOrder);

  const customerWithSale = await client.query(`select sum(total_qty)quantity,
  get_distributor(distributor_code) from sl_trans_invoice_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit} group by distributor_code
  order BY sum(total_qty) DESC 
  LIMIT 5;`);

  const userColors = ["#ff0000", "#00ff00", "#0000ff", "#9FE2BF", "#FF7F50"];
  const randomColor = () => {
    return userColors[Math.floor(Math.random() * userColors.length)];
  };

  // const customerWithSale = data.map((customer) => ({
  // ...customer,
  //   color: randomColor()
  // }));

  const data = customerWithSale.rows.map((row) => ({
    ...row,
    quantity: parseFloat(row.quantity),
    color: randomColor(),
  }));
  // // console.log(data,  "afterconvert ooooonummmmmmber");
  //how assign for each let userColors = ['#ff0000', '#00ff00', '#0000ff', '#9FE2BF', '#FF7F50']; in data
  const itemQty =
    await client.query(`select get_item(item_code)item , sum(qty)qty from sl_trans_inv_size_detail where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
    group by item_code`);
  const itemQtyOfOrder = itemQty.rows.map((row) => ({
    ...row,

    qty: parseFloat(row.qty),
  }));

  const AllInvoice = await client.query(
    `select count(*) from sl_trans_invoice_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  );
  const AllInvoices = AllInvoice.rows[0].count;

  const AllInvoiceQty = await client.query(
    `select sum(total_qty)qty1 from sl_trans_inv_size_detail where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  );

  const AllInvoiceQtys = AllInvoiceQty.rows[0].qty1;
  // console.log(AllInvoiceQtys, "AllInvoiceQtys");
  const PendingSales = await client.query(`select count(*) from 
    (SELECT h.booking_code,
        sum(d.qty) AS order_qty,
        sum(si.inv_qty) AS invoice_qty,
        COALESCE(sum(d.qty), 0::numeric) - COALESCE(sum(si.inv_qty), 0::numeric) AS balance_qty,
        h.booking_status
       FROM sl_trans_booking_size_detail d,
        sl_trans_booking_hdr h
        left JOIN ( SELECT idt.booking_no,
                ih.unit_code,
                sum(idt.qty) AS inv_qty
               FROM sl_trans_invoice_hdr ih,
                sl_trans_inv_size_detail idt
              WHERE ih.marked IS NULL AND idt.marked IS NULL AND ih.invoice_no::text = idt.invoice_no::text
              GROUP BY idt.booking_no, ih.unit_code) si ON si.booking_no::text = h.booking_code::text
      WHERE d.booking_code::text = h.booking_code::text AND h.booking_status IS NULL AND h.marked IS NULL and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit} AND d.marked IS NULL 
      group by h.booking_code) as t 
      `);
  const PendingSales1 = PendingSales.rows[0].count;
  // console.log(PendingSales1, "AllInvoiceQtys1");
  const PendingSalesQty = await client.query(` select sum(balance_qty) from
         (SELECT h.booking_code,
           sum(d.qty) AS order_qty,
           sum(si.inv_qty) AS invoice_qty,
           COALESCE(sum(d.qty), 0::numeric) - COALESCE(sum(si.inv_qty), 0::numeric) AS balance_qty,
           h.booking_status
          FROM sl_trans_booking_size_detail d,
           sl_trans_booking_hdr h
           left JOIN ( SELECT idt.booking_no,
                   ih.unit_code,
                   sum(idt.qty) AS inv_qty
                  FROM sl_trans_invoice_hdr ih,
                   sl_trans_inv_size_detail idt
                 WHERE ih.marked IS NULL AND idt.marked IS NULL AND ih.invoice_no::text = idt.invoice_no::text
                 GROUP BY idt.booking_no, ih.unit_code) si ON si.booking_no::text = h.booking_code::text
         WHERE d.booking_code::text = h.booking_code::text AND h.booking_status IS NULL AND h.marked IS NULL and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit} AND d.marked IS NULL 
         group by h.booking_code) as t `);
  const PendingSalesQtys = PendingSalesQty.rows[0].sum;
  // console.log(PendingSalesQtys, "AllInvoiceQtys2");
  const LedgerAmount = await client.query(`SELECT
    sum(amt) AS amount,
    CASE
        WHEN COALESCE(sum(amt), 0) < 0 THEN 'Dr'
        WHEN COALESCE(sum(amt), 0) >= 0 THEN 'Cr'
    END AS TYPE
FROM (
    SELECT
        d.distributor_code,
        d.distributor_name,
        d.account_code AS ACC_CODE,
        (
            SELECT COALESCE(SUM(ROUND(D_TOT_AMT)), 0) - COALESCE(SUM(ROUND(C_TOT_AMT)), 0) AS amount
            FROM (
                SELECT
                    CASE l.entry_type
                        WHEN 'Credit' THEN l.amount * -1
                        ELSE l.amount
                    END AS C_TOT_AMT,
                    CASE l.entry_type
                        WHEN 'Debit' THEN l.amount * -1
                        ELSE l.amount
                    END AS D_TOT_AMT
                FROM
                    FIN_MST_T_VOUCHER_HDR f
                    JOIN FIN_MST_T_VOUCHER_DET l ON (f.voucher_code = l.voucher_code)
                WHERE
                    f.marked IS NULL
                    AND l.marked IS NULL
                  AND (f.voucher_date::date + COALESCE(CAST(l.no_days AS INTEGER), 0)) <= CURRENT_DATE
                    AND (l.account_code = d.account_code)
            ) AS y
        ) AS amt
    FROM
        sl_mst_distributor d
    WHERE
        d.marked IS NULL
) AS T`);
  const LedgerAmounts = LedgerAmount.rows[0].amount;
  // console.log(LedgerAmounts, "AllInvoiceQtys3");
  let LedgerAmountType = LedgerAmount.rows[0].type;
  if (LedgerAmountType === "Dr") {
    LedgerAmountType = "Debit";
  } else {
    LedgerAmountType = "Credit";
  }
  // // console.log(itemQtyOfOrder, "itemQtyOfOrder");
  //   // console.log(itemQtyOfOrder, "itemQtyOfOrder");
  // customerWithSale.rows.forEach(customer => {
  //   customer.total_qty = customer.quantity;
  //   customer.distributor_name = customer.distributor_code;
  // });
  // const topCustomerWithSale = customerWithSale.rows;
  // res.status(200).json({
  //   status:'success',
  //   data: {
  //     totalSalesOrder,
  //     totalQtyOfOrder,
  //     topCustomerWithSale
  //     },
  //   });

  res.status(200).json({
    status: "success",
    data: {
      totalSalesOrder,
      totalQtyOfOrder,
      customerWithSale,
      data,
      itemQtyOfOrder,
      AllInvoices,
      AllInvoiceQtys,
      PendingSales1,
      PendingSalesQtys,
      LedgerAmounts,
      LedgerAmountType,
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
      formattedDataCustomerNew,
      formattedDataCustomerty,
    },
  });
});
