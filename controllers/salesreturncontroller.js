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

exports.salesdata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(
    "vyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
  );
  const saledata = await client.query(`SELECT H.GRN_NO AS REF_INVOICE,
       H.INVOICE_DATE,
       H.invoice_type,
       --GET_INVOICE_TYPE(H.invoice_type) AS INVOICE_TYPE_DESC,
       GET_DISTRIBUTOR(H.DISTRIBUTOR_CODE) AS DISTRIBUTOR,
       GET_DEALER_NAME(H.DEALER_CODE) AS DEALER_NAME,
       get_del_site(H.DEL_ADD) address,
       H.DEL_ADD,
       H.ACCOUNT_CODE,
       H.INVOICE_NO,
       H.UNIT_CODE,
       H.DISTRIBUTOR_CODE,
       H.DEALER_CODE,
       H.FACTORY_WEIGHT,
       (COALESCE(H.FACTORY_WEIGHT, 0) - 
        (SELECT COALESCE(SUM(COALESCE(RET_WT, 0)), 0) 
         FROM SL_SALE_RETURN_SIZE_DETAIL 
         WHERE MARKED IS NULL 
           AND INVOICE_NO = COALESCE(H.INVOICE_NO, 'X')  
           AND UNIT_CODE = COALESCE(H.UNIT_CODE, 0))
       ) AS BAL_WT
FROM SL_TRANS_INVOICE_HDR H
WHERE MARKED IS NULL 
  AND CANCEL1 IS NULL 
--  AND UNIT_CODE = 1 
  --AND FIN_YEAR = '2324'
/*  AND (COALESCE(H.FACTORY_WEIGHT, 0) - 
       (SELECT COALESCE(SUM(COALESCE(RET_WT, 0)), 0) 
        FROM SL_SALE_RETURN_SIZE_DETAIL 
        WHERE MARKED IS NULL 
          AND INVOICE_NO = COALESCE(H.INVOICE_NO, 'X') 
          AND UNIT_CODE = COALESCE(H.UNIT_CODE, 0))
      ) > 0;*/
;
`);

  const invodata = await client.query(`


    SELECT D.ITEM_CODE,
	get_item(D.ITEM_CODE)item_name,
       D.SIZE_CODE,
	get_size(D.SIZE_CODE)size_name,
    D.SIZE_CODE,
    D.QUALITY,
    get_quality(D.QUALITY)grade,
    D.NO_PCS,
    D.QTY,
    D.BOOKING_RATE,
    D.INVOICE_NO,
    D.UNIQ_CODE,
    D.ITEM_ACC_CODE,
    D.BOOKING_NO,
    D.SAUDA_CODE,
    D.STORE_CD  
FROM SL_TRANS_INV_SIZE_DETAIL D 
WHERE D.MARKED IS NULL 
AND D.INVOICE_NO IN (
   SELECT COALESCE(invoice_no, 'X') 
   FROM SL_TRANS_INVOICE_HDR H 
   WHERE H.MARKED IS NULL 
    -- AND H.UNIT_CODE = 1 
   --  AND H.FIN_YEAR = Fin_Yr(:SALES_RETURN_DATE)
     AND H.INVOICE_NO = D.INVOICE_NO
);
`);

  //   const ac_data = await client.query('SELECT distributor_code, distributor_name, account_code  from sl_mst_distributor');

  res.status(200).json({
    status: "success",
    data: {
      saledata,
      invodata,
    },
  });
});

exports.invodata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const invodata = await client.query(`


    SELECT D.ITEM_CODE,
    D.SIZE_CODE,
    D.QUALITY,
    D.NO_PCS,
    D.QTY,
    D.BOOKING_RATE,
    D.INVOICE_NO,
    D.UNIQ_CODE,
    D.ITEM_ACC_CODE,
    D.BOOKING_NO,
    D.SAUDA_CODE,
    D.STORE_CD  
FROM SL_TRANS_INV_SIZE_DETAIL D 
WHERE D.MARKED IS NULL 
AND D.INVOICE_NO IN (
   SELECT COALESCE(invoice_no, 'X') 
   FROM SL_TRANS_INVOICE_HDR H 
   WHERE H.MARKED IS NULL 
    -- AND H.UNIT_CODE = 1 
   --  AND H.FIN_YEAR = Fin_Yr(:SALES_RETURN_DATE)
     AND H.INVOICE_NO = D.INVOICE_NO
);
`);

  //   const ac_data = await client.query('SELECT distributor_code, distributor_name, account_code  from sl_mst_distributor');

  res.status(200).json({
    status: "success",
    data: {
      invodata,
    },
  });
});

exports.insertSaleReturn = wrapper(async (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({
      status: "fail",
      message: "Failed to insert data",
    });
  }

  const client = req.dbConnection;
  const {
    invoice_no,
    trans_code,
    driver_name,
    truck_no,
    remarks,
    total_qty,
    net_amount,
    distributor_code,
    dealer_code,
    invoice_type_code,
    delivery_add,
    invoice_date,
    sales_return_code,
    sales_return_date,
    voucher_code,
  } = req.body;

  try {
    const insertQuery = `
        INSERT INTO sl_trans_sale_return_hdr (
          invoice_no,
          trans_code,
          driver_name,
          truck_no,
          remarks,
          total_qty,
          net_amount,
          distributor_code,
          dealer_code,
          invoice_type_code,
          delivery_add,
          invoice_date,
          sales_return_code,
          sales_return_date,
          voucher_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15)
      `;

    const values = [
      invoice_no || null, // character varying
      trans_code || null,
      driver_name || null,
      truck_no || null,
      remarks || null,
      total_qty ? parseFloat(total_qty) : null, // numeric
      net_amount ? parseFloat(net_amount) : null, // numeric
      distributor_code || null,
      dealer_code ? parseInt(dealer_code) : null, // integer
      invoice_type_code ? parseInt(invoice_type_code) : null, // bigint
      delivery_add ? parseInt(delivery_add) : null, // smallint
      invoice_date ? new Date(invoice_date) : null, // timestamp without time zone
      sales_return_code || null,
      sales_return_date ? new Date(sales_return_date) : null, // timestamp without time zone
      voucher_code || null, // character varying
    ];

    await client.query(insertQuery, values);

    res.status(200).json({
      status: "success",
      message: "Data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to insert data",
    });
  }
});

exports.insertSaleReturnSizeDetail = wrapper(async (req, res, next) => {
  // // console.log(
  //   "hi8888888888888888888888888888888888888888888888888888888888888888888"
  // );
  // // console.log(
  //   "hi8888888888888888888888888888888888888888888888888888888888888888888"
  // );
  const { sizeDetails } = req.body;
  // if ( !req.body.details || !Array.isArray(req.body.details)) {
  //   return res.status(400).json({
  //     status: 'fail',
  //     message: 'Failed   data',
  //   });
  // }

  const client = req.dbConnection;
  // Assuming details is an array of objects with the necessary fields
  // console.log(sizeDetails, "dddddddddddddddddddddddddddddddddddddddddddddddd");
  try {
    const insertQuery = `
        INSERT INTO sl_sale_return_size_detail (
          item_code,
          size_code,
          quality,
          ret_pcs,
          ret_wt,
          f_rate,
          amount,
          invoice_no,
          invoice_uniq
        ) VALUES 
        ${sizeDetails
          .map(
            (_, index) => `(
          $${index * 9 + 1}, $${index * 9 + 2}, $${index * 9 + 3}, 
          $${index * 9 + 4}, $${index * 9 + 5}, $${index * 9 + 6}, 
          $${index * 9 + 7}, $${index * 9 + 8}, $${index * 9 + 9}
        )`
          )
          .join(", ")}
        `;

    // Constructing the VALUES part of the query
    const values = sizeDetails.flatMap((detail) => [
      detail.item_code,
      detail.size_code,
      detail.quality_code,
      detail.no_pcs,
      detail.return_wt,
      detail.booking_rate,
      detail.amount,
      detail.invoice_no,
      detail.uniq_code,
    ]);

    await client.query(insertQuery, values);
    res.status(200).json({
      status: "success",
      message: "Data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      status: "error",
      message: " to insert data",
    });
  }
});
