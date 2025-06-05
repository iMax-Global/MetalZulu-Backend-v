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
exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(
    "uripaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  // query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} WHERE MARKED IS NULL ORDER BY 2`;
  query = `SELECT invoice_no, invoice_no FROM sl_trans_invoice_hdr where MARKED IS NULL`;
  // console.log(query);
  const dbData = await client.query(query);
  const ACCOUNT_CODE =
    await client.query(`select FACTORY_ARRIVAL_CODE,truck_no,driver_name
  from Pur_factory_arrival_hdr where marked is null and against_of='D'`);

  res.status(200).json({
    status: "success",
    data: dbData,
    ACCOUNT_CODE,
  });
});

exports.getAdditionalDataofTable = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.user.unit);
  console.log(req.params);
  const truckNo = req.params.code; // Extract 'truckNo' from the route parameter
  let { gpdate } = req.query; // Extract 'gpdate' from the query string
  console.log(truckNo);
  console.log(gpdate);
  if (gpdate) {
    const [day, month, year] = gpdate.split("-");
    gpdate = `${year}-${month}-${day}`;
    console.log("Converted gpdate:", gpdate); // Check the converted date format
  }

  const ACCOUNT_CODE =
    await client.query(`SELECT invoice_no,timestamptostring(INvoice_date) invoice_date,
get_distributor(DISTRIBUTOR_CODE)customer,
DISTRIBUTOR_CODE FROM sl_trans_invoice_hdr WHERE marked IS NULL AND 
unit_code=${req.user.unit} and company_code ='${req.user.company}' and fin_year ='${req.user.finyear}'
AND entry_gate IS NULL and
invoice_date<='${gpdate}'  and truck_number='${truckNo}'
`);
  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
  });
});

exports.getAdditionalDataofTableItem = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const truckNo = req.params.code; // Extract 'truckNo' from the route parameter

  const ACCOUNT_CODE =
    await client.query(`select store_cd, get_store(store_cd) store_name, item_code,
  get_item(item_code) AS item,
  size_code, get_size(size_code) AS size, quality_code,
  get_quality(quality_code) AS grade, total_qty 
  from sl_trans_inv_size_detail where marked is null and invoice_no='${truckNo}'
`);
  res.status(200).json({
    status: "success",
    ACCOUNT_CODE,
  });
});

exports.outwardformdata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  try {
    const outcode = await client.query(
      "SELECT outward_code,truck_no,driver_name FROM pur_factory_arrival_hdr"
    );

    const invoiceCode = await client.query(
      `
        SELECT invoice_no,driver_name,INvoice_date,grn_no,TRUCK_NUMBER ,get_distributor(DISTRIBUTOR_CODE)customer,DISTRIBUTOR_CODE FROM sl_trans_invoice_hdr WHERE marked IS NULL
            `
    );

    res.status(200).json({
      status: "success",
      data: {
        pendingInward: outcode.rows,
        invoiceCode: invoiceCode.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.getAccGroup = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const INWARD = await client.query(
    `select gp_code, timestamptostring(gp_date) gp_date, truck_no, total_weight, tare_weight, net_weight,
    party_wt, in_out_code pending_inward, driver_name, gateslip_no, invoice_code,
    timestamptostring(challan_date) challan_date, challan_no, entity_code from gate_pass_hdr   where marked is null and company_code= ${req.user.company} and fin_year='${req.user.finyear}'  and unit_code =${req.user.unit}`
  );
  res.status(200).json({
    status: "success",
    data: {
      INWARD,
    },
  });
});

exports.outwardtabledata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.params);
  const { invoice_code } = req.params; // Extract invoice_code from request parameters

  try {
    // Query to get truck number based on invoice code
    const truckNo = await client.query(
      "SELECT truck_number FROM sl_trans_invoice_hdr WHERE invoice_no = $1",
      [invoice_code]
    );

    // Query to get customer name and distributor code based on invoice code
    const customerName = await client.query(
      "SELECT get_distributor(distributor_code) AS customer, distributor_code FROM sl_trans_invoice_hdr WHERE invoice_no = $1",
      [invoice_code]
    );

    // Query to get inner table data based on invoice code
    const innertableData = await client.query(
      `
        SELECT 
          store_cd,get_store(store_cd) store_name,
          item_code,invoice_no,
          get_item(item_code) AS item,
          size_code,
          get_size(size_code) AS size,
          quality,
          get_quality(quality) AS grade,
          qty
        FROM 
          sl_trans_inv_size_detail
        WHERE 
          marked IS NULL
          AND invoice_no = $1
        `,
      [invoice_code]
    );

    // Construct the combined data response
    const combinedData = {
      truckNo: truckNo.rows,
      customerName: customerName.rows,
      innertableData: innertableData.rows,
    };

    // console.log(combinedData,"aqijkoliuyftrdftgygggggggggg");

    // Send response with success status and data
    res.status(200).json({
      status: "success",
      data: combinedData,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const generateReqId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(CAST(substring(gp_code from '[0-9]+$') AS INTEGER)) AS M FROM gate_pass_hdr`
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

exports.owgatedata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  console.log(req.body, "TTTTTTTTTTT");

  const { OutWard, OutDetail } = req.body;

  try {
    await client.query("BEGIN");

    // Extract OutWard data
    const outWardData = OutWard[0];
    const {
      gpDate,
      truckNo,
      totalWeight,
      tareWeight,
      netWeight,
      invoiceCode,
      gateSlipNo,
      driverName,
      challanNo,
      challanDate,
      cust_code,
      company_code,
      user_code,
      unit_code,
      fin_year,
      pendingInward,
    } = outWardData;

    // Convert gpDate and challanDate to YYYY-MM-DD format
    const formattedGpDate = formatDate(gpDate);
    const formattedChallanDate = challanDate ? formatDate(challanDate) : null;

    // Generate gp_code dynamically if necessary
    const openingBalanceCode = await generateReqId(client);

    const insertHeaderQuery = `
      INSERT INTO gate_pass_hdr (
        gp_code, gp_date, truck_no, total_weight, tare_weight, net_weight, party_wt, 
        driver_name, gateslip_no, invoice_code, challan_date, challan_no, entity_code,
        company_code, user_code, unit_code, fin_year, in_out_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      );`;

    const headerParams = [
      openingBalanceCode,
      formattedGpDate,
      truckNo,
      totalWeight,
      tareWeight,
      netWeight,
      cust_code,
      driverName,
      gateSlipNo,
      invoiceCode,
      formattedChallanDate,
      challanNo,
      cust_code,
      req.user.company,
      req.user[0].spec_code,
      req.user.unit,
      req.user.finyear,
      pendingInward,
    ];

    // console.log("Executing header query:", insertHeaderQuery);
    // console.log("With parameters:", headerParams);

    await client.query(insertHeaderQuery, headerParams);

    // Insert into gate_pass_det table for each row in OutDetail
    for (const detail of OutDetail) {
      const { store_cd, item_code, quality_code, size_code, total_qty } =
        detail;

      const insertDetailQuery = `
        INSERT INTO gate_pass_det (
          gp_code, store_code, item_code, quality_code, size_code, quantity,
          company_code, user_code, unit_code, fin_year
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        );`;

      const detailParams = [
        openingBalanceCode,
        store_cd,
        item_code,
        quality_code,
        size_code,
        total_qty,
        req.user.company,
        req.user[0].spec_code,
        req.user.unit,
        req.user.finyear,
      ];

      // console.log("Executing detail query:", insertDetailQuery);
      // console.log("With parameters:", detailParams);

      await client.query(insertDetailQuery, detailParams);
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Packing data saved successfully",
      gpCode: openingBalanceCode,
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

// Helper function to format date from DD-MM-YYYY to YYYY-MM-DD
function formatDate(dateString) {
  const [day, month, year] = dateString.split("-");
  return `${year}-${month}-${day}`;
}

exports.deleteReturn = wrapper(async (req, res, next) => {
  // console.log("hi");
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Sales contract Code",
    });
  }

  await client.query(
    `Update gate_pass_hdr SET MARKED='D' WHERE  gp_code='${req.params.code}'`
  );

  await client.query(
    `Update gate_pass_det SET MARKED='D' WHERE  gp_code='${req.params.code}'`
  );

  res.status(200).json({
    status: "success",
    message: "Sales Contract Deleted Successfully",
  });
});

const pdfmake = wrapper(async (req, res, str) => {
  const gp_code = req.params.code;
  console.log(req.params, "Trrrrrrrrrrrrrrrrrrrrr", gp_code);
  try {
    const client = req.dbConnection;
    // Fetch header data from gate_pass_hdr
    const headerQuery = `SELECT GP_CODE, GATESLIP_NO, GP_DATE, TRUCK_NO, challan_date, 
               GET_DISTRIBUTOR(ENTITY_CODE) AS CUSTOMER, INVOICE_CODE, DRIVER_NAME
        FROM gate_pass_hdr
        WHERE MARKED IS NULL AND COMPANY_CODE = 1 AND UNIT_CODE = 1
        AND GP_CODE = $1;
    `;
    const headerResult = await client.query(headerQuery, [gp_code]);

    // If no header is found
    if (headerResult.rows.length === 0) {
      return res.status(404).json({ error: "Gate pass not found" });
    }

    // Fetch detail data from gate_pass_DET
    const detailQuery = `
    select GET_ITEM(ITEM_CODE)ITEM,GET_SIZE(SIZE_CODE)size,GET_QUALITY(QUALITY_CODE)GRADE, GET_UOM(ITEM_CODE)UOM_NAME,quantity
    from gate_pass_DET where MARKED is null and COMPANY_CODE=1 and UNIT_CODE=1
    and gp_code=$1
    
    `;

    const address = await client.query(
      `SELECT site_desc, add1, ph1, email, gst_no, cin_no, bank_name, bank_add1, account_no, ifsc_cd 
    FROM sl_mst_site where marked is null and company=1
    and site_code=1`
    );

    const company = await client.query(
      `SELECT company_name FROM sl_mst_company WHERE MARKED is null and COMPANY_CODE = 1`
    );

    const detailResult = await client.query(detailQuery, [gp_code]);

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
