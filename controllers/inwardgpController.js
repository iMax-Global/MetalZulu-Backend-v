const { Client } = require("pg");
const wrapper = require("../utils/wrapper");

// Utility function to get a new code (for generating ppc_code, faCode, and gpCode)
const getNewCode = async (client, prefix, table, codeColumn) => {
  const query = `
    SELECT COALESCE(
      '${prefix}-' || (
        (
          SELECT RIGHT(MAX(${codeColumn}), LENGTH(MAX(${codeColumn})) - POSITION('-' IN MAX(${codeColumn})))::integer 
          FROM ${table}
          WHERE ${codeColumn} LIKE '${prefix}-%'
        ) + 1
      )::text,
      '${prefix}-1'
    ) AS new_code;
  `;
  const result = await client.query(query);
  return result.rows[0].new_code;
};

// Handler to fetch gate pass data for inward
exports.getGatePassDataInward = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log("hiiiiiiiiiiiiiiiiii");

  const gatePassType = await client.query(
    "SELECT type_code, type_desc FROM MST_TYPES_GATE_PASS"
  );

  const gateKeeper = await client.query(
    "SELECT employee_code, employee_name FROM sl_mst_employee"
  );

  const dealType = await client.query(
    "SELECT dealtype_code, dealtype FROM pur_mst_dealtype"
  );

  const vender = await client.query(
    "SELECT party_code, party_name FROM pur_mst_party"
  );
  const transporterName = await client.query(
    "SELECT transporter_code, company_name FROM sl_mst_transporter_master"
  );
  const orderType = await client.query(
    "SELECT po_type1, type_name FROM pur_mst_po_type"
  );
  const convUom = await client.query("SELECT uom_code, uom FROM sl_mst_uom");

  res.status(200).json({
    status: "success",
    data: {
      gatePassType: gatePassType,
      gateKeeperName: gateKeeper,
      dealType: dealType,
      vender: vender,
      transporter: transporterName,
      orderType: orderType,
      convUom: convUom,
    },
  });
});

exports.inwardtabledat = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const tableData = req.query;
  console.log(tableData);
  const query = `SELECT
  H.rmd_code,
  H.PO_REF,
  Get_Party(H.PARTY_CODE) AS PARTY ,(SUM(coalesce(D.TOTAL_QTY,0))-SUM(coalesce(SI.INV_QTY,0)))pending_qty
FROM
  PUR_RMDEAL_HDR H
JOIN
  PUR_RMDEAL_DET D ON H.rmd_code = D.rmd_code
  LEFT JOIN
  (SELECT
      IDT.rmd_code,
     
      SUM(coalesce(IDT.quantity,0)) AS INV_QTY
   FROM
      pur_factory_arrivaL_hdr IH
   JOIN
      pur_factory_arrivaL_det IDT ON IH.po_ref = IDT.rmd_code
   WHERE
      IH.MARKED IS null        
      AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit} and ih.fin_year ='${req.user.finyear}'
   GROUP BY
      IDT.rmd_code
  ) SI ON d.rmd_code = SI.rmd_code
WHERE
  H.MARKED IS NULL
  AND H.deal_status IS null
 AND H.PARTY_CODE =$1 
    AND H.DEAL_TYPE_CD = $2
    and h.company_code= ${req.user.company} and 
    h.fin_year='${req.user.finyear}' and 
    h.unit_code =${req.user.unit}
    group by H.rmd_code,H.PO_REF,h.party_code 
 having (SUM(coalesce(D.TOTAL_QTY,0))-SUM(coalesce(SI.INV_QTY,0)))>0
  `;

  console.log(query, "awefthjkjwaesrdftijjiuytesefthuijohurewardftyghuij");
  // console.log(tableData, "awefthjkjwaesrdftijjiuytesefthuijohurewardftyghuij");
  const results = await client.query(query, [
    tableData.party_code,
    tableData.deal_type_cd,
  ]);

  res.status(200).json({
    status: "success",
    data: {
      tableData: results,
    },
  });
});

// const wrapper = (fn) => (...args) => fn(...args).catch(args[2]); // Assuming you have a wrapper function like this
const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(factory_arrival_code from '[0-9]+$') AS INTEGER)) AS M FROM pur_factory_arrivaL_hdr`
  );
  // console.log("ggjhjkkjkj", response1);

  if (response1.rows.m === null) {
    return `G12425-1`;
  } else {
    // console.log("numfgfgfgfgfgf");
    const num = Number(response1.rows[0].m) + 1;

    // console.log(num);
    return `G12425-${num}`;
  }
};

function reverseDateFormat(dateString) {
  const parts = dateString.split("-"); // Split the string into an array
  return `${parts[2]}-${parts[1]}-${parts[0]}`; // Rearrange to YYYY-MM-DD
}

function reverse2DateFormat(dateTimeString) {
  const [date, time] = dateTimeString.split(" "); // Split into date and time
  const parts = date.split("-"); // Split the date into components
  return `${parts[2]}-${parts[1]}-${parts[0]} ${time}`; // Rearrange to YYYY-MM-DD and append time
}

exports.handleSave = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  console.log(req.body, "bodyyyyyyyyyyyyyyyyyy");
  var body = req.body;

  try {
    await client.query("BEGIN");

    const generate_code = await generateReqId(client);

    // const result = await client.query("SELECT get_uom($1) as convUom", [
    //   convUomInt,
    // ]);
    // const convUomVal = result.rows[0].convUom;

    const sqlQuery = `INSERT INTO pur_factory_arrivaL_hdr (factory_arrival_code, g_type_cd, against_of,  
        start_date, arrival_date, gatekeeper_cd, challan_date, dealtype_cd, party_code, po_ref,
        driver_name, truck_no, po_type1, timein, timeout, company_code, user_code, unit_code, fin_year)
      VALUES (
        '${generate_code}',
        ${body.InWard[0].g_type_cd},
        '${body.InWard[0].against_of}',
        '${reverseDateFormat(body.InWard[0].start_date)}',
        '${reverseDateFormat(body.InWard[0].arrival_date)}',
        '${body.InWard[0].gatekeeper_cd}',
        '${reverseDateFormat(body.InWard[0].challan_date)}',
        ${body.InWard[0].dealtype_cd},
        ${body.InWard[0].party_code},
        '${body.InWard[0].po_code}',
        '${body.InWard[0].driver_name}',
        '${body.InWard[0].truck_no}',
        ${body.InWard[0].po_type1},
        '${reverse2DateFormat(body.InWard[0].timein)}',
        '${reverse2DateFormat(body.InWard[0].timeout)}',
        '${req.user.company}', '${req.user[0].spec_code}', '${
      req.user.unit
    }', '${req.user.finyear}'
        )`;

    // Log the query for debugging
    console.log("Executing query:", sqlQuery);

    // Execute the query
    await client.query(sqlQuery);

    for (const row of body.InDetail) {
      await client.query(
        `
        INSERT INTO pur_factory_arrival_det (factory_arrival_code, rmd_code, item_code, size_code, 
          quality_code, uom_code, con_uom, quantity,  item_rate, rmd_recno , company_code, user_code, unit_code, fin_year)
        VALUES ('${generate_code}',  '${row.rmd_code}', ${row.item_code}, ${row.size_code},
        ${row.quality_code},${row.uom_code}, ${row.convert_uom}, ${row.total_qty}, ${row.rate}, '${row.unique_code}', '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}') `
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Packing data saved successfully",
      // Optional: returning the generated code
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inserting data:", error);
    res.status(500).json({
      status: "error",
      message: "Error saving packing data",
      error: error.message,
    });
  }
});

exports.getAccGroup = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const INWARD = await client.query(
    `select factory_arrival_code gp_code, timestamptostring(arrival_date)gp_date , timestamptostring(start_date) start_date, 
    get_party(party_code) vendor, get_employee(gatekeeper_cd) gatekeeper  from
       pur_factory_arrivaL_hdr`
  );
  res.status(200).json({
    status: "success",
    data: {
      INWARD,
    },
  });
});

exports.getDeatilOfPo = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.params);
  const INWARD = await client.query(
    `
  
  SELECT
  D.rmd_code ,
    Get_Item(D.ITEM_CODE) AS ITEM_NAME, 
    D.UOM_CODE, 
    Get_Uom(D.UOM_CODE) AS UOM_DESC, 
    Get_Size(D.SIZE_CODE) AS SIZE_DESC, 
    Get_Quality(D.QUALITY_CODE) AS QUALITY_DESC,
    D.ITEM_CODE, 
    D.SIZE_CODE, 
    D.QUALITY_CODE,  
    D.UNIQUE_CODE, 
    D.RATE, 
    D.convert_qty,
    D.convert_uom,
    D.STORE_CD,(coalesce(D.TOTAL_QTY,0)-coalesce(SI.INV_QTY,0))TOTAL_qty,
    D.STORE_CD,(coalesce(D.TOTAL_QTY,0)-coalesce(SI.INV_QTY,0))INITIAL_qty
  FROM PUR_RMDEAL_DET D 
  LEFT JOIN 
    (SELECT 
        IDT.rmd_code, 
        IDT.rmd_recno, 
        SUM(coalesce(IDT.quantity,0)) AS INV_QTY
     FROM 
        pur_factory_arrivaL_hdr IH
     JOIN 
        pur_factory_arrivaL_det IDT ON IH.po_ref = IDT.rmd_code
     WHERE 
        IH.MARKED IS null        
        AND IDT.MARKED IS null and ih.company_code=${req.user.company} and ih.unit_code=${req.user.unit} and ih.fin_year ='${req.user.finyear}'
     GROUP BY 
        IDT.rmd_code, IDT.rmd_recno
    ) SI ON d.rmd_code = SI.rmd_code
  WHERE D.MARKED IS NULL  
  and D.rmd_code='${req.params.code}' AND  D.company_code= ${req.user.company} and 
  D.fin_year='${req.user.finyear}'  and 
  D.unit_code =${req.user.unit}
  and (coalesce(D.TOTAL_QTY,0)-coalesce(SI.INV_QTY,0))>0`
  );
  res.status(200).json({
    status: "success",
    data: {
      INWARD,
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
  const { dealTypecode, partyCode, poCode } = req.query;

  const Requisition = await client.query(` 
    SELECT
    h.rmd_code ,
        Get_Item(D.ITEM_CODE) AS ITEM_NAME,
        D.UOM_CODE,
        Get_Uom(D.UOM_CODE) AS UOM_DESC,
        Get_Size(D.SIZE_CODE) AS SIZE_DESC,
        Get_Quality(D.QUALITY_CODE) AS QUALITY_DESC,
        D.ITEM_CODE,
        D.SIZE_CODE,
        D.QUALITY_CODE,  
        D.UNIQUE_CODE,
        D.RATE,
        D.convert_qty,
        D.convert_uom,
        D.STORE_CD,
        (COALESCE(D.TOTAL_QTY, 0) - COALESCE(SI.INV_QTY, 0)) AS total_qty,
        (COALESCE(D.TOTAL_QTY, 0) - COALESCE(SI.INV_QTY, 0)) AS initial_qty
    FROM
        PUR_RMDEAL_HDR H
    JOIN
        PUR_RMDEAL_DET D ON H.rmd_code = D.rmd_code
    LEFT JOIN
        (
            SELECT
                IDT.rmd_code,
                IDT.rmd_recno,
                SUM(COALESCE(IDT.quantity, 0)) AS INV_QTY
            FROM
                pur_factory_arrival_hdr IH
            JOIN
                pur_factory_arrival_det IDT ON IH.po_ref = IDT.rmd_code
            WHERE
                IH.MARKED IS NULL        
                AND IDT.MARKED IS NULL
                AND IH.company_code =  ${req.user.company} 
              AND IH.unit_code =${req.user.unit}
                AND IH.fin_year ='${req.user.finyear}'
            GROUP BY
                IDT.rmd_code, IDT.rmd_recno
        ) SI ON D.rmd_code = SI.rmd_code AND D.UNIQUE_CODE = SI.rmd_recno
    WHERE
        D.MARKED IS NULL
        AND (COALESCE(D.TOTAL_QTY, 0) - COALESCE(SI.INV_QTY, 0)) > 0
        AND H.DEAL_TYPE_CD = ${dealTypecode}
        AND H.PARTY_CODE =${partyCode}
        AND H.rmd_code <> '${poCode}'
        AND H.company_code =  ${req.user.company} 
        AND H.fin_year = '${req.user.finyear}'
        AND H.unit_code = ${req.user.unit}`);
  // console.log(Requisition.rows);

  res.status(200).json({
    status: "success",
    data: {
      Requisition,
    },
  });
});

exports.deleteReturn = wrapper(async (req, res, next) => {
  // console.log("hi");
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Sales contract Code",
    });
  }

  const tableArray = [
       { table: "pur_mrir_hdr" , column:"gate_pass"},
    { table: "gate_pass_hdr" , column:"in_out_code"},
    {table:"pur_mrir_det", column: "factory_arrival_code"}

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
  console.log(isAnyTableUsed,"Sales contract");

  if (isAnyTableUsed) {
    // If any table returns false, the item is already used
    return res.status(200).json({
      status: "success",
      message: "This Recored is Already Tagged",
      isUsed: true,
    });
  } else {
  await client.query(
    `Update pur_factory_arrivaL_hdr SET MARKED='D' WHERE  factory_arrival_code='${req.params.code}'`
  );

  await client.query(
    `Update pur_factory_arrival_det SET MARKED='D' WHERE  factory_arrival_code='${req.params.code}'`
  );

  res.status(200).json({
    status: "success",
    message: "Sales Contract Deleted Successfully",
  });
}
});

const pdfmake = wrapper(async (req, res, str) => {
  const arrivalCode = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", arrivalCode);
  try {
    const client = req.dbConnection;
    // Fetch header data from gate_pass_hdr
    const headerQuery = `
        SELECT h.FACTORY_ARRIVAL_CODE GATE_PASS_NO,h.po_ref PO_NUMBER,h.ARRIVAL_DATE GATE_PASS_DATE,
        h.TRUCK_NO,h.CHALLAN_DATE,get_employee(h.GATEKEEPER_CD) emp,  get_party(PARTY_CODE)party
        FROM PUR_FACTORY_ARRIVAL_HDR h WHERE h.marked IS NULL
        and H.COMPANY_CODE=1 and H.UNIT_CODE=1
            AND FACTORY_ARRIVAL_CODE = $1;
        `;
    const headerResult = await client.query(headerQuery, [arrivalCode]);
    // console.log(headerResult, "tyu");

    // If no header is found
    if (headerResult.rows.length === 0) {
      return res.status(404).json({ error: "Gate pass not found" });
    }

    // Fetch detail data from gate_pass_DET
    const detailQuery = `
        select get_item(d.item_code)item_name,get_size(d.size_code)size_name,get_uom(d.uom_code)uom_name,
get_quality(d.quality_code)quality_name,d.QUANTITY
FROM  PUR_FACTORY_ARRIVAL_det d WHERE d.marked IS null and D.COMPANY_CODE=1 and D.UNIT_CODE=1
AND D.FACTORY_ARRIVAL_CODE=$1
      
        
        `;

    const address = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
        FROM sl_mst_site where marked is null and company=1
        and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );

    const detailResult = await client.query(detailQuery, [arrivalCode]);

    // Combine header and detail results
    const response = {
      header: headerResult.rows[0],
      details: detailResult.rows,
      address: address.rows[0],
      company: company.rows[0],
    };

    // Send the combined result as JSON
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

exports.downloadPDF = async (req, res, next) => {
  await pdfmake(req, res, "download");
  // console.log("2" + req.params.code);
};

//////////////////////////Register///////////////////////////

exports.getAllGate1 = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `

select h.factory_arrival_code gate_pass_code,timestamptostring(h.arrival_date) gate_pass_date ,h.truck_no,h.driver_name,
get_party(h.party_code)vendor,get_dealtype(h.dealtype_cd)deal_type,get_employee(h.gatekeeper_cd)gate_keeper,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
d.quantity
from Pur_factory_arrival_hdr h, PUR_FACTORY_ARRIVAL_DET d
where h.marked is null and d.marked is null and h.factory_arrival_code=d.factory_arrival_code
and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}' `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.arrival_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
exports.getAllGate1Week = wrapper(async (req, res, next) => {
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
  select h.factory_arrival_code gate_pass_code,timestamptostring(h.arrival_date) gate_pass_date ,h.truck_no,h.driver_name,
  get_party(h.party_code)vendor,get_dealtype(h.dealtype_cd)deal_type,get_employee(h.gatekeeper_cd)gate_keeper,
  get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
  d.quantity
  from Pur_factory_arrival_hdr h, PUR_FACTORY_ARRIVAL_DET d
  where h.marked is null and d.marked is null and h.factory_arrival_code=d.factory_arrival_code
  and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}'
AND h.arrival_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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

////////////inward////
exports.getAllGate1In = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  select h.factory_arrival_code gate_pass_code, timestamptostring(h.arrival_date) gate_pass_date ,h.truck_no,h.driver_name,
get_party(h.party_code)vendor,get_dealtype(h.dealtype_cd)deal_type,get_employee(h.gatekeeper_cd)gate_keeper,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
d.quantity
from Pur_factory_arrival_hdr h, PUR_FACTORY_ARRIVAL_DET d
where h.marked is null and d.marked is null and h.factory_arrival_code=d.factory_arrival_code
and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}'

  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.arrival_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
exports.getAllgetAllGate1MrirByWeekIn = wrapper(async (req, res, next) => {
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
  select h.factory_arrival_code gate_pass_code, timestamptostring(h.arrival_date) gate_pass_date ,h.truck_no,h.driver_name,
get_party(h.party_code)vendor,get_dealtype(h.dealtype_cd)deal_type,get_employee(h.gatekeeper_cd)gate_keeper,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_uom(uom_code)uom,
d.quantity
from Pur_factory_arrival_hdr h, PUR_FACTORY_ARRIVAL_DET d
where h.marked is null and d.marked is null and h.factory_arrival_code=d.factory_arrival_code
and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}'
AND h.arrival_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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

////////////outward
exports.getAllGate1Out = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Base query with dynamic values from parameters
  let baseQuery = `
  select h.gp_code gate_pass_code, timestamptostring(h.gp_date)  gate_pass_date ,h.truck_no,h.driver_name,
get_distributor(h.entity_code)distributor,
get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,
d.quantity
from gate_pass_hdr h, gate_pass_det d
where h.marked is null and d.marked is null and h.gp_code=d.gp_code
and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}' 

  `;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND h.gp_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
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
exports.getAllGate1Outweek = wrapper(async (req, res, next) => {
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
  select h.gp_code gate_pass_code, timestamptostring(h.gp_date)  gate_pass_date ,h.truck_no,h.driver_name,
  get_distributor(h.entity_code)distributor,
  get_item(d.item_code)item,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,
  d.quantity
  from gate_pass_hdr h, gate_pass_det d
  where h.marked is null and d.marked is null and h.gp_code=d.gp_code
  and h.unit_code=${req.user.unit} and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}'
AND h.gp_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
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

///api/v1/inwarddatagp
//Inward GatePass Register
