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
  fs.readFileSync(`${__dirname}/../PurchaseOrder.json`, "utf8")
);

// how to get data from postgres database and create a pdf file from it and save it in the folder

// const generateReqId = async (client) => {
//   const response1 = await client.query(
//     `SELECT MAX(rmd_code)M FROM PUR_RMDEAL_HDR`
//   );
//   // console.log("ggjhjkkjkj", response1);

//   return Number(response1.rows[0].m) + 1;
// };

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(rmd_code from '[0-9]+$') AS INTEGER)) AS M FROM PUR_RMDEAL_HDR`
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
  console.log(req.user);
  const Requisition = await client.query(
    `select rmd_code po_code, timestamptostring(deal_date) po_date, get_dealtype(deal_type_cd) deal_type, get_currency(currency_cd) currency,  get_party(party_code) vendor from PUR_RMDEAL_HDR where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
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
    query += ` WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}' and marked is null`;
    // console.log(query);
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }
  const dbData = await client.query(`
  select   get_charge(charge_code) charge_desc, charge_cat,charge_value ,charge_type, INCLUDE_COST, 
  use_for, get_charge(ref_charge)ref_chrg,ref_on, charge_type_on ,TaxValue,RunningTotal 
   from  purchase_order_tax_charge_detail where rmd_code='${req.params.code}' and marked is null
  `);
  data["purchaseTaxChargeDetail"] = dbData.rows;

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
        let query = ``;
        if (key === "REQ_CODE") {
          query = `
            SELECT 
                h.rq_code, h.rq_code vname
            FROM 
                PUR_RM_REQUISITION_hdr H
            JOIN 
                PUR_RM_REQUISITION_det D ON H.RQ_CODE = D.RQ_CODE
            LEFT JOIN (
                SELECT 
                    IDT.rq_code,
                    SUM(coalesce(IDT.total_QTY, 0)) AS INV_QTY
                FROM 
                    PUR_RMDEAL_HDR IH
                JOIN 
                    PUR_RMDEAL_DET IDT ON IH.rmd_code = IDT.rmd_code 
                    AND IH.req_code = IDT.rq_code
                WHERE 
                    IH.MARKED IS NULL        
                    AND IDT.MARKED IS NULL
                    AND IH.company_code = ${req.user.company}
                    AND IH.unit_code = ${req.user.unit}
                    AND IH.fin_year = '${req.user.finyear}'
                GROUP BY 
                    IDT.rq_code
            ) SI ON D.rq_CODE = SI.rq_code
            WHERE  
                H.MARKED IS NULL 
                AND D.MARKED IS NULL  
                AND (coalesce(D.QTY, 0) - coalesce(SI.inv_qty, 0)) > 0
            ORDER BY 
                h.rq_code;
          `;
        } else {
          // query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE MARKED IS NULL ORDER BY 2`;
          query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where MARKED IS NULL  and company_code =${req.user.company} order by 2`;
        }
        console.log(query);
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

exports.OrderPurchaseTaxCalByHsn = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body, "postman");
  const obj = req.body;

  console.log(obj);
  // Check if invoiceTaxChargeDetail exists and delete it from the object
  if (obj.purchaseTaxChargeDetail) {
    delete obj.purchaseTaxChargeDetail;
    await client.query(
      `delete from purchase_order_tax_charge_detail where rmd_code='${obj.poHdr[0].rmd_code}'`
    );
  }

  if (obj.chargedata) {
    delete obj.chargedata;
    await client.query(
      `delete from purchase_order_tax_charge_detail where rmd_code='${obj.poHdr[0].rmd_code}'`
    );
  }
  // console.log(obj);
  // const hsn=obj.invoiceSize[0].hsn
  const date = obj.poHdr[0].deal_date;
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

  for (let i = 0; i < obj.purreqDetail.length; i++) {
    // console.log(obj.purreqDetail[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    // console.log(obj.purreqDetail[i].hsn, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    const hsnTax = await client.query(
      `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
        D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
        FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
       WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.purreqDetail[i].hsn}' and '${date1}' between  H.f_date  and H.t_date       
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
      if (obj.poHdr[0].type === "wr") {
        var amount = obj.purreqDetail[i].amount2;
        var qty = obj.purreqDetail[i].total_qty;
      } else {
        var amount = obj.purreqDetail[i].amount2;
        var qty = obj.purreqDetail[i].total_qty;
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

  // Construct the SQL query as a string
  const query = `
    SELECT timestamptostring(h.plan_date) plan_date, get_item(d.item_code) item_name, get_size(d.size_code) sz,
      get_quality(d.quality_code) qt, d.item_code, d.size_code, d.quality_code, d.uom_code,
      get_uom(d.uom_code) uom, (SELECT hsn FROM sl_mst_item WHERE item_code=d.item_code) hsn,
      d.UNIQUE_CODE, H.rq_CODE, (COALESCE(d.QTY,0) - COALESCE(SI.inv_qty,0)) total_qty,  (COALESCE(d.QTY,0) - COALESCE(SI.inv_qty,0)) initial_qty
    FROM PUR_RM_REQUISITION_hdr H
    JOIN PUR_RM_REQUISITION_det D ON H.RQ_CODE = D.RQ_CODE
    LEFT JOIN (
      SELECT IDT.rq_code, IDT.requisition_recno,
        SUM(COALESCE(IDT.total_QTY, 0)) AS INV_QTY
      FROM PUR_RMDEAL_HDR IH
      JOIN PUR_RMDEAL_DET IDT ON IH.rmd_code = IDT.rmd_code
      WHERE IH.MARKED IS NULL
        AND IDT.MARKED IS NULL
        AND IH.company_code = ${req.user.company}
        AND IH.unit_code = ${req.user.unit}
        AND IH.fin_year = '${req.user.finyear}'
      GROUP BY IDT.rq_code, IDT.requisition_recno
    ) SI ON D.rq_CODE = SI.rq_code
    WHERE H.MARKED IS NULL
      AND D.MARKED IS NULL
      AND (COALESCE(d.QTY,0) - COALESCE(SI.inv_qty,0)) > 0
      AND H.company_code = ${req.user.company}
      AND H.fin_year = '${req.user.finyear}'
      AND H.unit_code = ${req.user.unit}
      AND H.rq_CODE = '${req.params.code}'
  `;

  // Log the query before execution
  console.log("Executing SQL Query:", query);

  // Execute the query
  const customer = await client.query(query);

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
  const arr = jsonData.createNupdate.fieldNames;
  const body = req.body;
  console.log(body, "bodyyyyyyyyyyyyyyyyyyyyyyyyyyy");
  // console.log(body.purreqDetail[0].unique_code, "rtirtrti");
  // console.log(body.purreqDetail[j].unique_code, "rtirtrti");
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
        const query = `INSERT INTO ${arr[i].tableName} (rmd_code,  ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${openingBalanceCode}',  ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
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
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              else if (arr[i].fieldsRequired[field] === "number")
                values += `${obj[field]}, `;
              else values += `'${obj[field]}', `;
            }
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${
            arr[i].uniqueReqIdentifier
          }, ${fields}, company_code, user_code, unit_code, fin_year, requisition_recno) VALUES ('${openingBalanceCode}', ${values}, '${
            req.user.company
          }', '${req.user[0].spec_code}', '${req.user.unit}', '${
            req.user.finyear
          }', '${body.purreqDetail[j].unique_code || null}')`;
          // console.log(query);
          await client.query(query);
        }
      }
    }
  }

  if (body.chargedata) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const query = `INSERT INTO purchase_order_tax_charge_detail (rmd_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${openingBalanceCode}',${
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
    message: "Opening Balance Created Successfully",
  });
});

// exports.updateOpening = wrapper(async (req, res, next) => {
//   if (!req.params.code) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Please specify the Account Code",
//     });
//   }
//   const client = req.dbConnection;

//   const arr = jsonData.createNupdate.fieldNames;
//   const body = req.body;
//   console.log(body, "rrrrrrrrrrrrrrrrrrrr");
//   // const item = req.body.accountHeader[0].account_name;
//   // // console.log(item);
//   for (let i = 0; i < arr.length; i++) {
//     if (req.body[arr[i].responseFieldName]) {
//       if (!arr[i].typeArray) {
//         const obj = req.body[arr[i].responseFieldName][0];
//         let fields = ``;
//         Object.keys(arr[i].fieldsRequired).forEach((field) => {
//           if (obj[field]) {
//             if (arr[i].fieldsRequired[field] === "date")
//               fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//             else if (arr[i].fieldsRequired[field] === "number")
//               fields += `${field} = ${obj[field]}, `;
//             else fields += `${field} = '${obj[field]}', `;
//           }
//         });
//         fields = fields.slice(0, -2);
//         // const getYear = await client.query(
//         //   `select duplicate_account_chk('${item}');`
//         // );
//         // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
//         // // // console.log(getYear.rows[0], "dgjejygdejydhejdyejdhejde");
//         // if (getYear.rows[0].duplicate_account_chk >= "1") {
//         //   return res.status(200).json({
//         //     status: "fail",
//         //     message: "Account Already Exists",
//         //   });
//         // }
//         const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`;
//         // console.log(query);
//         await client.query(query);
//       } else {
//         const arr1 = req.body[arr[i].responseFieldName];
//         for (let j = 0; j < arr1.length; j++) {
//           const obj = arr1[j];
//           if (obj.PARAM === "UPDATE") {
//             let fields = ``;
//             Object.keys(arr[i].fieldsRequired).forEach((field) => {
//               if (obj[field]) {
//                 if (arr[i].fieldsRequired[field] === "date")
//                   fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//                 else if (arr[i].fieldsRequired[field] === "number")
//                   fields += `${field} = ${obj[field]}, `;
//                 else fields += `${field} = '${obj[field]}', `;
//               }
//             });
//             fields = fields.slice(0, -2);
//             const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${
//               arr[i].uniqueRowIdentifier
//             }='${obj[arr[i].uniqueRowIdentifier]}'`;
//             // console.log(query);
//             await client.query(query);
//             for (let i = 0; i < body.chargedata.length; i++) {
//               const query = `INSERT INTO purchase_order_tax_charge_detail (rmd_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${
//                 body.poHdr[0].rmd_code
//               }',${body.chargedata[i].charge_code},
//         ${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
//                 body.chargedata[i].charge_type || ""
//               }','${body.chargedata[i].include_cost}',
//         '${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
//                 body.chargedata[i].ref_on || ""
//               }','${body.chargedata[i].charge_type_on || ""}' ,${
//                 body.chargedata[i].RunningTotal
//               },${body.chargedata[i].TaxValue}, '${req.user.company}', '${
//                 req.user[0].spec_code
//               }', '${req.user.unit}', '${req.user.finyear}')`;

//               // console.log(query);
//               await client.query(query);
//             }
//           } else if (obj.PARAM === "DELETE") {
//             const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
//               arr[i].uniqueRowIdentifier
//             }='${obj[arr[i].uniqueRowIdentifier]}'`;
//             // console.log(query);
//             await client.query(query);
//             for (let i = 0; i < body.chargedata.length; i++) {
//               const query = `INSERT INTO purchase_order_tax_charge_detail (rmd_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${
//                 body.poHdr[0].rmd_code
//               }',${body.chargedata[i].charge_code},
//         ${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
//                 body.chargedata[i].charge_type || ""
//               }','${body.chargedata[i].include_cost}',
//         '${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
//                 body.chargedata[i].ref_on || ""
//               }','${body.chargedata[i].charge_type_on || ""}' ,${
//                 body.chargedata[i].RunningTotal
//               },${body.chargedata[i].TaxValue}, '${req.user.company}', '${
//                 req.user[0].spec_code
//               }', '${req.user.unit}', '${req.user.finyear}')`;

//               // console.log(query);
//               await client.query(query);
//             }
//           } else {
//             let fields = ``;
//             let values = ``;
//             Object.keys(arr[i].fieldsRequired).forEach((field) => {
//               if (obj[field]) {
//                 fields += `${field}, `;
//                 if (arr[i].fieldsRequired[field] === "date")
//                   values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
//                 else if (arr[i].fieldsRequired[field] === "number")
//                   values += `${obj[field]}, `;
//                 else values += `'${obj[field]}', `;
//               }
//             });
//             fields = fields.slice(0, -2);
//             values = values.slice(0, -2);
//             const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueReqIdentifier}, ${fields}) VALUES ('${req.params.code}', ${values})`;
//             // console.log(query);
//             await client.query(query);
//             for (let i = 0; i < body.chargedata.length; i++) {
//               const query = `INSERT INTO purchase_order_tax_charge_detail (rmd_code, charge_code, charge_cat,charge_value ,charge_type, INCLUDE_COST, use_for, ref_charge,ref_on, charge_type_on ,RunningTotal, TaxValue,  company_code, user_code, unit_code, fin_year) VALUES ('${
//                 req.params.code
//               }',${body.chargedata[i].charge_code},
//         ${body.chargedata[i].charge_cat},${body.chargedata[i].charge_value}, '${
//                 body.chargedata[i].charge_type || ""
//               }','${body.chargedata[i].include_cost}',
//         '${body.chargedata[i].use_for}',${body.chargedata[i].ref_charge},'${
//                 body.chargedata[i].ref_on || ""
//               }','${body.chargedata[i].charge_type_on || ""}' ,${
//                 body.chargedata[i].RunningTotal
//               },${body.chargedata[i].TaxValue}, '${req.user.company}', '${
//                 req.user[0].spec_code
//               }', '${req.user.unit}', '${req.user.finyear}')`;

//               // console.log(query);
//               await client.query(query);
//             }
//           }
//         }
//       }
//     }
//   }
//   res.status(200).json({
//     status: "success",
//     message: "Account Updated Successfully",
//   });
// });

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
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`;
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
            await client.query(query);
          } else if (obj.PARAM === "DELETE") {
            const query = `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${
              arr[i].uniqueRowIdentifier
            }='${obj[arr[i].uniqueRowIdentifier]}'`;
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
            await client.query(query);
          }
        }
      }

      // Insert into purchase_order_tax_charge_detail only once
    }
  }
  if (body.chargedata && body.chargedata.length > 0) {
    for (let i = 0; i < body.chargedata.length; i++) {
      const chargeData = body.chargedata[i];
      const chargeQuery = `INSERT INTO purchase_order_tax_charge_detail (rmd_code, charge_code, charge_cat,charge_value, charge_type, INCLUDE_COST, use_for, ref_charge, ref_on, charge_type_on, RunningTotal, TaxValue, company_code, user_code, unit_code, fin_year) 
        VALUES (
          '${body.poHdr[0].rmd_code}', 
          ${chargeData.charge_code}, 
          ${chargeData.charge_cat}, 
          ${chargeData.charge_value}, 
          '${chargeData.charge_type || ""}', 
          '${chargeData.include_cost}', 
          '${chargeData.use_for}', 
          ${chargeData.ref_charge}, 
          '${chargeData.ref_on || ""}', 
          '${chargeData.charge_type_on || ""}', 
          ${chargeData.RunningTotal}, 
          ${chargeData.TaxValue}, 
          '${req.user.company}', 
          '${req.user[0].spec_code}', 
          '${req.user.unit}', 
          '${req.user.finyear}'
        )`;

      await client.query(chargeQuery);
    }
  }

  res.status(200).json({
    status: "success",
    message: "Account Updated Successfully",
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
  const tableArray = [
   { table:"pur_factory_arrival_hdr", column: "po_ref"},
   { table:"pur_factory_arrival_det", column: "rmd_code"},
  ]; // List of tables to check

  
  const result = await Promise.all(
    tableArray.map(async ({table,column}) => {
      return await client.query(
        `SELECT ref_table_c('${table}', '${column}', '${req.params.code}')`
      );
    })
  );

  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_table_c);
  

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Order is  Already Tagged",
      isUsed: true,
    });
  } else {
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `UPDATE ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`
    );
  }

  await client.query(
    `update  purchase_order_tax_charge_detail set marked='D' where rmd_code='${req.params.code}'`
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
//  console.log(user, "ye user h")
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

exports.getAllSaudaofCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const { reqCode } = req.query;

  const Requisition =
    await client.query(`SELECT timestamptostring(h.plan_date) plan_date, get_item(d.item_code)item_name,get_size(d.size_code) sz ,
    get_quality(d.quality_code) qt, d.item_code, d.size_code, d.quality_code, d.uom_code, get_uom(d.uom_code) uom, 
    (select hsn from sl_mst_item where item_code=d.item_code) hsn,
    d.UNIQUE_CODE,H.rq_CODE,  (coalesce(d.QTY ,0)-coalesce(SI.inv_qty,0))total_qty, (coalesce(d.QTY ,0)-coalesce(SI.inv_qty,0))initial_qty
    FROM PUR_RM_REQUISITION_hdr H, PUR_RM_REQUISITION_det D
    
     LEFT JOIN 
    (SELECT 
        IDT.rq_code,IDT.requisition_recno,
        SUM(coalesce(IDT.total_QTY,0)) AS INV_QTY
     FROM 
        PUR_RMDEAL_HDR IH
     JOIN 
        PUR_RMDEAL_DET IDT ON IH.rmd_code = IDT.rmd_code 
     WHERE 
        IH.MARKED IS null        
        AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit} 
        and ih.fin_year ='${req.user.finyear}'
     GROUP BY 
        IDT.rq_code,IDT.requisition_recno
    ) SI ON D.rq_CODE = SI.rq_code and d.UNIQUE_CODE=SI.requisition_recno
WHERE  H.MARKED IS NULL AND D.MARKED IS NULL  AND H.RQ_CODE=D.RQ_CODE   
  
    AND  h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}'  
    and h.unit_code =${req.user.unit} AND H.rq_CODE<> '${reqCode}'
    and (coalesce(d.QTY ,0)-coalesce(SI.inv_qty,0))>0`);
  // console.log(Requisition.rows);
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

//////////////Register
exports.getPendingIndent = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var dat1 = [];

  function date_to_postgres(dateparam) {
    var date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    var Date2 = date.toISOString().slice(0, 10);
    var reverse = Date2.split("-").reverse().join("-");
    return reverse;
  }

  // Update the query based on the new requirements
  var query = `
    select h.rq_code,timestamptostring(h.plan_date) plan_date, get_employee(h.requester_code) as requested_by, 
           get_item(d.item_code) as item, get_size(d.size_code) as size_nm, 
           get_quality(d.quality_code) as grade, d.qty, get_uom(d.uom_code) as uom 
    from PUR_RM_REQUISITION_HDR h, PUR_RM_REQUISITION_det d 
    where h.marked is null and d.marked is null 
      and h.rq_code = d.rq_code 
      and h.company_code = ${req.user.company} 
      and h.unit_code = ${req.user.unit} 
      and coalesce(h.rq_code, 'A') not in (
          select coalesce(req_code, 'A') 
          from PUR_RMDEAL_HDR 
          where marked is null 
            and unit_code = ${req.user.unit} 
            and company_code = ${req.user.company}
      );
  `;

  const invoice = await client.query(query);
  console.log(invoice, "indeeeeeeeeeeeeeeeeeeeeeeeeeeeeeent");

  res.status(200).json({
    status: "success",
    data: {
      invoice,
    },
  });
});

exports.getAllPendingIndentByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var today = new Date();
  var startOfWeek = today.getDate() - today.getDay();
  var endOfWeek = startOfWeek + 6;
  var startDate = new Date(today.setDate(startOfWeek));
  var endDate = new Date(today.setDate(endOfWeek));

  var startDateInISO = startDate.toISOString().split("T")[0];
  var endDateInISO = endDate.toISOString().split("T")[0];

  var dat1 = [];

  function date_to_postgres(dateparam) {
    var date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    var Date2 = date.toISOString().slice(0, 10);
    var reverse = Date2.split("-").reverse().join("-");
    return reverse;
  }

  // Updated query with the new table and column names
  var query = `
    select h.rq_code,timestamptostring(h.plan_date) plan_date, get_employee(h.requester_code) as requested_by, 
           get_item(d.item_code) as item, get_size(d.size_code) as size_nm, 
           get_quality(d.quality_code) as grade, d.qty, get_uom(d.uom_code) as uom 
    from PUR_RM_REQUISITION_HDR h, PUR_RM_REQUISITION_det d 
    where h.marked is null 
      and d.marked is null 
      and h.rq_code = d.rq_code 
      and h.company_code = ${req.user.company} 
      and h.unit_code = ${req.user.unit} 
      and coalesce(h.rq_code, 'A') not in (
          select coalesce(req_code, 'A') 
          from PUR_RMDEAL_HDR 
          where marked is null 
            and unit_code = ${req.user.unit} 
            and company_code = ${req.user.company}
      )
      and h.plan_date between '${startDateInISO}' AND '${endDateInISO}';
  `;

  const invoice = await client.query(query);

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

exports.getAllIndentRegister = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  let baseQuery = `
   select h.rq_code, timestamptostring(h.plan_date) plan_date ,get_employee(h.requester_code)requested_by,get_item(d.item_code)item,
get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,d.qty,get_uom(d.uom_code)uom
from PUR_RM_REQUISITION_HDR h, PUR_RM_REQUISITION_det d
where h.marked is null and d.marked is null and h.rq_code=d.rq_code AND h.company_code = 1 AND h.unit_code = 1`;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND H.plan_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }

  const invoice = await client.query(baseQuery);
  console.log(invoice, "indeeeeeeeeeeeeeeeeeeeeeeeeeeeeeent");

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

exports.getAllIndentRegisterByWeek = wrapper(async (req, res, next) => {
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
      h.rq_code,
      timestamptostring(h.plan_date) plan_date,
      get_employee(h.requester_code) AS requested_by,
      get_item(d.item_code) AS item,
      get_size(d.size_code) AS size_nm,
      get_quality(d.quality_code) AS grade,
      d.qty,
      get_uom(d.uom_code) AS uom
    FROM 
      PUR_RM_REQUISITION_HDR h
    JOIN 
      PUR_RM_REQUISITION_det d ON h.rq_code = d.rq_code
    WHERE 
      h.marked IS NULL 
      AND d.marked IS NULL 
      AND h.company_code = ${req.user.company} 
      AND h.unit_code = ${req.user.unit}
      AND h.plan_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;

  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

exports.getAllPurchaseOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
    select h.rmd_code,timestamptostring(h.deal_date) deal_date, get_party(h.party_code) as vendor, 
           get_dealtype(h.deal_type_cd) as deal_type, get_currency(h.currency_cd) as currency, 
           h.currency_rate1, get_po_type(h.po_type1) as po_type, 
           get_item(d.item_code) as item, get_size(d.size_code) as size_nm, 
           get_quality(d.quality_code) as grade, d.total_qty, 
           get_uom(d.uom_code) as uom, d.rate1, d.amount2 
    from PUR_RMDEAL_HDR h, PUR_RMDEAL_det d 
    where h.marked is null 
      and d.marked is null 
      and h.rmd_code = d.rmd_code 
      and h.unit_code = ${req.user.unit} 
      and h.company_code = ${req.user.company} 
      and h.fin_year = '${req.user.finyear}'
  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.deal_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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

exports.getAllPurchaseOrderByWeek = wrapper(async (req, res, next) => {
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
  select h.rmd_code,timestamptostring(h.deal_date) deal_date, get_party(h.party_code) as vendor, 
  get_dealtype(h.deal_type_cd) as deal_type, get_currency(h.currency_cd) as currency, 
  h.currency_rate1, get_po_type(h.po_type1) as po_type, 
  get_item(d.item_code) as item, get_size(d.size_code) as size_nm, 
  get_quality(d.quality_code) as grade, d.total_qty, 
  get_uom(d.uom_code) as uom, d.rate1, d.amount2 
from PUR_RMDEAL_HDR h, PUR_RMDEAL_det d 
where h.marked is null 
and d.marked is null 
and h.rmd_code = d.rmd_code 
and h.unit_code = ${req.user.unit} 
and h.company_code = ${req.user.company} 
and h.fin_year = '${req.user.finyear}'
AND h.deal_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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

exports.getAllPendingGatePass = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  SELECT 
  h.rmd_code,timestamptostring(h.deal_date) deal_date,
  get_party(h.party_code) AS vendor,
  get_dealtype(h.deal_type_cd) AS deal_type,
  get_currency(h.currency_cd) AS currency,
  h.currency_rate1,
  get_po_type(h.po_type1) AS po_type,
  get_item(d.item_code) AS item,
  get_size(d.size_code) AS size_nm,
  get_quality(d.quality_code) AS grade,
  COALESCE(d.total_qty, 0) AS Order_Qty,
  (COALESCE(d.total_qty, 0) - COALESCE(SI.INV_QTY, 0)) AS pending_qty,
  get_uom(d.uom_code) AS uom,
  d.rate1,
  d.amount2
FROM 
  PUR_RMDEAL_HDR h
JOIN 
  PUR_RMDEAL_det d ON h.rmd_code = d.rmd_code
LEFT JOIN 
  (SELECT 
      IDT.rmd_code, 
      IDT.rmd_recno, 
      COALESCE(IDT.quantity, 0) AS INV_QTY
   FROM 
      pur_factory_arrivaL_hdr IH
   JOIN 
      pur_factory_arrivaL_det IDT ON IH.po_ref = IDT.rmd_code
   WHERE 
      IH.MARKED IS NULL  
      AND IH.against_of = 'P'
      AND IDT.MARKED IS NULL 
      AND IH.company_code = ${req.user.company}  
      AND IH.unit_code = ${req.user.unit}
      AND IH.fin_year ='${req.user.finyear}'
  ) SI ON d.rmd_code = SI.rmd_code AND d.unique_code = SI.rmd_recno
WHERE  
  h.marked IS NULL 
  AND d.marked IS NULL
  AND h.unit_code = ${req.user.unit} 
  AND h.company_code = ${req.user.company} 
  AND h.fin_year = '${req.user.finyear}'
  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.deal_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
exports.getAllPendingGprByWeek = wrapper(async (req, res, next) => {
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
  h.rmd_code,timestamptostring(h.deal_date) deal_date,
  get_party(h.party_code) AS vendor,
  get_dealtype(h.deal_type_cd) AS deal_type,
  get_currency(h.currency_cd) AS currency,
  h.currency_rate1,
  get_po_type(h.po_type1) AS po_type,
  get_item(d.item_code) AS item,
  get_size(d.size_code) AS size_nm,
  get_quality(d.quality_code) AS grade,
  COALESCE(d.total_qty, 0) AS Order_Qty,
  (COALESCE(d.total_qty, 0) - COALESCE(SI.INV_QTY, 0)) AS pending_qty,
  get_uom(d.uom_code) AS uom,
  d.rate1,
  d.amount2
FROM 
  PUR_RMDEAL_HDR h
JOIN 
  PUR_RMDEAL_det d ON h.rmd_code = d.rmd_code
LEFT JOIN 
  (SELECT 
      IDT.rmd_code, 
      IDT.rmd_recno, 
      COALESCE(IDT.quantity, 0) AS INV_QTY
   FROM 
      pur_factory_arrivaL_hdr IH
   JOIN 
      pur_factory_arrivaL_det IDT ON IH.po_ref = IDT.rmd_code
   WHERE 
      IH.MARKED IS NULL  
      AND IH.against_of = 'P'
      AND IDT.MARKED IS NULL 
      AND IH.company_code = ${req.user.company}  
      AND IH.unit_code = ${req.user.unit}
      AND IH.fin_year ='${req.user.finyear}'
  ) SI ON d.rmd_code = SI.rmd_code AND d.unique_code = SI.rmd_recno
WHERE  
  h.marked IS NULL 
  AND d.marked IS NULL
  AND h.unit_code = ${req.user.unit} 
  AND h.company_code = ${req.user.company} 
  AND h.fin_year = '${req.user.finyear}'
AND h.deal_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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
//pending mrir register
exports.getAllPendingMrir = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  select h.rmd_code,timestamptostring(h.deal_date) deal_date,get_party(h.party_code)vendor,get_dealtype(h.deal_type_cd)deal_type,
get_currency(h.currency_cd)currency,currency_rate1,get_po_type(h.po_type1)po_type,get_item(d.item_code)item,
get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,d.total_qty,get_uom(d.uom_code)uom,d.rate1,
d.amount2
from PUR_RMDEAL_HDR h, PUR_RMDEAL_det d where  h.marked is null and d.marked is null
and h.rmd_code=d.rmd_code
and h.unit_code=1 and h.company_code=1 and h.fin_year='2425'
 AND COALESCE(h.rmd_code, 'A') 
  NOT IN (
        SELECT COALESCE(po_ref, 'A') 
        FROM pur_mrir_hdr 
        WHERE marked IS NULL 
          AND unit_code =${req.user.unit}
          AND company_code =${req.user.company}
      )
  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.deal_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
  select h.rmd_code,timestamptostring(h.deal_date) deal_date,get_party(h.party_code)vendor,get_dealtype(h.deal_type_cd)deal_type,
  get_currency(h.currency_cd)currency,currency_rate1,get_po_type(h.po_type1)po_type,get_item(d.item_code)item,
  get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,d.total_qty,get_uom(d.uom_code)uom,d.rate1,
  d.amount2
  from PUR_RMDEAL_HDR h, PUR_RMDEAL_det d where  h.marked is null and d.marked is null
  and h.rmd_code=d.rmd_code
  and h.unit_code=1 and h.company_code=1 and h.fin_year='2425'
   AND COALESCE(h.rmd_code, 'A') 
    NOT IN (
          SELECT COALESCE(po_ref, 'A') 
          FROM pur_mrir_hdr 
          WHERE marked IS NULL 
            AND unit_code =${req.user.unit}
            AND company_code =${req.user.company}
        )
AND h.deal_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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
  select timestamptostring(h.mrir_date) mrir_date,h.mrir_code,h.truck_no,get_party(h.party_code)vendor,get_currency(h.currency_cd)currency,currency_rate1 ,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
d.total_qty,d.rate1,d.amount2
from pur_mrir_hdr h ,pur_mrir_det d where h.marked is null and d.marked is null and h.mrir_code=d.mrir_code
and h.company_code=${req.user.company} and h.unit_code=${req.user.unit} and h.fin_year='${req.user.finyear}'
  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.deal_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
  select timestamptostring(h.mrir_date) mrir_date,h.mrir_code,h.truck_no,get_party(h.party_code)vendor,get_currency(h.currency_cd)currency,currency_rate1 ,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
d.total_qty,d.rate1,d.amount2
from pur_mrir_hdr h ,pur_mrir_det d where h.marked is null and d.marked is null and h.mrir_code=d.mrir_code
and h.company_code=${req.user.company} and h.unit_code=${req.user.unit} and h.fin_year='${req.user.finyear}'
AND h.deal_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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

const pdfmake = wrapper(async (req, res, str) => {
  const po_code = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", po_code);

  try {
    const client = req.dbConnection;
    // Fetch purchase order header
    const headerQuery = `
        select rmd_code po_code, deal_date po_date, get_dealtype(deal_type_cd) deal_type, 
        get_currency(currency_cd) currency, currency_rate1, get_party(party_code) party
        from PUR_RMDEAL_HDR 
        where marked is null and company_code=1 and unit_code=1 and rmd_code = $1
    `;
    const headerResult = await client.query(headerQuery, [po_code]);

    // Fetch purchase order details
    const detailQuery = `
    select get_item(item_code) item,hsn, get_size(size_code) size, get_quality(quality_code) grade, 
    total_qty, get_uom(uom_code) uom, rate1, amount2, remarks 
    from PUR_RMDEAL_DET 
    where marked is null and company_code=1 and unit_code=1 and rmd_code = $1
    `;
    const detailResult = await client.query(detailQuery, [po_code]);

    const address = await client.query(
      `select h.rmd_code po_code,h.deal_date po_date, get_dealtype(h.deal_type_cd)deal_type,
get_currency(h.currency_cd)currency, h.currency_rate1, get_party(h.party_code)party,(select add1 from pur_mst_party
where marked is null and party_code=h.party_code and h.company_code=1 and h.unit_code=1)address
from PUR_RMDEAL_HDR h where h.marked is null and h.company_code=1 and h.unit_code=1`
    );
    const add = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no,pan_no, ifsc_cd 
        FROM sl_mst_site where marked is null and company=1
        and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name,state FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );

    // Fetch purchase order charges
    const chargeQuery = `
        select get_charge(charge_code) charge_name, charge_type, rmd_code, charge_value, sum(taxvalue) tax_val
        from purchase_order_tax_charge_detail
        where marked is null and charge_code not in (1) and rmd_code = $1
        group by charge_code, charge_type, rmd_code, charge_value
    `;
    const chargeResult = await client.query(chargeQuery, [po_code]);

    // Combine the data
    const purchaseOrderData = {
      header: headerResult.rows[0],
      details: detailResult.rows,
      charges: chargeResult.rows,
      address: address.rows[0],
      company: company.rows[0],
      add: add.rows[0],
    };

    // Send the combined result
    res.json(purchaseOrderData);
  } catch (err) {
    console.error("Error fetching purchase order data", err);
    res.status(500).send("Server error");
  }
});

exports.downloadPDF = async (req, res, next) => {
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};
