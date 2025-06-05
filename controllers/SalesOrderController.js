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
  fs.readFileSync(`${__dirname}/../SalesOrder.json`, "utf8")
);

const generateOrderId = async (client) => {
  //const response = await client.query(`SELECT MAX(BOOKING_CODE) AS MAX FROM SL_TRANS_BOOKING_HDR`);

  //const response1 = await client.query(`SELECT MAX(TO_NUMBER(SUBSTR(BOOKING_CODE,8))) M FROM SL_TRANS_BOOKING_HDR`);
  // const response1=await client.query(`SELECT max(TO_NUMBER(BOOKING_CODE,'"x"99999'))M FROM SL_TRANS_BOOKING_HDR`);
  const response1 = await client.query(
    // `SELECT MAX((substr(BOOKING_CODE,8)))M FROM SL_TRANS_BOOKING_HDR`
    `SELECT MAX(CAST(substring(BOOKING_CODE from '[0-9]+$') AS INTEGER)) AS M FROM SL_TRANS_BOOKING_HDR`
  );
  // console.log("ggjhjkkjkj", response1);

  // const num='A12223-';
  // const num2=num.concat(response1);
  // return(num2);
  // const num = response.rows[0].MAX.slice(0,8);
  // const num2 = (response1.rows[0].M) + 1;
  // const numZeros=7-num2.toString().length;
  // const zeros = '0'.repeat(numZeros);
  // // console.log(`${num}${zeros}${num2}`);
  // return `${num}${zeros}${num2}`;
  if (response1.rows.m === null) {
    return `A12526-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `A12526-${num}`;
  }
  //  const numZeros = 8 - num.toString().length;
  //   const zeros = '0'.repeat(numZeros);
  //  // console.log(`A12223-${num}`);
  //   return `A12223-${num}`;
};


const generateInvoiceId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX((substr(invoice_no,8)))M FROM sl_trans_invoice_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `I12424-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `I12425-${num}`;
  }
};


exports.getAllOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
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
  const order = await client.query(
    `select booking_code order_code ,timestamptostring (booking_date::timestamp)order_date, get_external_entity(dealer_name) dealer, get_distributor(distributor_code) customer, order_type, 
    get_del_site(del_site_code) address,   
     remarks from sl_trans_booking_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  );

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});



exports.getAllSaudaofCustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // const order = await client.query(
  //   `select booking_code order_code, get_distributor(distributor_code) customer ,timestamptostring (booking_date::timestamp)order_date, get_external_entity(dealer_name) dealer, order_type,
  //   get_del_site(del_site_code) address,
  //    remarks from sl_trans_booking_hdr where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}`
  // );
  const { dealercode, customer_code, saudaCode } = req.query;
  const Requisition = await client.query(`
  select Get_Dealer_Name(s.DEALER_CODE) AS DEALER_DESC,
    Get_Distributor(s.CUST_CODE) AS DISTRIBUTOR_DESC,
    Get_Item(s.ITEM_CODE) AS ITEM_DESC,
    Get_Quality(s.SAUDA_QUALITY) AS QUALITY_DESC,
    s.SAUDA_REMARK,
    s.SAUDA_CODE,
    s.SAUDA_QTY,
    (coalesce(S.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))pending_qty,
    s.SAUDA_RATE,
    get_uom(s.uom_code) as UOM,
    (select hsn from sl_mst_item where item_code=s.ITEM_CODE) hsn,
    s.ITEM_CODE,
    s.SAUDA_QUALITY,
    s.DEALER_CODE,
    s.unique_code,
    s.UNIT_CODE,
    s.uom_code,
    s.CUST_CODE

FROM
    SL_TRANS_SAUDA_HDR s
     LEFT JOIN
    (SELECT
        BD.SAUDA_CODE,
        BH.UNIT_CODE,
        SUM(coalesce(BD.QTY,0)) AS SO_IN_QTY
     FROM
        SL_TRANS_BOOKING_HDR BH
     JOIN
        SL_TRANS_BOOKING_size_DETail BD ON BH.BOOKING_CODE = BD.BOOKING_CODE 
     WHERE
        BH.MARKED IS NULL
        AND BD.MARKED IS NULL
     GROUP BY
        BD.SAUDA_CODE, BH.UNIT_CODE
    ) SO ON s.SAUDA_CODE = SO.SAUDA_CODE
WHERE
    MARKED IS null and (coalesce(S.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))>0
    and s.company_code= ${req.user.company} and s.fin_year='${req.user.finyear}' and s.unit_code=${req.user.unit}
 
    and s.sauda_code <> '${saudaCode}'
   AND (DEALER_CODE = ${dealercode} )
   AND (CUST_CODE = ${customer_code} )
   `);

  // const itemCode = Requisition.rows[0].item_code;
  // // console.log(Requisition);
  // const size = await client.query(
  //   `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code =${itemCode}`
  // );

  res.status(200).json({
    status: "success",
    data: {
      Requisition,
      // size,
    },
  });
});



// exports.userValue = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//   console.log("3422222222222222fddddddddddddddddddd");
//   // var year = req.user;
//  var user=req.user
//  console.log(user, "ye user h")
//   // var comany_code = req.user[0].company_code;
//   var site = req.user.unit;
//   // console.log(site[0].unit_code, "ye site h", site.unit)

//   // var permission = req.user.PERMISSIONS;
//   const planResult = await client.query(`SELECT plan_id FROM SL_SEC_SPEC_ITEM_HDR WHERE spec_code = '${req.user[0].spec_code}'`);

//   let planId = null;
//         if (planResult.rows.length > 0) {
//                 planId = planResult.rows[0].plan_id;
//         }
      
//         // 👉 Now fetch module based on planId
//         let module = { rows: [] }; // default empty
//         if (planId) {
//           module = await client.query(`
//             SELECT module_id, get_module(module_id) AS module_name 
//             FROM PLAN_MODULES 
//             WHERE plan_id = ${planId}
//           `);
//         }
//   //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

//   var permission = req.user.PERMISSIONS;
//   console.log(permission)
//   //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

//   const unit= await client.query(`select site_code, site_desc from sl_mst_site where marked is null and company=${req.user.company}`)
//   const year= await client.query(`select year_nm , year_desc from fin_mst_year_mst  where marked is null and company_code=${req.user.company}`)
  
//   const OpenningValue = await client.query(
//     `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
//   );


//   // console.log("Permissions",permission);
//   res.status(200).json({
//     status: "success",
//     data: {
//       site,
//       OpenningValue,
//       user,
//       module,
//       unit,
//       year,
//       permission
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
  // console.log(permission)
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



exports.getOrderData = wrapper(async (req, res, next) => {
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
    //  how call timestamptostring function when arr[i].fieldsRequired==='booking_date'

    // console.log(arr, "vandna");

    let query = `SELECT ${arr[i].fieldsRequired} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    query += ` WHERE ${arr[i].uniqueOrderIdentifier}='${req.params.code}' and marked is null`;
    // console.log(query, "manoj");
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
      const obj = arr[i].lovFields;

      for (const key in obj) {
        let query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE marked IS NULL`;

        if (key !== "FREIGHT_TYPE_CODE") {
          query += ` AND company_code = ${req.user.company}`;
        }

        query += ` ORDER BY 2`;

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




exports.OrderPurchaseTaxCalByHsn = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body, "postman");
  const obj = req.body;
  // console.log(obj);
  // const hsn=obj.invoiceSize[0].hsn
  const date = obj.salesInvoice[0].invoice_date;
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
  // console.log(obj.invoiceSize.length);
  // // console.log(obj.invoiceSize.length);
  // console.log(obj.invoiceSize.length);
  // console.log(obj.invoiceSize.length);u
  // console.log(obj.invoiceSize.length);
  // console.log(obj.invoiceSize.length);

  if (obj.salesInvoice[0].booking_no == null) {
    for (let i = 0; i < obj.invoiceSize.length; i++) {
      const hsnTax = await client.query(
        `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
        D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
        FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
       WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize[i].hsn}' and '${date1}' between  H.f_date  and H.t_date       
       ;`
      );

      ob.push(hsnTax.rows);
      for (let j = i; j <= i; j++) {
        tax = [];
        // console.log("j", j);
        var amount = obj.invoiceSize[i].itemqtyamount;
        var qty = obj.invoiceSize[i].qty;
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
                Math.round(((amount * ob[j][k].charge_value) / 100) * 100) /
                100;
            } else {
              Tax = Math.round(ob[j][k].charge_value * 100) / 100;
            }
          } else if (ob[j][k].charge_type_on === "o") {
            tax = Math.round(qty * ob[j][k].charge_value * 100) / 100;
          }

          amount = Math.round((amount + Tax) * 100) / 100;
          tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
          newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

          // console.log("basic", ob);
        }
      }

      ob1.push(hsnTax.rows);
      feild1.push(hsnTax.fields);
    }
  } else {
    var tax = [];
    if (obj.invoiceSize !== null) {
      for (let i = 0; i < obj.invoiceSize3.length; i++) {
        // console.log(obj.invoiceSize3[i].hsn);
        const hsnTax = await client.query(
          `SELECT get_charge(D.charge_code) charge_desc, D.charge_code, D.charge_cat,D.charge_value ,D.charge_type,D.ref_charge,D.CHARGE_TYPE_ON,D.ref_on,D.use_for,
          D.deal_type,D.INCLUDE_COST,get_charge(D.ref_charge)ref_chrg
          FROM  SL_MST_ITEM_TAX_DET D,SL_MST_ITEM_TAX_HDR H 
         WHERE D.MARKED IS NULL AND H.MARKED IS NULL AND H.TAX_CODE=D.TAX_CODE AND H.HSN='${obj.invoiceSize3[i].hsn}' and '${date1}' between  H.f_date  and H.t_date       
         ;`
        );

        ob.push(hsnTax.rows);
        for (let j = i; j <= i; j++) {
          tax = [];
          // console.log("j", j);
          var amount = obj.invoiceSize3[i].Price;
          // console.log("amount", amount);
          var qty = obj.invoiceSize3[i].qty;
          // console.log("qty", qty);
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
                  Math.round(((amount * ob[j][k].charge_value) / 100) * 100) /
                  100;
              } else {
                Tax = Math.round(ob[j][k].charge_value * 100) / 100;
              }
            } else if (ob[j][k].charge_type_on === "o") {
              Tax = Math.round(qty * ob[j][k].charge_value * 100) / 100;
            }

            amount = Math.round((amount + Tax) * 100) / 100;
            tax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });
            newTax.push({ ...ob[j][k], TaxValue: Tax, RunningTotal: amount });

            // console.log("basic", ob);
          }
        }

        ob1.push(hsnTax.rows);
        feild1.push(hsnTax.fields);
      }
    }
  }

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



exports.createOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;
  // console.log(req.body);
  const body = req.body;
  const orderCode = await generateOrderId(client);
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
        const query = `INSERT INTO ${arr[i].tableName} (BOOKING_CODE, ${fields} , company_code, user_code, unit_code, fin_year) VALUES ('${orderCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
        console.log(query);
        await client.query(query);
      }

      // else {
      //   const arr1 = req.body[arr[i].responseFieldName];
      //   for (let j = 0; j < arr1.length; j++) {
      //     const obj = arr1[j];
      //     let fields = ``;
      //     let values = ``;
      //     Object.keys(arr[i].fieldsRequired).forEach((field) => {
      //       if (obj[field]) {
      //         fields += `${field}, `;
      //         if (arr[i].fieldsRequired[field] === "date")
      //           values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
      //         else if (arr[i].fieldsRequired[field] === "number")
      //           values += `${obj[field]}, `;
      //         else values += `'${obj[field]}', `;
      //       }
      //     });
      //     fields = fields.slice(0, -2);
      //     values = values.slice(0, -2);
      //     const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueOrderIdentifier}, ${fields}) VALUES ('${orderCode}', ${values})`;
      //     // console.log(query);
      //     await client.query(query);
      //   }
      // }
      else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let query = "";

          // Check the m_type condition
          if (body.salesOrder[0].type === "wr") {
            // Specific SQL INSERT for 'wr' type
            query = `
              INSERT INTO sl_trans_booking_size_detail (
                 booking_code, item_code, size_code, quality_code, 
                 uom_code, discount_on, dis_type, rate, rate1, total_qty, qty,
                 sauda_code, discount, amount, amount2, hsn, company_code, user_code, unit_code, fin_year
              ) VALUES (
                '${orderCode}', 
                
                ${body.bookingSize[j].item_code || "NULL"}, 
                ${body.bookingSize[j].size_code || "NULL"}, 
                ${body.bookingSize[j].sauda_quality || "NULL"}, 
                ${body.bookingSize[j].uom_code || "NULL"}, 
                '${body.bookingSize[j].disOn || "NULL"}', 
                '${body.bookingSize[j].distype || "NULL"}', 
                ${body.bookingSize[j].sauda_rate || "NULL"}, 
                ${
                  body.bookingSize[j].finalRate ||
                  body.bookingSize[j].sauda_rate
                }, 
                ${body.bookingSize[j].sauda_qty || "NULL"}, 
                ${body.bookingSize[j].order_qty || "NULL"}, 
                '${body.bookingSize[j].sauda_code || "NULL"}', 
                ${body.bookingSize[j].discount || "NULL"}, 
                ${
                  body.bookingSize[j].amount ||
                  body.bookingSize[j].sauda_rate * body.bookingSize[j].sauda_qty
                }, 
                ${
                  body.bookingSize[j].netAmount ||
                  body.bookingSize[j].sauda_rate * body.bookingSize[j].sauda_qty
                }, 
                '${body.bookingSize[j].hsn || "NULL"}', 
                '${req.user.company}', 
                '${req.user[0].spec_code}', 
                '${req.user.unit}', 
                '${req.user.finyear}'
              )
            `;
          } else {
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

            query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueOrderIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${orderCode}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
          }

          // Log and execute the query
          console.log(query);
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Order Created Successfully",
  });
});



exports.updateOrder = wrapper(async (req, res, next) => {
  // console.log("manoj  mmake othher constoeller");
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",

      message: "Please specify the Order Code",
    });
  }
  const client = req.dbConnection;

  const arr = jsonData.createNupdate.fieldNames;
  // // console.log(arr);
  // // console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];

        // console.log(obj);
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
        // console.log("ddfdfdfdfddfddfddfd");
        // console.log("ddfdfdfdfddfddfddfd");
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueOrderIdentifier}='${req.params.code}'`;
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
            const query = `DELETE FROM ${arr[i].tableName} WHERE ${
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
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueOrderIdentifier}, ${fields}, company_code, user_code, unit_code, fin_year) VALUES ('${req.params.code}', ${values}, '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
            // console.log(query);
            await client.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: "success",
    message: "Order Updated Successfully",
  });
});



exports.deleteOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Order Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  const tableArray = [
    "sl_trans_inv_size_detail"
  ]; // List of tables to check
  const result = await Promise.all(
    tableArray.map(async (table) => {
      return await client.query(
        `select ref_TABLE_C('${table}','booking_no','${req.params.code}')`
      );
    })
  );
// SELECT ref_table('${table}', 'item_code', '${req.params.code}')
  // Check if any table returned false (indicating the item is already used)
  const isAnyTableUsed = result.some((res) => !res.rows[0].ref_TABLE_C);

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "Order is Already Tagged",
      isUsed: true,
    });
  } else{
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `Update ${arr[i].tableName} SET MARKED='D' WHERE ${arr[i].uniqueOrderIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Order Deleted Successfully",
  });
}
});



const fonts = {
  Roboto: {
    normal: `${__dirname}/../fonts/Roboto-Regular.ttf`,
    bold: `${__dirname}/../fonts/Roboto-Medium.ttf`,
    italics: `${__dirname}/../fonts/Roboto-Italic.ttf`,
    bolditalics: `${__dirname}/../fonts/Roboto-MediumItalic.ttf`,
  },
};



const pdfmake = wrapper(async (req, res, str) => {
  try {
    const client = req.dbConnection;
    const { code } = req.params;
    const headerQuery = `
  SELECT
    H.BOOKING_DATE,
    H.BOOKING_CODE,
    H.DISTRIBUTOR_code,
    Get_Distributor(H.DISTRIBUTOR_code) AS CUSTOMER,
    H.DEALER_NAME,
    Get_External_Entity(H.DEALER_NAME) AS DEALER,
    H.CUSTOMER_PO_DATE,
    H.CUSTOMER_PO_NO,
    get_del_site(H.DEL_SITE_CODE) AS delivery_site,
    (SELECT s_tax_no FROM sl_mst_distributor WHERE marked IS NULL AND distributor_code = H.DISTRIBUTOR_code AND h.company_code = 1 AND h.unit_code = 1) AS gst_number
  FROM
    sl_trans_booking_hdr H
  WHERE
    H.MARKED IS NULL
    AND H.BOOKING_CODE = $1
    AND h.company_code = 1
    AND h.unit_code = 1
  `;

    // Query for order details (items)
    const detailQuery = `
    SELECT 
      D.ITEM_CODE, 
      Get_Item(D.ITEM_CODE) AS ITEM, 
      D.SIZE_CODE,
      Get_Size(D.SIZE_CODE) AS SZ, 
      D.QUALITY_code,
      Get_Quality(D.QUALITY_code) AS GRADE, 
      D.total_QTY, 
      D.UOM_code, 
      get_uom(D.UOM_code) AS uom_desc, 
      D.rate1, 
      D.NO_PCS,
      amount2
    FROM 
      sl_trans_booking_size_detail D 
    WHERE 
      D.BOOKING_CODE = $1
      AND D.MARKED IS NULL
      AND D.company_code = 1 
      AND D.unit_code = 1
  `;

    const itemlogo = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
    FROM sl_mst_site where marked is null and company=1
    and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );
    // Execute header query
    const headerResult = await client.query(headerQuery, [code]);

    // Execute item details query
    const detailResult = await client.query(detailQuery, [code]);

    // Check if the sale order was found
    if (headerResult.rows.length === 0) {
      return res.status(404).json({ message: "Sale order not found" });
    }

    // Combine header and item details
    const response = {
      saleOrderHeader: headerResult.rows[0],
      saleOrderItems: detailResult.rows,
      itemlogo: itemlogo.rows[0],
      company: company.rows[0],
    };

    // Send the combined result
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching sale order:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});



exports.downloadPDF = async (req, res, next) => {
  // console.log("1" + req.params.code);
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};



exports.getOrderForInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const order1 = await client.query(
    `SELECT booking_code, distributor_code, booking_date, dealer_name, order_type, invoice_type_code, payment_days, del_site_code, freight_type_code,  broker_code, payment_code, tolerance, payment_amt, remarks FROM sl_trans_booking_hdr WHERE booking_code='${req.params.code}'`
  );
  const order2 = await client.query(
    // `SELECT  booking_code, item_code ,get_item(item_code) item_nm, size_code, get_size(size_code) size_nm, quality, get_quality(quality), no_pcs, uom, discount_on, dis_type, qty, book_rate_guage, discount_amount, tot_item_amt, net_rate, net_size_rate,unique_id FROM sl_trans_booking_size_detail WHERE booking_code='${req.params.code}'`
    `SELECT  d.booking_code Booking_No ,get_item(d.item_code) Item, d.item_code, get_uom(d.uom) Uom_nm, d.uom, get_size(d.size_code) Size, d.size_code, 
    get_quality(d.quality) Grade,d.quality, d.no_pcs Pcs,  d.qty Qty, d.bk_rate Rate, d.discount_amount Discount_Value, d.discount_on, d.dis_type, 
    d.booking_rate Rate_After_Discount,  d.tot_item_amt Amount,d.unique_id,(SELECT HSN FROM SL_MST_ITEM WHERE MARKED IS NULL AND ITEM_CODE=d.ITEM_CODE)HSN
    FROM sl_trans_booking_size_detail d WHERE d.booking_code ='${req.params.code}'`
  );
  res.status(200).json({
    status: "success",
    data: {
      order1,
      order2,
    },
  });
});

// exports.getOrderForInvoice = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;
//   const order1 = await client.query(
//     `SELECT booking_code, distributor_code, booking_date, dealer_name, order_type, invoice_type_code, payment_days, del_site_code, freight_type_code,  broker_code, payment_code, tolerance, payment_amt, remarks FROM sl_trans_booking_hdr WHERE booking_code='${req.params.code}'`
//   );
//   const order2 = await client.query(
//     // `SELECT  booking_code, item_code ,get_item(item_code) item_nm, size_code, get_size(size_code) size_nm, quality, get_quality(quality), no_pcs, uom, discount_on, dis_type, qty, book_rate_guage, discount_amount, tot_item_amt, net_rate, net_size_rate,unique_id FROM sl_trans_booking_size_detail WHERE booking_code='${req.params.code}'`
//     `SELECT  d.booking_code Booking_No ,get_item(d.item_code) Item, d.item_code, get_uom(d.uom) Uom_nm, d.uom, get_size(d.size_code) Size, d.size_code,
//     get_quality(d.quality) Grade,d.quality, d.no_pcs Pcs,  d.qty Qty, d.bk_rate Rate, d.discount_amount Discount_Value, d.discount_on, d.dis_type,
//     d.booking_rate Rate_After_Discount,  d.tot_item_amt Amount,d.unique_id,(SELECT HSN FROM SL_MST_ITEM WHERE MARKED IS NULL AND ITEM_CODE=d.ITEM_CODE)HSN
//     FROM sl_trans_booking_size_detail d WHERE d.booking_code ='${req.params.code}'`
//   );
//   // Create an empty object to hold data
//   const data = {};
//   const order3 =
//     await client.query(`SELECT  d.booking_code  ,d.item_code,  d.uom, d.size_code,
//   d.quality, d.no_pcs ,  d.qty , d.bk_rate , d.discount_amount , d.discount_on, d.dis_type,
//   d.booking_rate ,  d.tot_item_amt ,d.unique_id,(SELECT HSN FROM SL_MST_ITEM WHERE MARKED IS NULL AND ITEM_CODE=d.ITEM_CODE)HSN
//   FROM sl_trans_booking_size_detail d WHERE d.booking_code ='${req.params.code}'`);

//   data["invoiceSizeWithOrder"] = order3.rows;
//   res.status(200).json({
//     status: "success",

//     order1,
//     order2,
//     data,
//   });
// });

exports.getCustomerOrderForInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const order1 = await client.query(
    `SELECT booking_code, distributor_code, booking_date, dealer_name, order_type, invoice_type_code, payment_days, del_site_code, freight_type_code,  broker_code, payment_code, tolerance, payment_amt, remarks FROM sl_trans_booking_hdr WHERE booking_code='${req.params.code}'`
  );
  const order2 = await client.query(
    `SELECT  booking_code, item_code ,get_item(item_code) item_nm, size_code, get_size(size_code) size_nm, quality, get_quality(quality), no_pcs, uom, discount_on, dis_type, qty, book_rate_guage, discount_amount, tot_item_amt, net_rate, net_size_rate,unique_id FROM sl_trans_booking_size_detail WHERE booking_code='${req.params.code}'`
  );
  res.status(200).json({
    status: "success",
    data: {
      order1,
      order2,
    },
  });
});

exports.getCustomerOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // Create an empty object to hold data
  const data = {};
  const order2 = await client.query(
    `SELECT  booking_code, item_code ,get_item(item_code) item_nm, size_code, get_size(size_code) size_nm, quality, get_quality(quality), no_pcs, uom, discount_on, dis_type, qty, book_rate_guage, discount_amount, tot_item_amt, net_rate, net_size_rate,unique_id, bk_rate, booking_rate FROM sl_trans_booking_size_detail  WHERE unique_id='${req.params.code}'`
  );
  data["invoiceSizeWithOrder"] = order2.rows;
  res.status(200).json({
    status: "success",
    data: {
      data,
    },
  });
});

exports.getCustumerOrderForInvoice = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const code = req.params.code;
  const c = req.query.c;
  // console.log(code);
  // console.log(code);
  // console.log(code);
  // console.log(code);
  const order1 = await client.query(
    `SELECT H.BOOKING_CODE,REF_BOOKING_NO,H.BOOKING_DATE,H.DISTRIBUTOR_code,GET_DISTRIBUTOR(H.DISTRIBUTOR_code)CUST_NAME,H.DEALER_NAME,
    GET_EXTERNAL_ENTITY(H.DEALER_NAME)DEALER_NM,D.ITEM_CODE,GET_ITEM(D.ITEM_CODE)TEM_NM,D.SIZE_CODE,GET_SIZE(D.SIZE_CODE)SZ,D.QUALITY,GET_QUALITY(D.QUALITY)QUAL,
    D.QTY,D.NO_PCS,D.UOM,GET_UOM(D.UOM)UOM_NM,D.UNIQUE_ID,D.BOOKING_RATE,
    (SELECT HSN FROM SL_MST_ITEM WHERE MARKED IS NULL AND ITEM_CODE=D.ITEM_CODE)HSN,
    (coalesce(D.QTY,0)-coalesce(aa.TOT_QTY,0))PEN_QTY,(coalesce(D.NO_PCS,0)-coalesce(v.TOT_PCS,0))PEN_PCS
    FROM  sl_trans_booking_hdr h
    LEFT OUTER JOIN sl_trans_booking_size_detail d ON (H.BOOKING_CODE = D.BOOKING_CODE)
    LEFT OUTER JOIN (SELECT DE.Booking_no,DE.UNIQ_CODE,SUM(DE.QTY)TOT_QTY,SUM(DE.NO_PCS)TOT_PCS
    FROM SL_TRANS_INV_SIZE_DETAIL DE WHERE DE.MARKED IS NULL GROUP BY  DE.Booking_no,DE.UNIQ_CODE) aa ON (aa.BOOKING_NO=H.BOOKING_CODE )
    LEFT OUTER JOIN  (SELECT DE.Booking_no,DE.UNIQ_CODE,SUM(DE.QTY)TOT_QTY,SUM(DE.NO_PCS)TOT_PCS
    FROM SL_TRANS_INV_SIZE_DETAIL DE WHERE DE.MARKED IS NULL GROUP BY  DE.Booking_no,DE.UNIQ_CODE)v ON (v.UNIQ_CODE=D.UNIQUE_ID)
    WHERE H.MARKED IS NULL AND D.MARKED IS NULL and H.DISTRIBUTOR_code= '${req.params.code}'  and h.booking_code<>'${req.query.c}'`
  );

  res.status(200).json({
    status: "success",
    data: {
      order1,
    },
  });
});

exports.createInvoiceFromOrder = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  //const arr = jsonData.createNupdate.fieldNames;
  const invoiceCode = await generateInvoiceId(client);
  // console.log (req.body)
  const obj = req.body;
  // console.log("fgfgfgfg", obj.salesOrder[0].booking_code);
  const query = `INSERT INTO sl_trans_invoice_hdr (INVOICE_NO, DISTRIBUTOR_CODE, DEALER_CODE, ORDER_TYPE, DEL_ADD, BOOKING_NO, BOOKING_DATE) VALUES ('${invoiceCode}', ${obj.salesOrder[0].distributor_code}, ${obj.salesOrder[0].dealer_name}, ${obj.salesOrder[0].order_type}, ${obj.salesOrder[0].del_site_code}, '${obj.salesOrder[0].booking_code}', '${obj.salesOrder[0].booking_date}')`;
  // console.log(query);
  await client.query(query);

  for (let i = 0; i < obj.bookingSize.length; i++) {
    const query = `INSERT INTO sl_trans_inv_size_detail (INVOICE_NO, ITEM_CODE, SIZE_CODE, QUALITY, QTY, BOOKING_NO, UOM_FOR_ITEMS, NET_RATE, NET_DISCOUNT, AMOUNT) VALUES ('${invoiceCode}', ${obj.bookingSize[i].item_code}, ${obj.bookingSize[i].size_code}, ${obj.bookingSize[i].quality}, ${obj.bookingSize[i].qty}, '${obj.bookingSize[i].booking_code}', ${obj.bookingSize[i].uom}, ${obj.bookingSize[i].net_rate},${obj.bookingSize[i].discount_amount},${obj.bookingSize[i].net_size_rate})`;
    // console.log(query);
    await client.query(query);
  }

  // }
  // if (req.body[arr[i].responseFieldName]) {
  //   if (!arr[i].typeArray) {
  //     const obj = req.body[arr[i].responseFieldName][0];
  //     let fields = ``;
  //     let values = ``;
  //     Object.keys(arr[i].fieldsRequired).forEach((field) => {
  //       if (obj[field]) {
  //         fields += `${field}, `;
  //         if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
  //         else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
  //         else values += `'${obj[field]}', `;

  //       }
  //     });
  //     fields = fields.slice(0, -2);
  //     values = values.slice(0, -2);
  //     const query = `INSERT INTO ${arr[i].tableName} (BOOKING_CODE, ${fields}) VALUES ('${orderCode}', ${values})`;
  //     // console.log(query);
  //     await client.query(query);
  //   } else {
  //     const arr1 = req.body[arr[i].responseFieldName];
  //     for (let j = 0; j < arr1.length; j++) {
  //       const obj = arr1[j];
  //       let fields = ``;
  //       let values = ``;
  //       Object.keys(arr[i].fieldsRequired).forEach((field) => {
  //         if (obj[field]) {
  //           fields += `${field}, `;
  //           if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
  //           else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
  //           else values += `'${obj[field]}', `;
  //         }
  //       });
  //       fields = fields.slice(0, -2);
  //       values = values.slice(0, -2);
  //       const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueOrderIdentifier}, ${fields}) VALUES ('${orderCode}', ${values})`;
  //       // console.log(query);
  //       await client.query(query);
  //     }
  //   }
  // }
  // }

  res.status(200).json({
    status: "success",
    message: "Order Created Successfully",
  });
});

exports.getAllOrderRegisterByWeek = wrapper(async (req, res, next) => {
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
  var query = `select booking_code order_code, so_date, customer_name,delaer_name dealer_name, delivery_add,freight_type,tolerance,item_name,size_name,grade_name,order_rate,order_qty 
  from V_SALE_ORDER  where so_date between  '${startDateInISO}' AND '${endDateInISO}' and  company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
  `;
  const order = await client.query(query);
  // console.log(order.rows);
  for (var i = 0; i < order.rows.length; i++) {
    dat1.push({
      order_code: order.rows[i].order_code,
      so_date: date_to_postgres(order.rows[i].so_date),
      customer_name: order.rows[i].customer_name,
      dealer_name: order.rows[i].dealer_name,
      delivery_add: order.rows[i].delivery_add,
      freight_type: order.rows[i].freight_type,
      tolerance: order.rows[i].tolerance,
      item_name: order.rows[i].item_name,
      size_name: order.rows[i].size_name,
      grade_name: order.rows[i].grade_name,
      order_rate: order.rows[i].order_rate,
      order_qty: order.rows[i].order_qty,
    });
  }
  // console.log(dat1);
  res.status(200).json({
    status: "success",
    data: {
      order,
      dat1,
    },
  });
});

exports.getAllPendingSalesByWeek = wrapper(async (req, res, next) => {
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
  var query = `select booking_code order_code, so_date, customer_name, delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,
  grade_name,order_rate,order_qty,invoice_qty,balance_qty 
  from V_SALE_ORDER where so_date between  '${startDateInISO}' AND '${endDateInISO}'
  `;
  const order = await client.query(query);
  // console.log(order.rows);
  for (var i = 0; i < order.rows.length; i++) {
    dat1.push({
      order_code: order.rows[i].order_code,
      so_date: date_to_postgres(order.rows[i].so_date),
      customer_name: order.rows[i].customer_name,
      dealer_name: order.rows[i].dealer_name,
      delivery_add: order.rows[i].delivery_add,
      freight_type: order.rows[i].freight_type,
      tolerance: order.rows[i].tolerance,
      item_name: order.rows[i].item_name,
      size_name: order.rows[i].size_name,
      grade_name: order.rows[i].grade_name,
      order_rate: order.rows[i].order_rate,
      order_qty: order.rows[i].order_qty,
      invoice_qty: order.rows[i].invoice_qty,
      balance_qty: order.rows[i].balance_qty,
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

exports.getAllOrderRegister = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
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
  var query = `select booking_code order_code,so_date order_date,customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,grade_name,order_rate,order_qty 
  from V_SALE_ORDER where  company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
  `;
  if (req.query.to) {
    `select booking_code order_code, so_date order_date, customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,grade_name,order_rate,order_qty 
  from V_SALE_ORDER where so_date between  '${req.query.from}' AND '${req.query.to} and   company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}'
  `;
  } else {
    query = `select booking_code order_code,so_date order_date, customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,grade_name,order_rate,order_qty 
    from V_SALE_ORDER where  company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
    `;
  }
  const order = await client.query(query);

  for (var i = 0; i < order.rows.length; i++) {
    dat1.push({
      order_code: order.rows[i].order_code,
      order_date: date_to_postgres(order.rows[i].order_date),
      customer_name: order.rows[i].customer_name,
      dealer_name: order.rows[i].dealer_name,
      delivery_add: order.rows[i].delivery_add,
      freight_type: order.rows[i].freight_type,
      tolerance: order.rows[i].tolerance,
      item_name: order.rows[i].item_name,
      size_name: order.rows[i].size_name,
      grade_name: order.rows[i].grade_name,
      order_rate: order.rows[i].order_rate,
      order_qty: order.rows[i].order_qty,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
      dat1,
    },
  });
});

exports.getPendingOrders = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
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

  var query = `select booking_code order_code,so_date order_date,customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,
  grade_name,order_rate,order_qty,invoice_qty,balance_qty 
  from V_SALE_ORDER where  company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
  `;

  if (req.query.to) {
    query = `select booking_code order_code,so_date order_date,customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,
    grade_name,order_rate,order_qty,invoice_qty,balance_qty 
    from V_SALE_ORDER where so_date between  '${req.query.from}' AND '${req.query.to}' and   company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
    `;
  } else {
    query = `select booking_code order_code , so_date order_date,customer_name,delaer_name dealer_name,delivery_add,freight_type,tolerance,item_name,size_name,
    grade_name,order_rate,order_qty,invoice_qty,balance_qty 
    from V_SALE_ORDER where  company_code= ${req.user.company} and fin_year='${req.user.finyear}' and unit_code=${req.user.unit}
    `;
  }
  const order = await client.query(query);

  for (let i = 0; i < order.rows.length; i++) {
    dat1.push({
      order_code: order.rows[i].order_code,
      order_date: date_to_postgres(order.rows[i].order_date),
      customer_name: order.rows[i].customer_name,
      dealer_name: order.rows[i].dealer_name,
      delivery_add: order.rows[i].delivery_add,
      freight_type: order.rows[i].freight_type,
      tolerance: order.rows[i].tolerance,
      item_name: order.rows[i].item_name,
      size_name: order.rows[i].size_name,
      grade_name: order.rows[i].grade_name,
      order_rate: order.rows[i].order_rate,
      order_qty: order.rows[i].order_qty,
      invoice_qty: order.rows[i].invoice_qty,
      balance_qty: order.rows[i].balance_qty,
    });
  }
  res.status(200).json({
    status: "success",
    data: {
      order,
      dat1,
    },
  });
});

exports.AllLedger = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const ledger = await client.query(
    `
    SELECT
    distributor_code,
    distributor_name,
    ACC_CODE,
    AMT,
    (CASE
        WHEN COALESCE(amt, 0) < 0 THEN 'Dr'
        WHEN COALESCE(amt, 0) >= 0 THEN 'Cr'
    END) AS TYPE
FROM
(
    SELECT
        d.distributor_code,
        d.distributor_name,
        d.account_code ACC_CODE,
        (
            SELECT
                (COALESCE(SUM(round(D_TOT_AMT)), 0) - COALESCE(SUM(round(C_TOT_AMT)), 0)) AS amount
            FROM
                (
                    SELECT
                        CASE l.entry_type WHEN 'Credit' THEN l.amount * -1 ELSE l.amount END AS C_TOT_AMT,
                        CASE l.entry_type WHEN 'Debit' THEN l.amount * -1 ELSE l.amount END AS D_TOT_AMT
                    FROM
                        FIN_MST_T_VOUCHER_HDR f,
                        FIN_MST_T_VOUCHER_DET l
                    WHERE
                        f.marked IS NULL
                        AND l.marked IS NULL
                        AND f.voucher_code = l.voucher_code
                        AND f.voucher_date <= CURRENT_DATE
                        AND (l.account_code = d.account_code)
                        AND (f.voucher_date + COALESCE(l.no_days, 0) * INTERVAL '1 day') <= CURRENT_DATE -- Explicit cast to date
                ) AS p
        ) AS amt 
    FROM
        sl_mst_distributor d
    WHERE
        d.marked IS NULL
) AS t;
`
  );

  res.status(200).json({
    status: "success",
    data: {
      ledger,
    },
  });
});

exports.getHsnForItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // // console.log(
  //   req.body,
  //   "44444444444444444444444444444444444449999999999999999999999999"
  // );
  // // console.log(
  //   req.body,
  //   "44444444444444444444444444444444444449999999999999999999999999"
  // );
  const hsn1 = await client.query(
    `SELECT hsn, get_uom(item_uom) uom_nm FROM sl_mst_item WHERE  item_code=${req.params.code} and marked is null and company_code =${req.user.company}`
  );

  const size = await client.query(
    `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code=${req.params.code} and marked is null and company_code =${req.user.company}`
  );

  const grade = await client.query(
    `select quality_code, get_quality(quality_code) from  sl_mst_item_qual_det where item_code=${req.params.code}  and marked is null and company_code =${req.user.company}`
  );
  const uom = await client.query(
    `select item_uom, get_uom(item_uom) from  sl_mst_item where item_code=${req.params.code}  and marked is null and company_code =${req.user.company}`
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

exports.getAllGatePass = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const Requisition = await client.query(
    `SELECT
    H.SAUDA_CODE AS CONTRACT_CODE,
    Get_Dealer_Name(H.DEALER_CODE) AS DEALER_DESC,    
    Get_Distributor(H.CUST_CODE) AS DISTRIBUTOR_DESC,
    (coalesce(H.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))pending_qty,
    H.DEALER_CODE,
    H.CUST_CODE
FROM
    SL_TRANS_SAUDA_HDR H
LEFT JOIN
    (SELECT
        BD.SAUDA_CODE,
        BH.UNIT_CODE,
        SUM(coalesce(BD.QTY,0)) AS SO_IN_QTY
     FROM
        SL_TRANS_BOOKING_HDR BH
     JOIN
        SL_TRANS_BOOKING_size_DETail BD ON BH.BOOKING_CODE = BD.BOOKING_CODE and BH.sauda_code=BD.sauda_code
     WHERE
        BH.MARKED IS null
        AND BD.MARKED IS NULL
     GROUP BY
        BD.SAUDA_CODE, BH.UNIT_CODE
    ) SO ON H.SAUDA_CODE = SO.SAUDA_CODE
WHERE
    H.MARKED IS null
   and (coalesce(H.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))>0
 and h.company_code= ${req.user.company} and h.fin_year='${req.user.finyear}'  and h.unit_code =${req.user.unit}`
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

  const { sauda_code } = req.query;
  // console.log(sauda_code);

  const Requisition = await client.query(
    ` select Get_Dealer_Name(s.DEALER_CODE) AS DEALER_DESC,
    Get_Distributor(s.CUST_CODE) AS DISTRIBUTOR_DESC,
    Get_Item(s.ITEM_CODE) AS ITEM_DESC,
    Get_Quality(s.SAUDA_QUALITY) AS QUALITY_DESC,
    s.SAUDA_REMARK,
    s.SAUDA_CODE,
    s.SAUDA_QTY,
    (coalesce(S.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))pending_qty,
    get_uom(s.uom_code) as UOM,
    s.SAUDA_RATE,
    s.ITEM_CODE,
    s.SAUDA_QUALITY,
    s.DEALER_CODE,
    s.CUST_CODE,
    s.unique_code,
    s.uom_code,
    s.UNIT_CODE,
    (select hsn from sl_mst_item where item_code=s.ITEM_CODE) hsn
   
FROM
    SL_TRANS_SAUDA_HDR s
    LEFT JOIN
    (SELECT
        BD.SAUDA_CODE,
        BH.UNIT_CODE,
        SUM(coalesce(BD.QTY,0)) AS SO_IN_QTY
     FROM
        SL_TRANS_BOOKING_HDR BH
     JOIN
        SL_TRANS_BOOKING_size_DETail BD ON BH.BOOKING_CODE = BD.BOOKING_CODE and BH.sauda_code=BD.sauda_code
     WHERE
        BH.MARKED IS NULL
        AND BD.MARKED IS NULL
     GROUP BY
        BD.SAUDA_CODE, BH.UNIT_CODE
    ) SO ON s.SAUDA_CODE = SO.SAUDA_CODE
WHERE
    s.MARKED IS null and (coalesce(S.SAUDA_QTY,0)-coalesce(SO.SO_IN_QTY,0))>0
     and s.company_code= ${req.user.company} and s.fin_year='${req.user.finyear}'  and s.unit_code =${req.user.unit}
    and s.sauda_code = '${sauda_code}'`
  );

  // Get ITEM_CODE from the first row of the Requisition result
  const itemCode = Requisition.rows[0].item_code;
  // // console.log(Requisition);
  const size = await client.query(
    `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code =${itemCode}`
  );
  res.status(200).json({
    status: "success",
    data: {
      Requisition,
      size,
    },
  });
});

exports.getAllItemAdd = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const { itemCode } = req.query;
  // console.log(sauda_code);

  // // console.log(Requisition);
  const size = await client.query(
    `select size_code, get_size(size_code)size_nm from sl_mst_item_size_det where item_code =${itemCode}`
  );
  res.status(200).json({
    status: "success",
    data: {
      size,
    },
  });
});

exports.getcustomer = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);

  const item = await client.query(
    `select item_code , item_name from sl_mst_item where marked is null and item_category =${req.params.code}`
  );

  res.status(200).json({
    status: "success",
    data: {
      item,
    },
  });
});

exports.getitemcat = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  // console.log(req.body);
  // console.log(req.body);

  const item = await client.query(
    `select distinct quality_code, get_quality(quality_code) quality_name from sl_mst_item_qual_det where marked is null and item_code =${req.params.code}`
  );

  const uom = await client.query(
    `select distinct item_uom, get_uom(item_uom) uom_name from sl_mst_item where marked is null and item_code =${req.params.code}`
  );

  res.status(200).json({
    status: "success",
    data: {
      item,
      uom,
    },
  });
});
