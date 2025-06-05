const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  console.log("manoj");
  const client = req.dbConnection;
// console.log(req.user, "req.user");
 
const TotalSaudaMonthly = await client.query(
    `SELECT
    COUNT(*) AS record_count
FROM
    sl_trans_sauda_hdr
WHERE
    marked IS NULL
    AND company_code = ${req.user.company}
    AND unit_code = ${req.user.unit}
  AND fin_year ='${req.user.finyear}'
    AND sauda_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

const TotalSaudaMonthlyValue = TotalSaudaMonthly.rows[0].record_count;

  const TotalSaudaYearly = await client.query(
    `SELECT
    COUNT(*) AS record_count
FROM
    sl_trans_sauda_hdr
WHERE
    marked IS NULL
    AND company_code = ${req.user.company}
    AND unit_code = ${req.user.unit}
    --AND fin_year = '${req.user.finyear}'
    AND sauda_date BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
  );

  const TotalSaudaYearlyValue = TotalSaudaYearly.rows[0].record_count;

  const TotalPendingSauda = await client.query(
    `SELECT count(*)
    FROM sl_trans_sauda_hdr h
    WHERE h.marked IS NULL
      AND h.company_code = ${req.user.company}
      AND h.unit_code = ${req.user.unit}
      AND h.fin_year = '${req.user.finyear}'
      AND coalesce(h.sauda_code,'A') NOT IN (
          SELECT coalesce(sauda_code,'A')
          FROM sl_trans_booking_hdr
          WHERE marked IS NULL
            AND company_code = ${req.user.company}
            AND unit_code = ${req.user.unit}
      )`
  );

  const TotalPendingSaudaValue = TotalPendingSauda.rows[0].count;

  const TotalMonthlyOrder = await client.query(
    `SELECT count(*)
    FROM sl_trans_booking_hdr
    WHERE marked IS NULL
      AND company_code = ${req.user.company}
      AND unit_code = ${req.user.unit}
       AND booking_date BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

  const TotalMonthlyOrderValue = TotalMonthlyOrder.rows[0].count;

  const TotalYearlyOrder = await client.query(
    `SELECT count(*)
    FROM sl_trans_booking_hdr
    WHERE marked IS NULL
      AND company_code = ${req.user.company}
      AND unit_code = ${req.user.unit}
       AND booking_date BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
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
    `SELECT  get_item(item_code) AS item, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        item_code 
    LIMIT 5;`
  );
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allSizeWithAmount = await client.query(
    `SELECT  get_size(size_code) AS size, SUM(total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        size_code 
    LIMIT 5;`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
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
      formattedDataCustomer,
    },
  });
});
