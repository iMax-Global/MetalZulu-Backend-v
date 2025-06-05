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

exports.showPacking = wrapper(async (req, res, next) => {
  const client = req.dbConnection; // Assuming req.dbConnection is set up

  try {
    const formdat = await client.query(`
        SELECT 
          ROW_NUMBER() OVER () AS serial_no, 
          h.ppc_code, 
          h.ppc_date, 
          h.dealer_code, 
          h.cust_code, 
          h.employee_code,
          SUM(pcs) AS pcs, 
          SUM(total) AS packing_wt
        FROM 
          ppc_stock_dis_hdr h
        JOIN 
          ppc_stock_dis_det d 
        ON 
          h.ppc_code = d.ppc_code  -- Assuming there's a relation based on ppc_code
        WHERE 
          h.marked IS NULL AND d.marked IS NULL
        GROUP BY 
          h.ppc_code, 
          h.ppc_date, 
          h.dealer_code, 
          h.cust_code, 
          h.employee_code
      `);

    const empname = await client.query(`
        SELECT employee_name, employee_code FROM sl_mst_employee
      `);

    res.status(200).json({
      status: "success",
      data: {
        pendingInward: formdat.rows,
        empname: empname.rows,
      },
    });
  } catch (error) {
    next(error); // Handle errors
  }
});

exports.showPackingorder = wrapper(async (req, res, next) => {
  const client = req.dbConnection; // Assuming req.dbConnection is set up
  const query = `
    SELECT ROW_NUMBER() OVER () AS serial_no, booking_code, get_distributor(distributor_code), distributor_code, get_dealer_name(dealer_name), dealer_name FROM sl_trans_booking_hdr
      `;

  const results = await client.query(query);

  res.status(200).json({
    status: "success",
    data: results.rows,
  });
});

exports.getPackTableData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { bookingNo } = req.params; // Destructure bookingNo from req.params
  // console.log("Booking Number:", bookingNo);

  try {
    // Query to get the main data with bookingNo directly interpolated into the query
    const mainDataQuery = `
            SELECT 
                H.BOOKING_CODE,
                H.DISTRIBUTOR_code,
                GET_DISTRIBUTOR(H.DISTRIBUTOR_code) AS CUSTOMER_NM,
                H.REF_BOOKING_NO,
                H.DEALER_NAME,
                GET_EXTERNAL_ENTITY(H.DEALER_NAME) AS DEALER_NM,
                D.ITEM_CODE,
                GET_ITEM(D.ITEM_CODE) AS ITEM,
                D.SIZE_CODE,
                GET_SIZE(D.SIZE_CODE) AS SZ,
                D.QUALITY,
                GET_QUALITY(D.QUALITY) AS GRADE,
                D.QTY,
                D.UOM,
                GET_UOM(D.UOM) AS UOM_NM,
                D.NO_PCS,
                D.UNIQUE_ID,
                (COALESCE(D.QTY, 0) - COALESCE(PK_WT, 0)) AS PENDING_WT,
                (COALESCE(D.NO_PCS, 0) - COALESCE(PK_PCS, 0)) AS PENDING_PCS
            FROM 
                SL_TRANS_BOOKING_HDR H
            JOIN 
                SL_TRANS_BOOKING_SIZE_DETAIL D 
            ON 
                H.BOOKING_CODE = D.BOOKING_CODE
            LEFT JOIN (
                SELECT 
                    PD.BOOKING_NO,
                    PD.BOOKING_UNIQ_NO,
                    SUM(PD.TOTAL) AS PK_WT,
                    SUM(PD.PCS) AS PK_PCS
                FROM 
                    PPC_STOCK_DIS_DET PD
                WHERE 
                    PD.MARKED IS NULL
                GROUP BY 
                    PD.BOOKING_NO, PD.BOOKING_UNIQ_NO
            ) AA 
            ON 
                H.BOOKING_CODE = AA.BOOKING_NO 
                AND D.UNIQUE_ID = AA.BOOKING_UNIQ_NO
            WHERE 
                H.MARKED IS NULL
                AND D.MARKED IS NULL
               -- AND H.AUTH_STATUS = 'A'
                AND H.BOOKING_CODE = '${bookingNo}'
            ORDER BY 
                H.BOOKING_CODE;
        `;

    // Log the query and parameters for debugging
    // console.log("Executing Query:", mainDataQuery);

    const mainData = await client.query(mainDataQuery);

    // Log the results of the query
    // console.log("Query Result:", mainData.rows);

    // Construct the combined data response
    const combinedData = {
      mainData: mainData.rows,
    };

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

exports.handleSave = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const {
    packingDate,
    orderCode,
    dealer,
    dealerCode,
    customer,
    customerCode,
    packingIncharge,
    marking,
    truckNo,
    weighbridgeWt,
    items,
    tableData = [], // Ensure tableData is initialized
    remarks = [],
    packing_qty = [],
    pcs = [],
  } = req.body;

  // // console.log(
  //   req.body,
  //   "susfwfuldsfhkjdshfdskjfdkfjsaksdksahfkdsflefldsfhdskdlkffldsfjsfylyedskcjfds"
  // );

  const weighbridgeWtInt = parseInt(weighbridgeWt, 10) || 0;

  try {
    await client.query("BEGIN");

    // Generate new packing code
    const generate_code = await client.query(`
      SELECT COALESCE(
        'A12425-' || (
            (
                SELECT RIGHT(MAX(ppc_code), LENGTH(MAX(ppc_code)) - POSITION('-' IN MAX(ppc_code)))::integer 
                FROM ppc_stock_dis_hdr
                WHERE ppc_code LIKE 'A12425-%'
            ) + 1
        )::text,
        'A12425-1'  -- Default value if no matching rows exist
    ) AS new_ppc_code;
    `);

    const ppcCode = generate_code.rows[0].new_ppc_code;

    // Insert into header table
    await client.query(
      `
      INSERT INTO ppc_stock_dis_hdr (ppc_code, ppc_date, booking_no, dealer_code, cust_code, employee_code, marking, truck_no, weight_wt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
      `,
      [
        ppcCode,
        packingDate,
        orderCode,
        dealerCode,
        customerCode,
        packingIncharge,
        marking,
        truckNo,
        weighbridgeWtInt,
      ]
    );

    // Insert into detail table
    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      const { booking_code, item_code, size_code, quality, qty, no_pcs } = row;

      const currentPackingQtyInt = parseInt(packing_qty[i], 10) || 0;
      const currentPcsInt = parseInt(pcs[i], 10) || 0;
      const currentRemarks = remarks[i] || "";

      const query = `
        INSERT INTO ppc_stock_dis_det (ppc_code, booking_no, item_code, size_code, grade, total, pcs, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;

      const values = [
        ppcCode,
        booking_code,
        item_code,
        size_code,
        quality,
        currentPackingQtyInt,
        currentPcsInt,
        currentRemarks,
      ];

      await client.query(query, values);
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Packing data saved successfully",
      ppcCode, // Return the generated code if needed
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
