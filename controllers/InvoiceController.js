/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { Console } = require("console");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");
const { reverse } = require("dns");

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../SalesInvoice.json`, "utf8")
);

const generateInvoiceId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(invoice_no from '[0-9]+$') AS INTEGER)) AS M FROM sl_trans_invoice_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `I12526-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `I12526-${num}`;
  }
};

exports.getAllInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(`select invoice_no, timestamptostring(invoice_date) invoice_date, get_distributor(distributor_code)customer_name, get_external_entity(Dealer_code)dealer_name,
    get_del_site(del_add) delivery_site, voucher_code from sl_trans_invoice_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`)
  const invoice = await client.query(
    `select invoice_no, timestamptostring(invoice_date) invoice_date, get_distributor(distributor_code)customer_name, get_external_entity(Dealer_code)dealer_name,
    get_del_site(del_add) delivery_site, voucher_code from sl_trans_invoice_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
  res.status(200).json({
    status: "success",
    data: {
      invoice,
    },
  });
});

exports.getAllInvoiceRegisterByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var today = new Date();
  var startOfWeek = today.getDate() - today.getDay();
  var endOfWeek = startOfWeek + 6;
  // console.log(today.getDay());
  // console.log(today.getDay());
  // console.log(today.getDay());
  var startDate = new Date(today.setDate(startOfWeek));
  var endDate = new Date(today.setDate(endOfWeek));
  // console.log(startDate);
  // console.log(startDate);
  var startDateInISO = startDate.toISOString().split("T")[0];
  var endDateInISO = endDate.toISOString().split("T")[0];
  var startDate2 = `${startDateInISO.split("-").reverse().join("-")}`;
  var endDate2 = endDateInISO.split("-").reverse().join("-");
  // console.log(startDate2);
  // console.log(startDate2);
  // console.log(startDate2);
  var dat1 = [];
  function date_to_postgres(dateparam) {
    var date = new Date(dateparam);

    date.setHours(date.getHours() + 5);

    date.setMinutes(date.getMinutes() + 30);

    date.toISOString().slice(0, 10);
    // how reverse date
    var Date2 = date.toISOString().slice(0, 10);
    var reverse = Date2.split("-").reverse().join("-");

    // console.log(reverse);

    return reverse;
  }
  var query = `SELECT H.INVOICE_NO,H.INVOICE_DATE,H.voucher_code,get_distributor(H.DISTRIBUTOR_CODE)customer_name, get_dealer_name(H.DEALER_CODE)dealer_name,
                    GET_ITEM(D.ITEM_CODE)ITEM_NAME,GET_SIZE(D.SIZE_CODE)SIZE_NAME,GET_QUALITY(D.QUALITY)GRADE,D.QTY,D.BK_RATE,D.ITEMQTYAMOUNT
                    FROM SL_TRANS_INVOICE_HDR H , SL_TRANS_INV_SIZE_DETAIL D WHERE H.MARKED IS NULL AND D.MARKED IS NULL
                    AND H.INVOICE_NO=D.INVOICE_NO AND H.INVOICE_DATE BETWEEN '${startDateInISO}' AND '${endDateInISO}' and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit}`;
  console.log(query);
  const invoice = await client.query(query);
  // console.log(invoice.rows);
  for (var i = 0; i < invoice.rows.length; i++) {
    // console.log(invoice.rows[i].invoice_date);
    dat1.push({
      invoice_no: invoice.rows[i].invoice_no,
      invoice_date: date_to_postgres(invoice.rows[i].invoice_date),
      voucher_code: invoice.rows[i].voucher_code,
      customer_name: invoice.rows[i].customer_name,
      dealer_name: invoice.rows[i].dealer_name,
      item_name: invoice.rows[i].item_name,
      size_name: invoice.rows[i].size_name,
      grade: invoice.rows[i].grade,
      qty: invoice.rows[i].qty,
      bk_rate: invoice.rows[i].bk_rate,

      item_qtyamount: invoice.rows[i].item_qtyamount,
    });
  }
  // console.log(dat1);
  res.status(200).json({
    status: "success",
    data: {
      invoice,
      dat1,
    },
  });
});

exports.getAllInvoiceRegister = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // // console.log(req.query, "jjjjjjjjjjj");
  // console.log(req.query, "jjjjjjjjjjj");
  var dat1 = [];
  function date_to_postgres(dateparam) {
    var date = new Date(dateparam);

    date.setHours(date.getHours() + 5);

    date.setMinutes(date.getMinutes() + 30);

    date.toISOString().slice(0, 10);
    // how reverse date
    var Date2 = date.toISOString().slice(0, 10);
    var reverse = Date2.split("-").reverse().join("-");

    // console.log(reverse);

    return reverse;
  }
  var query = `SELECT H.INVOICE_NO,H.INVOICE_DATE,H.voucher_code,get_distributor(H.DISTRIBUTOR_CODE)customer_name, get_dealer_name(H.DEALER_CODE)dealer_name,
GET_ITEM(D.ITEM_CODE)ITEM_NAME,GET_SIZE(D.SIZE_CODE)SIZE_NAME,GET_QUALITY(D.QUALITY)GRADE,D.QTY,D.BK_RATE,D.ITEMQTYAMOUNT
FROM SL_TRANS_INVOICE_HDR H , SL_TRANS_INV_SIZE_DETAIL D WHERE H.MARKED IS NULL AND D.MARKED IS NULL 
AND H.INVOICE_NO=D.INVOICE_NO and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit}
`;
  if (req.query.to) {
    query = `SELECT H.INVOICE_NO,H.INVOICE_DATE,H.voucher_code,get_distributor(H.DISTRIBUTOR_CODE)customer_name, get_dealer_name(H.DEALER_CODE)dealer_name,
  GET_ITEM(D.ITEM_CODE)ITEM_NAME,GET_SIZE(D.SIZE_CODE)SIZE_NAME,GET_QUALITY(D.QUALITY)GRADE,D.QTY,D.BK_RATE,D.ITEMQTYAMOUNT
  FROM SL_TRANS_INVOICE_HDR H , SL_TRANS_INV_SIZE_DETAIL D WHERE H.MARKED IS NULL AND D.MARKED IS NULL
  AND H.INVOICE_NO=D.INVOICE_NO  AND H.INVOICE_DATE BETWEEN '${req.query.from}' AND '${req.query.to}' and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit}`;
  } else {
    query = `SELECT H.INVOICE_NO,H.INVOICE_DATE,H.voucher_code,get_distributor(H.DISTRIBUTOR_CODE)customer_name, get_dealer_name(H.DEALER_CODE)dealer_name,
  GET_ITEM(D.ITEM_CODE)ITEM_NAME,GET_SIZE(D.SIZE_CODE)SIZE_NAME,GET_QUALITY(D.QUALITY)GRADE,D.QTY,D.BK_RATE,D.ITEMQTYAMOUNT
  FROM SL_TRANS_INVOICE_HDR H , SL_TRANS_INV_SIZE_DETAIL D WHERE H.MARKED IS NULL AND D.MARKED IS NULL
  AND H.INVOICE_NO=D.INVOICE_NO and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit}`;
  }
  const invoice = await client.query(query);
  // console.log(invoice.rows);
  for (var i = 0; i < invoice.rows.length; i++) {
    // console.log(invoice.rows[i].invoice_date);
    dat1.push({
      invoice_no: invoice.rows[i].invoice_no,
      invoice_date: date_to_postgres(invoice.rows[i].invoice_date),
      voucher_code: invoice.rows[i].voucher_code,
      customer_name: invoice.rows[i].customer_name,
      dealer_name: invoice.rows[i].dealer_name,
      item_name: invoice.rows[i].item_name,
      size_name: invoice.rows[i].size_name,
      grade: invoice.rows[i].grade,
      qty: invoice.rows[i].qty,
      bk_rate: invoice.rows[i].bk_rate,

      item_qtyamount: invoice.rows[i].item_qtyamount,
    });
  }
  // console.log(dat1);
  res.status(200).json({
    status: "success",
    data: {
      invoice,
      dat1,
    },
  });
});

exports.getExternalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const externalData = await client.query(
    `SELECT  BOOKING_CODE, DEALER_CODE FROM SL_TRANS_BOOKING_HDR WHERE BOOKING_CODE = '${req.params.BookingId}'`
  );
  // console.log(externalData);

  res.status(200).json({
    status: "success",
    data: {
      externalData,
    },
  });
});

exports.getInvoiceData = wrapper(async (req, res, next) => {
  // console.log("vannnna");
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Order Code",
    });
  }
  // console.log("vannnna");
  const data = {};
  const arr = jsonData.getNdelete.dataSources;
  // // console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    let query = `SELECT ${arr[i].fieldsRequired} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    // console.log("mannnna");
    query += ` WHERE ${arr[i].uniqueInvoiceIdentifier}='${req.params.code}' and marked is null`;
     console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
    // // console.log(arr[i].responseFieldName,  "anderka");
    // // console.log(arr[i].responseFieldName,  "anderka");
    // // console.log(arr[i].responseFieldName,  "anderka");
    // // console.log(arr[i].responseFieldName,  "anderka");
    // // console.log(arr[i].responseFieldName,  "anderka");
  }
  // // console.log(data);
  const dbData = await client.query(`
    select   get_charge(charge_code) charge_desc, charge_cat,charge_value ,charge_type, INCLUDE_COST, 
    use_for, get_charge(ref_charge)ref_chrg,ref_on, charge_type_on ,TaxValue,RunningTotal 
	   from  invoice_tax_charge_detail where invoice_no='${req.params.code}' and marked is null
    `);
  data["invoiceTaxChargeDetail"] = dbData.rows;
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
      const obj = arr[i].lovFields;

      for (const key in obj) {
        let query = '';

        if (req.params.item_code && obj[key].columnsRequired === "size_code") {
          // When size_code is required and item_code is provided
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName}
                   WHERE item_code = '${req.params.item_code}' AND marked IS NULL AND company_code = ${req.user.company}`;
          console.log(query, "item-----------");

        } else if (key === "DEALTYPE_CODE") {
          // Skip company filter for DEALTYPE_CODE
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName}
                   WHERE marked IS NULL`;
          console.log(query, "dealtype-----------");

        } else {
          // Default query with company filter
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName}
                   WHERE marked IS NULL AND company_code = ${req.user.company}`;
        }

        console.log(query, "invoice------------------");
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


exports.createInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  // console.log(arr);
  // console.log(arr);
  // console.log(arr);
  const body = req.body;
  console.log(body);
  // console.log(yu);
  var qty = 0;
  for (let i = 0; i < body.invoiceSize.length; i++) {
    qty = qty + body.invoiceSize[i].total_qty;
  }
  const TOTAL_QTY = qty;
  console.log(TOTAL_QTY, "Total qtyyyyyyyyyyyyyyyyyyyyyyyy");
  const invoiceCode = await generateInvoiceId(client);

  /////////////////////new code voucher
  const vdate = body.salesInvoice[0].invoice_date;
  const vtype = 6;
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

  /////////////////////old code voucher

  // const vdate = body.salesInvoice[0].invoice_date;

  // // console.log(vdate);
  // const vdate1 = body.salesInvoice[0].invoice_date
  //   .split("-")
  //   .reverse()
  //   .join("-");

  // // console.log(vdate1);
  // const getYear = await client.query(`select fin_yr('${vdate1}');`);
  // const Year1 = getYear.rows[0].fin_yr;
  // // console.log(":gfhggjgjhjhjhkj", Year1);

  // const ponse1 =
  //   await client.query(` select Voucher_Id_1('${Year1}',to_char(to_date('${vdate}', 'DD-MM-YYYY'), 'MM'),to_char(to_date('${vdate}', 'DD-MM-YYYY'), 'DD'),
  //   to_date('${vdate}', 'DD-MM-YYYY'),6,1,'A' )`);
  // // console.log("ggjhjkkjkj", ponse1);

  // const voucherCode = ponse1.rows[0].voucher_id_1;
  // console.log("voucherCode", voucherCode);

  // console.log(req.user.finyear);
  // const Yesno = await client.query(`select fin_year_change from control_table`);
  // const Noyes = Yesno.rows[0].fin_year_change;
  // const getFinYear = await client.query(
  //   `select year_nm from fin_mst_year_mst where year_desc= '${req.user.finyear}'`
  // );
  // console.log("finYear", getFinYear);

  // const finYear = getFinYear.rows[0].year_nm;
  // console.log("finYear", finYear);

  // const response2 = await client.query(
  //   `select Check_Voucher_Dt('${finYear}' , '${vdate1}', coalesce('${Noyes}','N'))`
  // );
  // // console.log("response2", response2);
  // const Checkdata = response2.rows[0].check_voucher_dt;

  //  select Check_Voucher_Dt('2223' , '2023/06/07', coalesce('N'))
  // if (Checkdata == "N") {
  //   return res.status(200).json({
  //     status: "fail",
  //     message: "Invoice Date is not in range of Financial Year"
  //   });
  //  } else {
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
        const query = `INSERT INTO ${arr[i].tableName} (INVOICE_NO, Voucher_code,  ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${invoiceCode}', '${voucherCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
        // console.log(query);
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
                (dat1 = function reverse_date() {
                  var date = obj[field];
                  var split = date.split("-");
                  var reverse = split.reverse();
                  var join = reverse.join("-");
                  return join;
                }),
                  (values += `TO_DATE('${dat1()}', 'YYYY-MM-DD HH:MM:SS'), `);
              else if (arr[i].fieldsRequired[field] === "number")
                values += `${obj[field]}, `;
              else values += `'${obj[field]}', `;
            }
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${
            arr[i].uniqueInvoiceIdentifier
          }, ${fields}, company_code, user_code, unit_code, fin_year, booking_uniq, inv_date) VALUES ('${invoiceCode}', ${values}, '${
            req.user.company
          }', '${req.user[0].spec_code}', '${req.user.unit}', '${
            req.user.finyear
          }', ${
            body.invoiceSize[j].unique_id
              ? `'${body.invoiceSize[j].unique_id}'`
              : `NULL`
          }, TO_DATE('${body.salesInvoice[0].invoice_date}', 'DD-MM-YYYY') ) `;
          console.log(query);
          await client.query(query);
        }
      }
    }
  }

  //   if (body.chargedata) {
  //     for (let i = 0; i < body.chargedata.length; i++) {
  //       const query = `INSERT INTO invoice_tax_charge_detail (INVOICE_NO, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue) VALUES ('${invoiceCode}',${
  //         body.chargedata[i].charge_code
  //       },
  // ${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
  //         body.chargedata[i].charge_type || ""
  //       }','${body.chargedata[i].include_cost}',
  // '${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
  //         body.chargedata[i].ref_on || ""
  //       }','${body.chargedata[i].charge_type_on || ""}' ,${
  //         body.chargedata[i].RunningTotal
  //       },${body.chargedata[i].TaxValue})`;

  //       // console.log(query);
  //       await client.query(query);
  //     }
  //   }

  if (body.chargedata) {
    var customer_name = body.salesInvoice[0].distributor_code;
    var a = await client.query(`select  get_distributor('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_distributor;
    //  this is for item account
    const totalAmount2 = body.invoiceSize.reduce(
      (sum, item) => sum + item.amount2,
      0
    );
    var itemAcc =
      await client.query(`select distinct account_code from sl_mst_item_account_det where marked is null
and item_code=${body.invoiceSize[0].item_code}`);
    console.log(itemAcc, "itemacc", itemAcc.rows[0].account_code);
    const detailitem = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
('${voucherCode}', 'C', ${itemAcc.rows[0].account_code},
  ${totalAmount2}
  , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailitem);

    //////////////////////////This is for tax

    //  this is for item account
    const TaxableAmount = body.chargedata.reduce(
      (sum, item) => sum + item.TaxValue,
      0
    );
    var taxAcc = await client.query(
      `select primary_account from sl_mst_charge where marked is null and charge_code=${body.chargedata[0].charge_code}`
    );

    const detailtax = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
('${voucherCode}', 'C', ${taxAcc.rows[0].primary_account},
  ${TaxableAmount}
  , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailtax);

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Distributor: " +
      distributor_name +
      "," +
      "Truck No: " +
      (body.salesInvoice[0].truck_number || "") +
      "," +
      "net Wt: " +
      (body.salesInvoice[0].net_wt || "") +
      "," +
      "Invoice_NO: " +
      invoiceCode +
      "," +
      "QTY: " +
      TOTAL_QTY;
    // console.log(narration, "narration");
    // console.log(narration, "narration");

    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status, BILLING_CO_CD, send_status)

  VALUES ('${voucherCode}', ${6}, '${vdate1}',
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    ,'${narration}','${Year1}', ${req.user.company},${
      req.user.unit
    },  '${Year1}','M', ${1},'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    var account = await client.query(
      `select account_code from sl_mst_distributor where distributor_code=${customer_name}`
    );
    // console.log(account);
    const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
  ('${voucherCode}', 'D', ${acc_code},
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
  }

  if (body.chargedata) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const query = `INSERT INTO invoice_tax_charge_detail (INVOICE_NO, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${invoiceCode}',${
        body.chargedata[i].charge_code
      },
${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
        body.chargedata[i].charge_type || ""
      }','${body.chargedata[i].include_cost}',
'${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
        body.chargedata[i].ref_on || ""
      }','${body.chargedata[i].charge_type_on || ""}' ,${
        body.chargedata[i].RunningTotal
      },${body.chargedata[i].TaxValue}, '${req.user.company}', '${
        req.user[0].spec_code
      }', '${req.user.unit}', '${req.user.finyear}')`;

      // console.log(query);
      await client.query(query);
    }
  }

  return res.status(200).json({
    status: "success",
    message: "Invoice Created Successfully",
  });
});

exports.updateInvoice = wrapper(async (req, res, next) => {
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Order Code",
    });
  }
  console.log(req.body, "there is no data");
  const body = req.body;

  //////////voucher_qty//////////////
  var qty = 0;
  for (let i = 0; i < body.invoiceSize.length; i++) {
    qty = qty + body.invoiceSize[i].total_qty;
  }
  const TOTAL_QTY = qty;
  console.log(TOTAL_QTY, "Total qtyyyyyyyyyyyyyyyyyyyyyyyy");
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
              fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === "number")
              fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueInvoiceIdentifier}='${req.params.code}'`;
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
            // await client.query(
            //   `delete from invoice_tax_charge_detail where invoice_no='${
            //     obj[arr[i].uniqueRowIdentifier]
            //   }'`
            // );

            // await client.query(`delete from FIN_MST_T_VOUCHER_DET where voucher_code='${obj[arr[i].uniqueRowIdentifier]}'`);
            // await client.query(`delete from FIN_MST_T_VOUCHER_HDR where voucher_code='${obj[arr[i].uniqueRowIdentifier]}'`);
          } else if (obj.PARAM === "DELETE") {
            // console.log(arr[i].uniqueRowIdentifier);
            // console.log(arr[i].uniqueRowIdentifier);
            const query = `DELETE FROM ${arr[i].tableName} WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
            // console.log(query);
            await client.query(query);
            // await client.query(
            //   `delete from invoice_tax_charge_detail where invoice_no='${
            //     obj[arr[i].uniqueRowIdentifier]
            //   }'`
            // );
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueInvoiceIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${req.params.code}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
            // console.log(query);
            await client.query(query);
            // await client.query(
            //   `delete from invoice_tax_charge_detail where invoice_no='${
            //     obj[arr[i].uniqueRowIdentifier]
            //   }'`
            // );
          }
        }
      }
    }
  }

  if (body.chargedata && body.chargedata.length > 0) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const query = `INSERT INTO invoice_tax_charge_detail (INVOICE_NO, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${
        req.params.code
      }',${body.chargedata[i].charge_code},
${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
        body.chargedata[i].charge_type || ""
      }','${body.chargedata[i].include_cost}',
'${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
        body.chargedata[i].ref_on || ""
      }','${body.chargedata[i].charge_type_on || ""}' ,${
        body.chargedata[i].RunningTotal
      },${body.chargedata[i].TaxValue}, '${req.user.company}', '${
        req.user[0].spec_code
      }', '${req.user.unit}', '${req.user.finyear}')`;

      // console.log(query);
      await client.query(query);
    }
  }

  {
    const voucher = await client.query(
      `select VOUCHER_CODE from sl_trans_invoice_hdr where invoice_no ='${req.params.code}'`
    );
    console.log(voucher);
    const voucherId = voucher.rows[0].voucher_code;
    await client.query(
      `delete from    FIN_MST_T_VOUCHER_HDR  where VOUCHER_CODE='${voucherId}'`
    );
    await client.query(
      `delete from  FIN_MST_T_VOUCHER_DET  where VOUCHER_CODE='${voucherId}'`
    );
    const vdate = body.salesInvoice[0].invoice_date;
    const vtype = 6;
    // const cdate = req.body.VoucherHeader[0].cheque_date;
    console.log(":vandna######", vtype);
    // // console.log(":vandna######", vtype);
    const vdate1 = vdate.split("-").reverse().join("-");
    const getYear = await client.query(`select fin_yr('${vdate1}');`);
    console.log(getYear);
    // const vtypedesc = await client.query(
    //   `select vshort_code from fin_mst_voucher_type where voucher_type_code=${vtype};`
    // );

    // const desc = vtypedesc.rows[0].vshort_code;
    const Year1 = getYear.rows[0].fin_yr;
    ///////////////////////now insert//////////////////

    var customer_name = body.salesInvoice[0].distributor_code;
    var a = await client.query(`select  get_distributor('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_distributor;
    //  this is for item account
    const totalAmount2 = body.invoiceSize.reduce(
      (sum, item) => sum + item.amount2,
      0
    );
    var itemAcc =
      await client.query(`select distinct account_code from sl_mst_item_account_det where marked is null
and item_code=${body.invoiceSize[0].item_code}`);
    console.log(itemAcc, "itemacc", itemAcc.rows[0].account_code);
    const detailitem = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
('${voucherId}', 'C', ${itemAcc.rows[0].account_code},
  ${totalAmount2}
  , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailitem);

    //////////////////////////This is for tax

    //  this is for item account
    const TaxableAmount = body.chargedata.reduce(
      (sum, item) => sum + item.TaxValue,
      0
    );
    var taxAcc = await client.query(
      `select primary_account from sl_mst_charge where marked is null and charge_code=${body.chargedata[0].charge_code}`
    );

    const detailtax = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
('${voucherId}', 'C', ${taxAcc.rows[0].primary_account},
  ${TaxableAmount}
  , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailtax);

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Distributor: " +
      distributor_name +
      "," +
      "Truck No: " +
      (body.salesInvoice[0].truck_number || "") +
      "," +
      "net Wt: " +
      (body.salesInvoice[0].net_wt || "") +
      "," +
      "Invoice_NO: " +
      req.params.code +
      "," +
      "QTY: " +
      TOTAL_QTY;
    // console.log(narration, "narration");
    // console.log(narration, "narration");

    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status, BILLING_CO_CD, send_status)

  VALUES ('${voucherId}', ${6}, '${vdate1}',
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    ,'${narration}','${Year1}', ${req.user.company},${
      req.user.unit
    },  '${Year1}','M', ${1},'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    var account = await client.query(
      `select account_code from sl_mst_distributor where distributor_code=${customer_name}`
    );
    // console.log(account);
    const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
  ('${voucherId}', 'D', ${acc_code},
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    , ${req.user.company},${req.user.unit},  'M', ${1},'A', ${
      body.salesInvoice[0].dealer_code
    }, ${6})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
  }
  res.status(200).json({
    status: "success",
    message: "Invoice Updated Successfully",
  });
});

exports.deleteInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Invoice Code",
    });
  }

  const arr = jsonData.getNdelete.dataSources;
  const tableArray = [
    {table:"sl_trans_sale_return_hdr",column:"invoice_no"},
    {table:"sl_sale_return_size_detail",column:"invoice_no"},
    {table:"gate_pass_hdr",column:"invoice_code"},
    
  ]; // List of tables to check
  const result = await Promise.all(
    tableArray.map(async ({table,column}) => {
      return await client.query(
        `select ref_table_c('${table}','${column}','${req.params.code}')`
      );
    })
  );
// SELECT ref_table('${table}', 'item_code', '${req.params.code}')
  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table_c);

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Invoice is Already Tagged",
      isUsed: true,
    });
  } else{
  const voucher = await client.query(
    `select VOUCHER_CODE from sl_trans_invoice_hdr where invoice_no ='${req.params.code}'`
  );
  console.log(voucher);
  const voucherId = voucher.rows[0].voucher_code;

  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `update  ${arr[i].tableName} set marked='D' WHERE ${arr[i].uniqueInvoiceIdentifier}='${req.params.code}'`
    );
  }
  await client.query(
    `update  invoice_tax_charge_detail set marked='D' where invoice_no='${req.params.code}'`
  );

  // // console.log(voucherId);
  await client.query(
    `update   FIN_MST_T_VOUCHER_HDR set marked='D' where VOUCHER_CODE='${voucherId}'`
  );
  await client.query(
    `update  FIN_MST_T_VOUCHER_DET set marked='D' where VOUCHER_CODE='${voucherId}'`
  );

  res.status(200).json({
    status: "success",
    message: "Invoice Deleted Successfully",
  });
}
});

// exports.InvoiceTaxCalByHsn = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;
//   // console.log(req.body, "postman");
//   const obj = req.body;
//   // console.log(obj);
//   // const hsn=obj.invoiceSize[0].hsn
//   const date = obj.salesInvoice[0].invoice_date;
//   // console.log(date);
//   const date1 = date.split("-").reverse().join("-");
//   // console.log(date1);

//   function calculate_tax_charge_ref(
//     ref_chrg,
//     data,
//     charge_type,
//     ref_on,
//     charge_value
//   ) {
//     if (charge_type === "p") {
//       // console.log("77", data);
//       for (let row of data) {
//         if (ref_chrg === row.charge_desc) {
//           // console.log("manoj", row);
//           if (ref_on === "r") {
//             return (
//               Math.round(((row.RunningTotal * charge_value) / 100) * 100) / 100
//             );
//           } else {
//             return (
//               Math.round(((row.TaxValue * charge_value) / 100) * 100) / 100
//             );
//           }
//           break;
//         }
//       }
//     } else {
//       return charge_value;
//     }
//   }

//   const ob1 = [];
//   const ob = [];
//   const feild1 = [];
//   var tax = [];
//   var newTax = [];
//   // console.log(obj.invoiceSize.length);
//   // // console.log(obj.invoiceSize.length);
//   // console.log(obj.invoiceSize.length);
//   // console.log(obj.invoiceSize.length);
//   // console.log(obj.invoiceSize.length);
//   // console.log(obj.invoiceSize.length);

//   if (obj.salesInvoice[0].booking_no == null) {
//     for (let i = 0; i < obj.invoiceSize.length; i++) {
//       const hsnTax = await client.query(
//         `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
//         D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
//         FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H
//        WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize[i].hsn}' and '${date1}' between  H.f_date  and H.t_date
//        ;`
//       );

//       ob.push(hsnTax.rows);
//       for (let j = i; j <= i; j++) {
//         tax = [];
//         // console.log("j", j);
//         var amount = obj.invoiceSize[i].itemqtyamount;
//         var qty = obj.invoiceSize[i].qty;
//         for (let k = 0; k < ob[j].length; k++) {
//           // console.log("k", k);
//           // console.log("k", k);
//           // console.log("k", k);

//           let Tax = 0;
//           if (ob[j][k].charge_type_on === "t") {
//             if (ob[j][k].ref_chrg) {
//               Tax = calculate_tax_charge_ref(
//                 ob[j][k].ref_chrg,
//                 tax,
//                 ob[j][k].charge_type,
//                 ob[j][k].ref_on,
//                 ob[j][k].charge_value
//               );
//             } // // console.log(tax);
//             else if (!ob[j][k].ref_chrg && ob[j][k].charge_type === "p") {
//               Tax =
//                 Math.round(((amount * ob[j][k].charge_value) / 100) * 100) /
//                 100;
//             } else {
//               Tax = Math.round(ob[j][k].charge_value * 100) / 100;
//             }
//           } else if (ob[j][k].charge_type_on === "o") {
//             Tax = Math.round(qty * ob[j][k].charge_value * 100) / 100;
//           }

//           amount = Math.round((amount + Tax) * 100) / 100;
//           tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
//           newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

//           // console.log("basic", ob);
//         }
//       }

//       ob1.push(hsnTax.rows);
//       feild1.push(hsnTax.fields);
//     }
//   } else {
//     var tax = [];
//     if (obj.invoiceSize !== null) {
//       for (let i = 0; i < obj.invoiceSize3.length; i++) {
//         // console.log(obj.invoiceSize3[i].hsn);
//         const hsnTax = await client.query(
//           `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
//           D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
//           FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H
//          WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize3[i].hsn}' and '${date1}' between  H.f_date  and H.t_date
//          ;`
//         );

//         ob.push(hsnTax.rows);
//         for (let j = i; j <= i; j++) {
//           tax = [];
//           // console.log("j", j);
//           var amount = obj.invoiceSize3[i].Price;
//           // console.log("amount", amount);
//           var qty = obj.invoiceSize3[i].qty;
//           // console.log("qty", qty);
//           for (let k = 0; k < ob[j].length; k++) {
//             // console.log("k", k);
//             // console.log("k", k);
//             // console.log("k", k);

//             let Tax = 0;
//             if (ob[j][k].charge_type_on === "t") {
//               if (ob[j][k].ref_chrg) {
//                 Tax = calculate_tax_charge_ref(
//                   ob[j][k].ref_chrg,
//                   tax,
//                   ob[j][k].charge_type,
//                   ob[j][k].ref_on,
//                   ob[j][k].charge_value
//                 );
//               } // // console.log(tax);
//               else if (!ob[j][k].ref_chrg && ob[j][k].charge_type === "p") {
//                 Tax =
//                   Math.round(((amount * ob[j][k].charge_value) / 100) * 100) /
//                   100;
//               } else {
//                 Tax = Math.round(ob[j][k].charge_value * 100) / 100;
//               }
//             } else if (ob[j][k].charge_type_on === "o") {
//               Tax = Math.round(qty * ob[j][k].charge_value * 100) / 100;
//             }

//             amount = Math.round((amount + Tax) * 100) / 100;
//             tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
//             newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

//             // console.log("basic", ob);
//           }
//         }

//         ob1.push(hsnTax.rows);
//         feild1.push(hsnTax.fields);
//       }
//     }
//   }

//   // console.log("tax", tax);
//   // console.log("tax", tax);
//   // // console.log("tax", tax);
//   // console.log("tax", tax);
//   // console.log("tax", tax);
//   // console.log("tax", tax);
//   //ob.push(rows.low)
//   res.status(200).json({
//     status: "success",
//     data: {
//       ob1,
//       feild1,
//       tax,
//       newTax,
//     },
//   });
// });

exports.getAllSaudaofCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // const order = await client.query(
  //   `select booking_code order_code, get_distributor(distributor_code) customer ,timestamptostring (booking_date::timestamp)order_date, get_external_entity(dealer_name) dealer, order_type,
  //   get_del_site(del_site_code) address,
  //    remarks from sl_trans_booking_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  // );
  const { dealercode, customer_code, bookingNo } = req.query;
  console.log(req.query);
  //   const Requisition = await client.query(`
  //   select  s.SAUDA_REFNO,
  //     Get_Dealer_Name(s.DEALER_CODE) AS DEALER_DESC,
  //     Get_Distributor(s.CUST_CODE) AS DISTRIBUTOR_DESC,
  //     Get_Item(s.ITEM_CODE) AS ITEM_DESC,
  //     Get_Quality(s.SAUDA_QUALITY) AS QUALITY_DESC,
  //     s.UNIT_CODE,
  //     s.SAUDA_REMARK,
  //     s.SAUDA_CODE,
  //     s.ITEM_CODE,
  //     s.SAUDA_QUALITY,
  //     s.DEALER_CODE,
  //     s.CUST_CODE,
  //     s.SAUDA_QTY,
  //     s.SAUDA_RATE,
  //     s.unique_code,
  //    (select item_uom from sl_mst_item  where item_code=s.ITEM_CODE) uom_code,
  //     (select hsn from sl_mst_item where item_code=s.ITEM_CODE) hsn,
  //    (select get_uom(item_uom)  from sl_mst_item  where item_code=s.ITEM_CODE) uom_name
  // FROM
  //     SL_TRANS_SAUDA_HDR s
  // WHERE
  //     MARKED IS NULL
  //     and s.company_code= ${req.user.company} and s.fin_year='${req.user.finyear}' and s.unit_code=${req.user.unit}

  //    AND (DEALER_CODE = ${dealercode} )
  //    AND (CUST_CODE = ${customer_code} )
  //    `);

  const Requisition =
    await client.query(` SELECT H.BOOKING_CODE booking_no, D.ITEM_CODE,GET_ITEM(D.ITEM_CODE)Item,D.SIZE_CODE,
    GET_SIZE(D.SIZE_CODE)Size,D.QUALITY_CODE,GET_QUALITY(D.QUALITY_CODE)Grade,
    D.QTY,(coalesce(D.QTY,0)-coalesce(SI.INV_QTY,0)) total_qty, (coalesce(D.QTY,0)-coalesce(SI.INV_QTY,0)) initial_total_qty, D.UOM_code,GET_UOM(D.UOM_code)UOM_NM,D.UNIQUE_ID,
    d.rate, D.RATE1, d.discount, d.amount, d.amount2,
    (SELECT HSN FROM SL_MST_ITEM WHERE MARKED IS NULL AND ITEM_CODE=D.ITEM_CODE)HSN  
    FROM  sl_trans_booking_hdr h
     JOIN sl_trans_booking_size_detail d ON (H.BOOKING_CODE = D.BOOKING_CODE)
  LEFT JOIN
    (SELECT
      IDT.BOOKING_NO,IDT.booking_uniq,
      sum(coalesce(IDT.total_QTY,0)) AS INV_QTY
   FROM
      SL_TRANS_INVOICE_HDR IH
   JOIN
      SL_TRANS_INV_SIZE_DETAIL IDT ON IH.INVOICE_NO = IDT.INVOICE_NO 
     WHERE
        IH.MARKED IS null        
        AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit}
         and ih.fin_year ='${req.user.finyear}' and IDT.booking_no is not null
     GROUP BY
     IDT.BOOKING_NO,IDT.booking_uniq
    ) SI ON d.BOOKING_CODE = SI.BOOKING_NO
    WHERE H.MARKED IS NULL AND D.MARKED IS NULL 
    and h.dealer_name=${dealercode}
    and H.DISTRIBUTOR_code= ${customer_code} and h.booking_code<>'${bookingNo}'
    and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}'  
    and h.unit_code =${req.user.unit}
    and (coalesce(D.QTY,0)-coalesce(SI.INV_QTY,0))>0`);
  // console.log(Requisition.rows);
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

exports.OrderPurchaseTaxCalByHsn = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body, "postman");
  const obj = req.body;
  console.log(obj);
  // Check if invoiceTaxChargeDetail exists and delete it from the object
  if (obj.invoiceTaxChargeDetail) {
    delete obj.invoiceTaxChargeDetail;
    await client.query(
      `delete from invoice_tax_charge_detail where invoice_no='${obj.invoiceSize[0].invoice_no}'`
    );
  }

  if (obj.chargedata) {
    delete obj.chargedata;
    await client.query(
      `delete from invoice_tax_charge_detail where invoice_no='${obj.invoiceSize[0].invoice_no}'`
    );
  }

  const hsn = obj.invoiceSize[0].hsn;
  console.log(hsn);
  const date = obj.salesInvoice[0].invoice_date;
  console.log(obj, "tttttttttttttttttt");
  const date1 = date.split("-").reverse().join("-");
  // console.log(date1);

  function calculate_tax_charge_ref(
    ref_chrg,
    data,
    charge_type,
    ref_on,
    charge_value
  ) {
    if (charge_type === "p") {
      // console.log("77", data);
      for (let row of data) {
        if (ref_chrg === row.charge_desc) {
          // console.log("manoj", row);
          if (ref_on === "r") {
            return (
              Math.round(((row.RunningTotal * charge_value) / 100) * 100) / 100
            );
          } else {
            return (
              Math.round(((row.TaxValue * charge_value) / 100) * 100) / 100
            );
          }
          break;
        }
      }
    } else {
      return charge_value;
    }
  }

  const ob1 = [];
  const ob = [];
  const feild1 = [];
  var tax = [];
  var newTax = [];

  for (let i = 0; i < obj.invoiceSize.length; i++) {
    // console.log(obj.invoiceSize[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    // console.log(obj.invoiceSize[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    console.log(`SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
        D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
        FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
       WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize[i].hsn}' and '${date1}' between  H.f_date  and H.t_date `)
  
  
       const hsnTax = await client.query(
      `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
        D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
        FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
       WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize[i].hsn}' and '${date1}' between  H.f_date  and H.t_date       
       ;`
    );
    // console.log(
    //   hsnTax.rows,
    //   "dddddddddddddddddddddddddddddddddddddddddddddddddd"
    // );
    ob.push(hsnTax.rows);
    for (let j = i; j <= i; j++) {
      tax = [];
      // console.log("j", j);
      // Check the type and assign the appropriate values
      if (obj.salesInvoice[0].invoice_type === "wo") {
        var amount = parseFloat(obj.invoiceSize[i].amount2);
        // amount = parseFloat(amount);
        var qty = obj.invoiceSize[i].qty;
      } else {
        var amount = parseFloat(obj.invoiceSize[i].amount2);
        var qty = obj.invoiceSize[i].total_qty;
      }
      // console.log(amount);

      for (let k = 0; k < ob[j].length; k++) {
        // console.log("k", k);
        // console.log("k", k);
        // console.log("k", k);

        let Tax = 0;
        if (ob[j][k].charge_type_on === "t") {
          if (ob[j][k].ref_chrg) {
            Tax = calculate_tax_charge_ref(
              ob[j][k].ref_chrg,
              tax,
              ob[j][k].charge_type,
              ob[j][k].ref_on,
              ob[j][k].charge_value
            );
            console.log(Tax, "taxxxxxxxxxxxxxxxxxxxxxxxxxwithrefcharge");
          } // // console.log(tax);
          else if (!ob[j][k].ref_chrg && ob[j][k].charge_type === "p") {
            Tax =
              Math.round(((amount * ob[j][k].charge_value) / 100) * 100) / 100;
          } else {
            Tax = Math.round(ob[j][k].charge_value * 100) / 100;
            console.log(Tax, "Tasyyuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
          }
        } else if (ob[j][k].charge_type_on === "o") {
          Tax = Math.round(qty * ob[j][k].charge_value) / 100;
        }
        console.log(
          "Initial amount:",
          amount,
          "| Type of amount:",
          typeof amount
        ); // Log the initial amount and its type
        console.log("Tax to be added:", Tax, "| Type of Tax:", typeof Tax); // Log the Tax to be added and its type
        console.log(amount);
        console.log(amount + Tax);
        amount = Math.round((amount + Tax) * 100) / 100;
        console.log(amount, "amounttttttttttttttttttttttttt");
        // Push qty into both tax and newTax objects
        tax.push({
          ...ob[j][k],
          TaxValue: Tax,
          RunningTotal: amount,
          qty: qty,
        });
        newTax.push({
          ...ob[j][k],
          TaxValue: Tax,
          RunningTotal: amount,
          qty: qty,
        });
        // tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
        // newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

        // console.log("basic", ob);
      }
    }

    ob1.push(hsnTax.rows);
    feild1.push(hsnTax.fields);
  }

  // else {
  //   var tax = [];
  //   if (obj.invoiceSize !== null) {
  //     for (let i = 0; i < obj.invoiceSize3.length; i++) {
  //       // console.log(obj.invoiceSize3[i].hsn);
  //       const hsnTax = await client.query(
  //         `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
  //         D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
  //         FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H
  //        WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize3[i].hsn}' and '${date1}' between  H.f_date  and H.t_date
  //        ;`
  //       );

  //       ob.push(hsnTax.rows);
  //       for (let j = i; j <= i; j++) {
  //         tax = [];
  //         // console.log("j", j);
  //         var amount = obj.invoiceSize3[i].Price;
  //         // console.log("amount", amount);
  //         var qty = obj.invoiceSize3[i].qty;
  //         // console.log("qty", qty);
  //         for (let k = 0; k < ob[j].length; k++) {
  //           // console.log("k", k);
  //           // console.log("k", k);
  //           // console.log("k", k);

  //           let Tax = 0;
  //           if (ob[j][k].charge_type_on === "t") {
  //             if (ob[j][k].ref_chrg) {
  //               Tax = calculate_tax_charge_ref(
  //                 ob[j][k].ref_chrg,
  //                 tax,
  //                 ob[j][k].charge_type,
  //                 ob[j][k].ref_on,
  //                 ob[j][k].charge_value
  //               );
  //             } // // console.log(tax);
  //             else if (!ob[j][k].ref_chrg && ob[j][k].charge_type === "p") {
  //               Tax =
  //                 Math.round(((amount * ob[j][k].charge_value) / 100) * 100) /
  //                 100;
  //             } else {
  //               Tax = Math.round(ob[j][k].charge_value * 100) / 100;
  //             }
  //           } else if (ob[j][k].charge_type_on === "o") {
  //             Tax = Math.round(qty * ob[j][k].charge_value * 100) / 100;
  //           }

  //           amount = Math.round((amount + Tax) * 100) / 100;
  //           tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
  //           newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

  //           // console.log("basic", ob);
  //         }
  //       }

  //       ob1.push(hsnTax.rows);
  //       feild1.push(hsnTax.fields);
  //     }
  //   }
  // }

  // console.log("tax", tax);
  // console.log("tax", tax);
  // // console.log("tax", tax);
  // console.log("tax", tax);
  // console.log("tax", tax);
  console.log("tax", tax);
  //ob.push(rows.low)
  res.status(200).json({
    status: "success",
    data: {
      ob1,
      feild1,
      tax,
      newTax,
      qty,
    },
  });
});

// how add two no
// SELECT  DEL_SITE_CODE,add_1||','||get_city(CITY_CODE)||','||get_locality(LOCALITY_CODE)||','||get_state(STATE_CODE)del_add
// FROM SL_MST_DEL_SITe
// WHERE marked IS NULL and cust code=1
//   for Detail tab hsn and size
exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
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


exports.getcustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);

  const customer = await client.query(
    `select distributor_code,get_distributor(distributor_code)cust_name from sl_mst_dealer_dist_det where external_entity_code =${req.params.code} and marked is null and company_code=${req.user.company}`
  );

  res.status(200).json({
    status: "success",
    data: {
      customer,
    },
  });
});
//SELECT  DEL_SITE_CODE,add_1||','||get_city(CITY_CODE)||','||get_locality(LOCALITY_CODE)||','||get_state(STATE_CODE)del_add
//FROM SL_MST_DEL_SITe
//WHERE marked IS NULL and cust_code=${req.params.code}

exports.getdetailsOfCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const custdetail = await client.query(
    `SELECT  DEL_SITE_CODE,add_1
      FROM SL_MST_DEL_SITe
      WHERE marked IS NULL and cust_code=${req.params.code} and company_code=${req.user.company}`
  );
  res.status(200).json({
    status: "success",
    data: {
      custdetail,
    },
  });
});

// exports.getAllInvoiceRegister = wrapper(async (req, res, next) => {
//     const client = req.dbConnection;

//     const invoice = await client.query(

//       `SELECT H.INVOICE_NO,H.INVOICE_DATE,H.DISTRIBUTOR_CODE,H.DEALER_CODE,
//       GET_ITEM(D.ITEM_CODE)ITEM_NAME,GET_SIZE(D.SIZE_CODE)SIZE_NAME,GET_QUALITY(D.QUALITY)GRADE,D.QTY,D.BK_RATE,D.ITEMQTYAMOUNT
//       FROM SL_TRANS_INVOICE_HDR H , SL_TRANS_INV_SIZE_DETAIL D WHERE H.MARKED IS NULL AND D.MARKED IS NULL
//       AND H.INVOICE_NO=D.INVOICE_NO
//       `
//     );
//     res.status(200).json({
//       status: 'success',
//       data: {
//         invoice,
//       },
//     });
//   });

exports.createInvoiceFromInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("hi manoj");
  // // console.log("hi manoj");
  // console.log("hi manoj");
  const obj = req.body;
  // console.log(obj);
  var qty = 0;
  for (let i = 0; i < obj.invoiceSize3.length; i++) {
    qty = qty + obj.invoiceSize3[i].qty;
  }
  const TOTAL_QTY = qty;
  // const invoiceCode = await generateInvoiceId(client);

  const vdate = obj.salesInvoice[0].invoice_date;
  // for voucher posting
  // console.log(vdate);
  const vdate1 = vdate.split("-").reverse().join("-");
  // const cdate1=cdate.split("-").reverse().join("-");
  // console.log(vdate1);
  const getYear = await client.query(`select fin_yr('${vdate1}');`);
  const Year1 = getYear.rows[0].fin_yr;
  // console.log(":gfhggjgjhjhjhkj", Year1);

  // const response1 = await client.query(` select Voucher_Id_1('${Year1}',to_char(to_date('${vdate}', 'YYYY-MM-DD'), 'MM'),to_char(to_date('${vdate}', 'YYYY-MM-DD'), 'DD'),
  // to_date('${vdate}', 'YYYY-MM-DD'),1,1,'A' )`);
  const response1 =
    await client.query(` select Voucher_Id_1('${Year1}',to_char(to_date('${vdate}', 'DD-MM-YYYY'), 'MM'),to_char(to_date('${vdate}', 'DD-MM-YYYY'), 'DD'),
    to_date('${vdate}', 'DD-MM-YYYY'),6,1,'A' )`);
  // console.log("ggjhjkkjkj", response1);

  const voucherCode = response1.rows[0].voucher_id_1;
  // console.log("voucherCode", voucherCode);
  //const arr = jsonData.createNupdate.fieldNames;
  const invoiceCode = await generateInvoiceId(client);
  // console.log (req.body)
  // const obj = req.body
  // console.log("obj", obj);
  // console.log("obj", obj);
  //obj.salesInvoice[0].booking_date
  const query = `INSERT INTO sl_trans_invoice_hdr (INVOICE_NO, voucher_code, DISTRIBUTOR_CODE, DEALER_CODE, ORDER_TYPE, DEL_ADD, BOOKING_NO, NET_AMT, INVOICE_DATE) VALUES ('${invoiceCode}','${voucherCode}', ${obj.salesInvoice[0].distributor_name}, ${obj.salesInvoice[0].external_entity_code}, ${obj.salesInvoice[0].order_type}, ${obj.salesInvoice[0].del_site_code},'${obj.salesInvoice[0].booking_no}', ${obj.amount[0]} , to_date('${obj.salesInvoice[0].invoice_date}', 'DD-MM-YYYY'))`;
  // console.log(query);
  // console.log(query);
  await client.query(query);

  for (let i = 0; i < obj.invoiceSize3.length; i++) {
    const query = `INSERT INTO sl_trans_inv_size_detail (INVOICE_NO, ITEM_CODE, SIZE_CODE, QUALITY, QTY, BOOKING_NO, UOM_FOR_ITEMS, NET_RATE, NET_DISCOUNT, AMOUNT) VALUES ('${invoiceCode}', ${obj.invoiceSize3[i].item_code}, ${obj.invoiceSize3[i].size_code}, ${obj.invoiceSize3[i].quality}, ${obj.invoiceSize3[i].qty}, '${obj.invoiceSize3[i].booking_no}', ${obj.invoiceSize3[i].uom}, ${obj.invoiceSize3[i].rate_after_discount},${obj.invoiceSize3[i].discount_value},${obj.invoiceSize3[i].amount})`;
    // console.log(query);
    await client.query(query);
  }
  for (let i = 0; i < obj.chargedata.length; i++) {
    const query = `INSERT INTO invoice_tax_charge_detail (INVOICE_NO, charge_code, charge_cat,charge_value ,charge_type, include_cost, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue) VALUES ('${invoiceCode}',${
      obj.chargedata[i].charge_code
    },
      ${obj.chargedata[i].charge_cat},${obj.chargedata[i].charge_value}, '${
      obj.chargedata[i].charge_type || ""
    }','${obj.chargedata[i].include_cost || ""}',
      ${obj.chargedata[i].use_for},${obj.chargedata[i].ref_charge},'${
      obj.chargedata[i].ref_on || ""
    }','${obj.chargedata[i].charge_type_on || ""}' ,${
      obj.chargedata[i].RunningTotal
    },${obj.chargedata[i].TaxValue});
      `;
    // console.log(query, "manoooooooooooooooooo");
    await client.query(query);
  }

  {
    var customer_name = obj.salesInvoice[0].distributor_code;
    var a = await client.query(`select  get_distributor('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_distributor;

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Distributor: " +
      distributor_name +
      "," +
      "Truck No: " +
      (obj.salesInvoice[0].truck_number || "") +
      "," +
      "net Wt: " +
      (obj.salesInvoice[0].net_wt || "") +
      "," +
      "Invoice_NO: " +
      invoiceCode +
      "," +
      "QTY: " +
      TOTAL_QTY;
    // console.log(narration, "narration");
    // console.log(narration, "narration");
    //  var currenttime=await client.query(`SELECT to_timestamp(to_char(now(), 'YYYY/MM/DD HH24:MI:SS'), 'YYYY/MM/DD HH24:MI:SS')`);
    //  const current_time=currenttime.rows[0].to_timestamp
    //   // console.log(current_time,'current_time');
    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status, BILLING_CO_CD, send_status)

  VALUES ('${voucherCode}', ${6}, '${vdate1}',${
      obj.amount[0]
    },'${narration}','${Year1}', ${1},${1},  '${Year1}','M', ${1},'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    var account = await client.query(
      `select account_code from sl_mst_distributor where distributor_code=${customer_name}`
    );
    // console.log(account);
    const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status ,BILLING_CO_CD, send_status,  DEALER_CODE, VOUCHER_TYPE) VALUES
  ('${voucherCode}', 'Credit', ${acc_code},${
      obj.amount[0]
    }, ${1},${1},  'M', ${1},'A', ${obj.salesInvoice[0].dealer_code}, ${3})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
  }

  res.status(200).json({
    status: "success",
    message: "Order Created Successfully",
  });
});

const pdfmake = wrapper(async (req, res, str) => {
  const client = req.dbConnection;
  const order = await client.query(
    `SELECT
    h.invoice_no,
    GET_DISTRIBUTOR(h.DISTRIBUTOR_code) AS CUST,
    get_del_site(h.DEL_add) AS Delivery_add,
    h.INVOICE_DATE,truck_number,
    (SELECT C.service_tax_no FROM sl_mst_distributor C WHERE C.distributor_code = h.DISTRIBUTOR_code) AS service_tax_no,
    0||LEFT((SELECT C.service_tax_no FROM sl_mst_distributor C WHERE C.distributor_code = h.DISTRIBUTOR_code), 1) As state_code
FROM
    sl_trans_invoice_hdr h
WHERE
    h.invoice_no='${req.params.code}' `
  );
  // console.log(order.rows, "customere");
  const itemDetail = await client.query(
    `select  get_item(item_code) item, hsn,  get_size(size_code) size,  
    get_uom(uom_code) uom, get_quality(quality_code) quality, total_qty,  amount2, rate 
    FROM sl_trans_inv_size_detail 
    WHERE invoice_no = $1`,
    [req.params.code]
  );

  // console.log(itemDetail.rows, "item");
  const itemlogo = await client.query(
    `select site_desc, add1, ph1, email, logo_1, gst_no, cin_no, bank_name,bank_add1, account_no, ifsc_cd from sl_mst_site  where marked is null and company= ${req.user.company}
    and site_code='${req.user.unit}'`
  );
  // console.log(itemlogo.rows);
  const company = await client.query(`select company_name from sl_mst_company`);
  // console.log(company.rows, "company");
  const chargeDetail =
    await client.query(`SELECT ALL invoice_tax_charge_detail.CHARGE_CODE, get_charge(invoice_tax_charge_detail.CHARGE_CODE),charge_value,
    invoice_tax_charge_detail.invoice_no ,sum(invoice_tax_charge_detail.taxvalue)tax_val FROM invoice_tax_charge_detail
   WHERE invoice_tax_charge_detail.MARKED IS NULL and invoice_tax_charge_detail.charge_code not in (1)
   and invoice_tax_charge_detail.invoice_no= '${req.params.code}'
   group by invoice_tax_charge_detail.CHARGE_CODE, charge_value,invoice_tax_charge_detail.invoice_no`);
  // console.log("charge", chargeDetail.rows);

  const responseData = {
    customere: order.rows,
    item: itemDetail.rows,
    address: itemlogo.rows,
    company: company.rows,
    totalAmount: chargeDetail.rows,
  };
  // console.log(responseData);

  // Sending the organized data as the response
  res.json(responseData);
});

exports.downloadPDF = async (req, res, next) => {
  // console.log("1" + req.params.code);
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};

exports.getAllHdr = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const Requisition = await client.query(
    `SELECT
    H.BOOKING_CODE,
    timestamptostring(H.BOOKING_DATE) booking_date,
    H.CUSTOMER_PO_NO,
    H.CUSTOMER_PO_DATE,
    GET_DISTRIBUTOR(H.DISTRIBUTOR_code) AS CUSTOMER_NAME,
    H.DISTRIBUTOR_code,
    GET_DEALER(null,H.DEALER_NAME) AS DEALER_nm,
    H.DEALER_NAME,
    get_del_site(H.DEL_SITE_CODE) AS Delivery_add,
    H.DEL_SITE_CODE,
    sum(coalesce(D.QTY,0)) AS Order_Qty,
    sum(coalesce(SI.INV_QTY,0)) AS INVOICE_QTY,
    (sum(COALESCE(D.QTY, 0)) - sum(COALESCE(SI.INV_QTY, 0))) AS Balance_QTY
FROM
    SL_TRANS_BOOKING_HDR H
JOIN
    SL_TRANS_BOOKING_SIZE_DETAIL D ON D.BOOKING_CODE = H.BOOKING_CODE
LEFT JOIN
    (SELECT
        IDT.BOOKING_NO,
        IH.UNIT_CODE,
        SUM(coalesce(IDT.total_QTY,0)) AS INV_QTY
     FROM
        SL_TRANS_INVOICE_HDR IH
     JOIN
        SL_TRANS_INV_SIZE_DETAIL IDT ON IH.INVOICE_NO = IDT.INVOICE_NO and IH.BOOKING_NO=IDT.BOOKING_NO
     WHERE
        IH.MARKED IS null and IH.INVOICE_TYPE='wo'
      AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit}
      and ih.fin_year ='${req.user.finyear}'
     GROUP BY
        IDT.BOOKING_NO, IH.UNIT_CODE
    ) SI ON H.BOOKING_CODE = SI.BOOKING_NO
WHERE
    H.BOOKING_STATUS IS NULL
    AND H.MARKED IS NULL
    AND D.MARKED IS null
     group by H.BOOKING_CODE,H.BOOKING_DATE,H.CUSTOMER_PO_NO,H.CUSTOMER_PO_DATE,H.DISTRIBUTOR_code,H.DEALER_NAME,
   H.DEL_SITE_CODE
 having (sum(COALESCE(D.QTY, 0)) - sum(COALESCE(SI.INV_QTY, 0)))>0  
    and H.company_code= ${req.user.company} and H.fin_year='${req.user.finyear}'  and H.unit_code =${req.user.unit}`
  );

  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

exports.getAllDet = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { booking_code } = req.query;
  // console.log(req.query);
  const Requisition = await client.query(
    `  SELECT  d.booking_code Booking_No ,get_item(d.item_code) Item, d.item_code, get_uom(d.uom_code) Uom_nm,
    d.uom_code, get_size(d.size_code) Size, d.size_code, get_quality(d.quality_code) Grade,d.quality_code,
    d.qty, (COALESCE(D.QTY, 0) - COALESCE(SI.INV_QTY, 0)) AS total_qty, d.rate,  d.Rate1, (COALESCE(D.QTY, 0) - COALESCE(SI.INV_QTY, 0)) AS initial_total_qty, d.discount, d.discount_on, d.dis_type, d.unique_id, d.hsn , d.amount, d.amount2
    
    FROM sl_trans_booking_size_detail d
    LEFT JOIN
        (SELECT
            IDT.BOOKING_NO,
            IH.UNIT_CODE,IDT.booking_uniq,
            SUM(coalesce(IDT.total_QTY,0)) AS INV_QTY
         FROM
            SL_TRANS_INVOICE_HDR IH
         JOIN
            SL_TRANS_INV_SIZE_DETAIL IDT ON IH.INVOICE_NO = IDT.INVOICE_NO 
         WHERE
            IH.MARKED IS null        
            AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit}
            and ih.fin_year ='${req.user.finyear}'
         GROUP BY
            IDT.BOOKING_NO, IH.UNIT_CODE,IDT.booking_uniq
        ) SI ON d.BOOKING_CODE = SI.BOOKING_NO
    where d.booking_code ='${booking_code}'
    and d.marked is null and (COALESCE(D.QTY, 0) - COALESCE(SI.INV_QTY, 0)) >0
    and d.company_code= ${req.user.company} and d.fin_year='${req.user.finyear}'  
    and d.unit_code =${req.user.unit}`
  );

  // const deler = await client.query(
  //   `select dealer_name, del_site_code from sl_trans_booking_hdr where booking_code ='${booking_code}'`
  // );
  // //   // Extract dealer_name from the first query's result
  // const dealerName = deler.rows.length > 0 ? deler.rows[0].dealer_name : null;
  // console.log(dealerName);
  // if (!dealerName) {
  //   return res.status(400).json({
  //     status: "fail",
  //     message: "No dealer_name found in the requisition data",
  //   });
  // }

  // const cust =
  //   await client.query(`select distributor_code,get_distributor(distributor_code)cust_name from sl_mst_dealer_dist_det where
  // external_entity_code =${dealerName}`);

  // console.log(Requisition.rows);
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});
