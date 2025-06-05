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
  fs.readFileSync(`${__dirname}/../mrir.json`, "utf8")
);

// how to get data from postgres database and create a pdf file from it and save it in the folder

// const generateReqId = async (client) => {
//   const response1 = await client.query(
//     `SELECT MAX(mrir_code)M FROM pur_mrir_hdr`
//   );
//   // console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(mrir_code from '[0-9]+$') AS INTEGER)) AS M FROM pur_mrir_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `P12425-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `P12425-${num}`;
  }
};

exports.getAllRequisition = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const Requisition = await client.query(
    ` select mrir_code,timestamptostring(mrir_date) mrir_date, get_dealtype(deal_code) deal_type, get_party(party_code) vendor, truck_no ,get_currency(currency_cd) currency, currency_rate1, 
    timestamptostring(bill_date) bill_date ,bill_no , voucher_code from pur_mrir_hdr  where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
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
    query += ` WHERE ${arr[i].uniqueMrirIdentifier}='${req.params.code}' and marked is null`;
    // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }
  const dbData = await client.query(`
    select   get_charge(charge_code) charge_desc, charge_cat,charge_value ,charge_type, INCLUDE_COST, 
    use_for, get_charge(ref_charge)ref_chrg,ref_on, charge_type_on ,TaxValue,RunningTotal 
	   from  pur_mrir_charge_det where mrir_code='${req.params.code}' and marked is null
    `);
  data["mrirTaxChargeDetail"] = dbData.rows;

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAllGatePass = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const Requisition = await client.query(
    `SELECT
    H.FACTORY_ARRIVAL_CODE,
    Get_Party(H.PARTY_CODE) AS Party,  
    TO_CHAR(H.CHALLAN_DATE, 'YYYY-MM-DD') AS challan_date,
    CASE
        WHEN H.DEALTYPE_CD = 1 THEN 'DOMESTIC'
        WHEN H.DEALTYPE_CD = 2 THEN 'IMPORT'
        WHEN H.DEALTYPE_CD = 3 THEN 'INTERSTATE'
        ELSE 'UNKNOWN'
    END AS DEAL_DESC,
    H.DEALTYPE_CD,
   (sum(coalesce(D.QUANTITY,0))-sum(coalesce(MR.mrir_qty,0))) pending_qty,
    H.PARTY_CODE,
    H.truck_no,
    H.po_ref
FROM
    PUR_FACTORY_ARRIVAL_HDR H
JOIN 
    PUR_FACTORY_ARRIVAL_DET D ON H.FACTORY_ARRIVAL_CODE = D.FACTORY_ARRIVAL_CODE
LEFT JOIN (
    SELECT 
        IDT.FACTORY_ARRIVAL_CODE,
        coalesce(SUM(IDT.total_qty),0) AS mrir_qty
    FROM 
        pur_mrir_hdr IH
    JOIN 
        pur_mrir_det IDT ON IH.mrir_code = IDT.mrir_code and IH.gate_pass=IDT.FACTORY_ARRIVAL_CODE
    WHERE 
        IH.marked IS NULL
        AND IDT.marked IS NULL
    GROUP BY 
        IDT.FACTORY_ARRIVAL_CODE
) MR ON H.FACTORY_ARRIVAL_CODE = MR.FACTORY_ARRIVAL_CODE
WHERE
    H.MARKED IS NULL 
    AND H.against_of = 'P'
      and H.company_code= ${req.user.company} and H.fin_year='${req.user.finyear}' 
    and H.unit_code =${req.user.unit}
group by H.FACTORY_ARRIVAL_CODE,H.PARTY_CODE ,H.CHALLAN_DATE, H.DEALTYPE_CD, H.PARTY_CODE,   H.truck_no,H.po_ref
having (sum(coalesce(D.QUANTITY,0))-sum(coalesce(MR.mrir_qty,0))) >0
       `
  );
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

exports.getAllItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const { factory_arrival_code, unit_code, dealtype_cd } = req.query;
  // console.log(factory_arrival_code);
  // console.log(factory_arrival_code);
  // console.log(factory_arrival_code);
  const query = `SELECT
  H.FACTORY_ARRIVAL_CODE,
  D.RMD_RECNO,
  H.UNIT_CODE,
  (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0)) AS total_qty,
  (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0)) AS initial_qty,
  D.UNIQ_ID,
  D.ITEM_CODE,
  (SELECT hsn FROM sl_mst_item WHERE marked IS NULL AND item_code = D.ITEM_CODE) AS hsn,
  D.SIZE_CODE,
  D.QUALITY_CODE,
  get_item(D.ITEM_CODE) AS item,
  get_uom(D.UOM_CODE) AS uom,
  D.UOM_CODE,
  get_size(D.SIZE_CODE) AS size,
  get_quality(D.QUALITY_CODE) AS grade,
  D.ITEM_RATE AS rate,
  D.ITEM_STORE_CD,
  D.UNIQUE_CODE gate_uniq,
  D.RMD_CODE,
  aa.preamount ,
  aa.discount_on,
  aa.postamount ,
  aa.amount2,
  aa.rate1,
  aa.dis_type,
  aa.discount
FROM
  PUR_FACTORY_ARRIVAL_HDR H
JOIN
  PUR_FACTORY_ARRIVAL_DET D ON H.FACTORY_ARRIVAL_CODE = D.FACTORY_ARRIVAL_CODE
LEFT JOIN (
  SELECT
      amount preamount,
      amount2 postamount,
      rate_dummy amount2,
      rate1,
      discount_on,
      dis_type,
      discount,
      RMD_CODE,
      UNIQUE_CODE
  FROM
      pur_rmdeal_det
  WHERE
      marked IS NULL
) aa ON aa.RMD_CODE = D.RMD_CODE
 AND aa.UNIQUE_CODE = D.RMD_RECNO 
LEFT JOIN 
(SELECT 
       IDT.FACTORY_ARRIVAL_CODE,
       SUM(coalesce(IDT.total_qty,0)) AS mrir_qty,
       IDT.gate_uniq
   FROM 
       pur_mrir_hdr IH
   JOIN 
       pur_mrir_det IDT ON IH.mrir_code = IDT.mrir_code
   WHERE 
       IH.marked IS NULL
       AND IDT.marked IS NULL
   GROUP BY 
       IDT.FACTORY_ARRIVAL_CODE,IDT.gate_uniq) MR 
ON 
  H.FACTORY_ARRIVAL_CODE = MR.FACTORY_ARRIVAL_CODE 
  AND D.unique_code = MR.gate_uniq
 where
  H.MARKED IS NULL
  AND D.MARKED IS null
and  (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0))>0
 AND H.FACTORY_ARRIVAL_CODE = '${factory_arrival_code}'
 AND H.DEALTYPE_CD = ${dealtype_cd}
 and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' 
 and h.unit_code =${req.user.unit}`;

  console.log(query);
  const Requisition = await client.query(query);
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
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
        query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where   marked is null and company_code =${req.user.company}`;
        // console.log(query);
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

exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);
  const hsn1 = await client.query(
    `SELECT hsn, get_uom(item_uom) uom_nm FROM sl_mst_item WHERE  item_code=${req.params.code}`
  );

  const size = await client.query(
    `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code=${req.params.code}`
  );

  const grade = await client.query(
    `select quality_code, get_quality(quality_code) from  sl_mst_item_qual_det where item_code=${req.params.code}`
  );
  const uom = await client.query(
    `select item_uom, get_uom(item_uom) from  sl_mst_item where item_code=${req.params.code}`
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

exports.OrderPurchaseTaxCalByHsn = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body, "postman");
  const obj = req.body;

  console.log(obj);
  // Check if invoiceTaxChargeDetail exists and delete it from the object
  if (obj.mrirTaxChargeDetail) {
    delete obj.mrirTaxChargeDetail;
    await client.query(
      `delete from pur_mrir_charge_det where mrir_code='${obj.mrirHdr[0].mrir_code}'`
    );
  }

  if (obj.chargedata) {
    delete obj.chargedata;
    await client.query(
      `delete from pur_mrir_charge_det where mrir_code='${obj.mrirHdr[0].mrir_code}'`
    );
  }
  const date = obj.mrirHdr[0].mrir_date;
  // console.log(date);
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
  // // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);

  for (let i = 0; i < obj.mrirDetail.length; i++) {
    // console.log(obj.mrirDetail[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    // console.log(obj.mrirDetail[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    const hsnTax = await client.query(
      `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
        D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
        FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
       WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.mrirDetail[i].hsn}' and '${date1}' between  H.f_date  and H.t_date       
       ;`
    );
    // // console.log(
    //   hsnTax.rows,
    //   "dddddddddddddddddddddddddddddddddddddddddddddddddd"
    // );
    ob.push(hsnTax.rows);
    for (let j = i; j <= i; j++) {
      tax = [];
      // console.log("j", j);

      // Check the type and assign the appropriate values
      if (obj.mrirHdr[0].m_type === "wm") {
        var amount = obj.mrirDetail[i].amount2;
        var qty = obj.mrirDetail[i].total_qty;
      } else {
        var amount = obj.mrirDetail[i].amount2;
        var qty = obj.mrirDetail[i].total_qty;
      }
      // var amount = obj.mrirDetail[i].amount2;
      // var qty = obj.mrirDetail[i].total_qty;
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
          } // // console.log(tax);
          else if (!ob[j][k].ref_chrg && ob[j][k].charge_type === "p") {
            Tax =
              Math.round(((amount * ob[j][k].charge_value) / 100) * 100) / 100;
          } else {
            Tax = Math.round(ob[j][k].charge_value * 100) / 100;
          }
        } else if (ob[j][k].charge_type_on === "o") {
          Tax = Math.round(qty * ob[j][k].charge_value) / 100;
        }

        amount = Math.round((amount + Tax) * 100) / 100;
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
  // console.log("tax", tax);
  //ob.push(rows.low)
  res.status(200).json({
    status: "success",
    data: {
      ob1,
      feild1,
      tax,
      newTax,
    },
  });
});

exports.OrderPurchasewithRequisition = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log("hiiiiiiiiiiiiiiiiiiiiiii");
  // console.log("hiiiiiiiiiiiiiiiiiiiiiii");

  const customer = await client.query(
    `SELECT  
    H.REF_NO,
    H.plan_date,
    get_item(d.item_code) AS item_name,
    get_size(d.size_code) AS sz,
    get_quality(d.quality_code) AS qt,
    d.item_code,
    d.size_code,
    d.quality_code,
    d.UNIQUE_CODE,
    H.rq_CODE,
    d.QTY,
    requisition_balance(H.rq_CODE, d.UNIQUE_CODE, H.UNIT_CODE, '${req.params.code}') AS BAL_QTY
   
FROM
    PUR_RM_REQUISITION_hdr H
JOIN
    PUR_RM_REQUISITION_det D ON H.RQ_CODE = D.RQ_CODE
WHERE  
    H.MARKED IS NULL
    AND D.MARKED IS NULL  and H.RQ_CODE ='5'
   -- AND H.AUTH_STATUS = '1'
   -- AND H.UNIT_CODE = 1
   -- AND requisition_balance(H.rq_CODE, d.UNIQUE_CODE, H.UNIT_CODE, '4') > 0
ORDER BY
    H.plan_date;`
  );
  // console.log(customer.rows);
  res.status(200).json({
    status: "success",
    data: {
      customer,
    },
  });
});

exports.createOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  const body = req.body;
  console.log(body, "TTTTTTTTTTTTTTTTTTTTTTT");

  var qty = 0;
  for (let i = 0; i < body.mrirDetail.length; i++) {
    qty = qty + body.mrirDetail[i].total_qty;
  }
  const TOTAL_QTY = qty;
  console.log(TOTAL_QTY, "Total qtyyyyyyyyyyyyyyyyyyyyyyyy");
  // const invoiceCode = await generateInvoiceId(client);

  /////////////////////new code voucher
  const vdate = body.mrirHdr[0].mrir_date;
  const vtype = 7;
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
  const arr = jsonData.createNupdate.fieldNames;

  const openingBalanceCode = await generateReqId(client);
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
        const query = `INSERT INTO ${arr[i].tableName} (mrir_code, voucher_code,  ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${openingBalanceCode}', '${voucherCode}',  ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
        // console.log(query);
        await client.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let query = "";

          // Check the m_type condition
          //       if (body.mrirHdr[0].m_type === "wm") {
          //         // Specific SQL INSERT for 'wm' type
          //         query = `
          //   INSERT INTO pur_mrir_det (
          //     mrir_code, item_code, size_code, quality_code, uom_code,
          //     discount_on, discount, amount, hsn, rate, rate1, dis_type, amount2, total_qty
          //   ) VALUES (
          //     '${openingBalanceCode}',
          //     ${body.mrirDetail[j].item_code},
          //     ${body.mrirDetail[j].size_code},
          //     ${body.mrirDetail[j].quality_code},
          //     ${body.mrirDetail[j].uom_code},
          //     '${body.mrirDetail[j].disOn}',
          //     ${body.mrirDetail[j].discount},
          //     ${body.mrirDetail[j].amount},
          //     '${body.mrirDetail[j].hsn}',
          //     ${body.mrirDetail[j].item_rate},
          //     ${body.mrirDetail[j].finalRate},
          //     '${body.mrirDetail[j].distype}',
          //     ${body.mrirDetail[j].netAmount},
          //     ${body.mrirDetail[j].quantity}
          //   )
          // `;
          //       } else {
          // Generic SQL INSERT based on dynamic fields
          let fields = "";
          let values = "";

          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field]) {
              fields += `${field}, `;
              if (arr[i].fieldsRequired[field] === "date") {
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === "number") {
                values += `${obj[field]}, `;
              } else {
                values += `'${obj[field]}', `;
              }
            }
          });

          // Remove trailing commas from fields and values
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);

          query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueMrirIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year, mrir_date) VALUES ('${openingBalanceCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}', TO_DATE('${body.mrirHdr[0].mrir_date}', 'DD-MM-YYYY'))`;

          // Log and execute the query
          // console.log(query);
          await client.query(query);
        }
      }
    }
  }
  /////// for tax data
  //   if (body.chargedata) {
  //     for (let i = 0; i < body.chargedata.length; i++) {
  //       const query = `INSERT INTO pur_mrir_charge_det (mrir_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue) VALUES ('${openingBalanceCode}',${
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
    var customer_name = body.mrirHdr[0].party_code;
    var a = await client.query(`select  get_party('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_party;
    //  this is for item account
    const totalAmount2 = body.mrirDetail.reduce(
      (sum, item) => sum + item.amount2,
      0
    );
    var itemAcc =
      await client.query(`select distinct account_code from sl_mst_item_account_det where marked is null
and item_code=${body.mrirDetail[0].item_code}`);
    console.log(itemAcc, "itemacc", itemAcc.rows[0].account_code);
    const detailitem = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE, Entry_type, account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,   VOUCHER_TYPE) VALUES
('${voucherCode}', 'D', ${itemAcc.rows[0].account_code},
  ${totalAmount2}
  , ${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

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

    const detailtax = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,   VOUCHER_TYPE) VALUES
('${voucherCode}', 'D', ${taxAcc.rows[0].primary_account},
  ${TaxableAmount}
  ,${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    // console.log(detailvoucher);
    await client.query(detailtax);

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Vendor: " +
      distributor_name +
      "," +
      "Truck No: " +
      (body.mrirHdr[0].truck_number || "") +
      "," +
      "net Wt: " +
      (body.mrirHdr[0].received_weight || "") +
      "," +
      "mrir_code: " +
      openingBalanceCode +
      "," +
      "QTY: " +
      TOTAL_QTY;
    // console.log(narration, "narration");
    // console.log(narration, "narration");

    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status,  send_status)

  VALUES ('${voucherCode}', ${7}, '${vdate1}',
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    ,'${narration}','${Year1}', ${req.user.company},${
      req.user.unit
    },  '${Year1}','M', 'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    var account = await client.query(
      `select account_code from pur_mst_party where party_code=${customer_name}`
    );
    // console.log(account);
    const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,  VOUCHER_TYPE) VALUES
  ('${voucherCode}', 'C', ${acc_code},
    ${body.chargedata[body.chargedata.length - 1].RunningTotal}
    , ${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
  }

  if (body.chargedata) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const query = `INSERT INTO pur_mrir_charge_det (mrir_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${openingBalanceCode}',${
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

  res.status(200).json({
    status: "success",
    message: "Mrir Created Successfully",
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
  const body = req.body;
  console.log(body);
  var qty = 0;
  for (let i = 0; i < body.mrirDetail.length; i++) {
    qty = qty + body.mrirDetail[i].total_qty;
  }
  const TOTAL_QTY = qty;
  console.log(TOTAL_QTY, "Total qtyyyyyyyyyyyyyyyyyyyyyyyy");
  // const item = req.body.accountHeader[0].account_name;
  // // console.log(item);
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
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueMrirIdentifier}='${req.params.code}'`;
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueMrirIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }

  if (body.chargedata && body.chargedata.length > 0) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const query = `INSERT INTO pur_mrir_charge_det (mrir_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${
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
      `select VOUCHER_CODE from pur_mrir_hdr where mrir_code ='${req.params.code}'`
    );
    console.log(voucher);
    const voucherId = voucher.rows[0].voucher_code;
    await client.query(
      `delete from    FIN_MST_T_VOUCHER_HDR  where VOUCHER_CODE='${voucherId}'`
    );
    await client.query(
      `delete from  FIN_MST_T_VOUCHER_DET  where VOUCHER_CODE='${voucherId}'`
    );
    const vdate = body.mrirHdr[0].mrir_date;
    const vtype = 7;
    // const cdate = req.body.VoucherHeader[0].cheque_date;
    console.log(":vandna######", vtype);
    // // console.log(":vandna######", vtype);
    const vdate1 = vdate.split("-").reverse().join("-");
    console.log(vdate1);
    const getYear = await client.query(`select fin_yr('${vdate1}');`);
    console.log(getYear, "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy");
    // const vtypedesc = await client.query(
    //   `select vshort_code from fin_mst_voucher_type where voucher_type_code=${vtype};`
    // );

    // const desc = vtypedesc.rows[0].vshort_code;
    const Year1 = getYear.rows[0].fin_yr;
    ///////////////////////now insert//////////////////

    var customer_name = body.mrirHdr[0].party_code;
    var a = await client.query(`select  get_party('${customer_name}')`);
    // console.log(a);
    const distributor_name = a.rows[0].get_party;
    //  this is for item account
    const totalAmount2 = body.mrirDetail.reduce(
      (sum, item) => sum + item.amount2,
      0
    );

    var itemAcc =
      await client.query(`select distinct account_code from sl_mst_item_account_det where marked is null
and item_code=${body.mrirDetail[0].item_code}`);
    console.log(itemAcc, "itemacc", itemAcc.rows[0].account_code);
    const detailitem = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE, Entry_type, account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,   VOUCHER_TYPE) VALUES
('${voucherId}', 'D', ${itemAcc.rows[0].account_code},
${totalAmount2}
, ${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    console.log(detailitem);
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

    const detailtax = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,   VOUCHER_TYPE) VALUES
('${voucherId}', 'D', ${taxAcc.rows[0].primary_account},
${TaxableAmount}
,${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    // console.log(detailvoucher);
    await client.query(detailtax);

    // console.log(distributor_name, "distributor_name");
    const narration =
      "Voucher posted against Vendor: " +
      distributor_name +
      "," +
      "Truck No: " +
      (body.mrirHdr[0].truck_number || "") +
      "," +
      "net Wt: " +
      (body.mrirHdr[0].received_weight || "") +
      "," +
      "mrir_code: " +
      voucherId +
      "," +
      "QTY: " +
      TOTAL_QTY;
    // console.log(narration, "narration");
    // console.log(narration, "narration");

    const queryvoucher = `INSERT INTO fin_mst_t_voucher_hdr (VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, AMOUNT,NARRATION, VOUCHER_YEAR, COMPANY_CODE, UNIT_CODE , INV_YN, status,  send_status)

VALUES ('${voucherId}', ${7}, '${vdate1}',
  ${body.chargedata[body.chargedata.length - 1].RunningTotal}
  ,'${narration}','${Year1}', ${req.user.company},${
      req.user.unit
    },  '${Year1}','M', 'A' )`;
    // console.log(queryvoucher);
    await client.query(queryvoucher);

    var account = await client.query(
      `select account_code from pur_mst_party where party_code=${customer_name}`
    );
    // console.log(account);
    const acc_code = account.rows[0].account_code;
    // console.log(acc_code, "acc_code");

    const detailvoucher = `INSERT INTO fin_mst_t_voucher_det (VOUCHER_CODE,Entry_type,account_code,AMOUNT,COMPANY_CODE,UNIT_CODE,  status , send_status,  VOUCHER_TYPE) VALUES
('${voucherId}', 'C', ${acc_code},
  ${body.chargedata[body.chargedata.length - 1].RunningTotal}
  , ${req.user.company},${req.user.unit},  'M', 'A',  ${7})`;

    // console.log(detailvoucher);
    await client.query(detailvoucher);
  }

  res.status(200).json({
    status: "success",
    message: "mrir Updated Successfully",
  });
});

exports.deleteOpening = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Account Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;

  const voucher = await client.query(
    `select VOUCHER_CODE from pur_mrir_hdr where mrir_code ='${req.params.code}'`
  );
  console.log(voucher);
  const voucherId = voucher.rows[0].voucher_code;
  const tableArray = [
    "pur_purchase_return_hdr"
    
  ];  
  const result = await Promise.all(
    tableArray.map(async (table) => {
      return await client.query(
        `SELECT ref_table_c('${table}', 'mrir_code', '${req.params.code}')`
      );
    })
  );

  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table_c);
 
  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Mrir is Already Tagged",
      isUsed: true,
    });
  } else {

  for (let i = 0; i < arr.length; i++) {
    // console.log(
    //   `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueMrirIdentifier}='${req.params.code}'`
    // );
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueMrirIdentifier}='${req.params.code}'`
    );
  }

  await client.query(
    `update  pur_mrir_charge_det set marked='D' where mrir_code='${req.params.code}'`
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
    message: "Account Deleted Successfully",
  });
}
});

exports.OpeningValue = wrapper(async (req, res, next) => {
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

  const OpenningValue = await client.query(
    `select stock_with_opbal(
      ${item_code}, -- item
      ${quality_code}, -- quality
      ${size_code}, -- sz
      TO_DATE('${stock_date}', 'DD-MM-YYYY'),  -- Convert the date string to a proper date
      'M', -- status1 (hard-coded)
      ${comany_code}, -- comp_code
      ${site}, -- site
      'R', -- comp_type (hard-coded)
      '${store_code}', -- store_c
      '${year}' -- f_yr
    )`
  );

  res.status(200).json({
    status: "success",
    data: {
      OpenningValue,
    },
  });
});

exports.getAllSaudaofCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.query);
  const { reqCode, dealType } = req.query;
  console.log(req.query[" dealType"]);
  console.log(req.query.dealType);

  // Construct the SQL query
  const sqlQuery = `SELECT
    H.FACTORY_ARRIVAL_CODE,
    D.RMD_RECNO,
    H.UNIT_CODE,
    (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0)) AS total_qty,
    (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0)) AS initial_qty,
    D.UNIQ_ID,
    D.ITEM_CODE,
    (SELECT hsn FROM sl_mst_item WHERE marked IS NULL AND item_code = D.ITEM_CODE) AS hsn,
    D.SIZE_CODE,
    D.QUALITY_CODE,
    get_item(D.ITEM_CODE) AS item,
    get_uom(D.UOM_CODE) AS uom,
    D.UOM_CODE,
    get_size(D.SIZE_CODE) AS size,
    get_quality(D.QUALITY_CODE) AS grade,
    D.ITEM_RATE AS rate,
    D.ITEM_STORE_CD,
    D.UNIQUE_CODE gate_uniq,
    D.RMD_CODE,
    aa.amount,
    aa.discount_on,
    aa.amount2,
    aa.rate1,
    aa.dis_type,
    aa.discount
FROM
    PUR_FACTORY_ARRIVAL_HDR H
JOIN
    PUR_FACTORY_ARRIVAL_DET D ON H.FACTORY_ARRIVAL_CODE = D.FACTORY_ARRIVAL_CODE
LEFT JOIN (
    SELECT
        amount,
        amount2,
        rate1,
        discount_on,
        dis_type,
        discount,
        RMD_CODE,
        UNIQUE_CODE
    FROM
        pur_rmdeal_det
    WHERE
        marked IS NULL
) aa ON aa.RMD_CODE = D.RMD_CODE
   AND aa.UNIQUE_CODE = D.RMD_RECNO 
LEFT JOIN 
(SELECT 
         IDT.FACTORY_ARRIVAL_CODE,
         SUM(coalesce(IDT.total_qty,0)) AS mrir_qty,
         IDT.gate_uniq
     FROM 
         pur_mrir_hdr IH
     JOIN 
         pur_mrir_det IDT ON IH.mrir_code = IDT.mrir_code
     WHERE 
         IH.marked IS NULL
         AND IDT.marked IS NULL
     GROUP BY 
         IDT.FACTORY_ARRIVAL_CODE,IDT.gate_uniq) MR 
ON 
    H.FACTORY_ARRIVAL_CODE = MR.FACTORY_ARRIVAL_CODE 
    AND D.unique_code = MR.gate_uniq
   where
    H.MARKED IS NULL
    AND D.MARKED IS null
  and  (coalesce(D.QUANTITY,0)-coalesce(MR.mrir_qty,0))>0
  AND H.FACTORY_ARRIVAL_CODE <> '${reqCode}'
  AND H.DEALTYPE_CD = ${req.query[" dealType"]}
   and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}' 
   and h.unit_code =${req.user.unit}
  `;

  // Log the query before executing it
  console.log("Executing SQL query:", sqlQuery);

  // Execute the query
  const Requisition = await client.query(sqlQuery);

  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

const pdfmake = wrapper(async (req, res, str) => {
  const mrir_code = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", mrir_code);

  try {
    const client = req.dbConnection;
    // Query to get MRIR header information
    const headerQuery = `
      SELECT 
        h.mrir_code, 
        h.mrir_date, 
        get_party(h.party_code) AS vendor,
        (SELECT add1 
         FROM pur_mst_party 
         WHERE marked IS NULL 
           AND party_code = h.party_code 
           AND company_code = 1 
           AND unit_code = 1) AS vendor_address,
        h.bill_date, 
        h.bill_no, 
        h.truck_no, 
        h.po_ref, 
        h.gate_pass,
        (SELECT deal_date 
         FROM pur_rmdeal_hdr 
         WHERE marked IS NULL 
           AND company_code = 1 
           AND unit_code = 1 
           AND rmd_code = h.po_ref) AS po_date
      FROM pur_mrir_hdr h 
      WHERE h.marked IS NULL 
        AND h.company_code = 1 
        AND h.unit_code = 1
        AND h.mrir_code = $1;
    `;
    const headerResult = await client.query(headerQuery, [mrir_code]);

    // Query to get MRIR item details
    const itemsQuery = `
      SELECT 
        get_item(item_code) AS item_nm,
        get_size(size_code) AS size_nm,
        get_quality(quality_code) AS grade,
        total_qty AS received_qty,
        get_uom(uom_code) AS uom,
        rate1,
        amount2
      FROM pur_mrir_det 
      WHERE marked IS NULL 
        AND company_code = 1 
        AND unit_code = 1 
        AND mrir_code = $1;
    `;
    const itemsResult = await client.query(itemsQuery, [mrir_code]);

    // Query to get MRIR charges
    const chargesQuery = `
      SELECT 
        get_charge(charge_code) AS charge_name,
        charge_type,
        mrir_code,
        charge_value,
        SUM(taxvalue) AS tax_val
      FROM pur_mrir_charge_det
      WHERE marked IS NULL 
        AND charge_code NOT IN (1)
        AND mrir_code = $1
      GROUP BY charge_code, charge_type, mrir_code, charge_value;
    `;
    const chargesResult = await client.query(chargesQuery, [mrir_code]);
    const address = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
        FROM sl_mst_site where marked is null and company=1
        and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );

    // Compile the results
    const result = {
      header: headerResult.rows[0],
      items: itemsResult.rows,
      charges: chargesResult.rows,
      address: address.rows[0],
      company: company.rows[0],
    };

    res.json(result);
  } catch (error) {
    console.error("Error fetching MRIR data:", error);
    res.status(500).json({ error: "Failed to fetch MRIR data" });
  }
});

exports.downloadPDF = async (req, res, next) => {
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};
