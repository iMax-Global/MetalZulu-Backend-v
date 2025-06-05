const { client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");


exports.getAllInternalRequsition = wrapper(async (req, res, next) => {
    const client = req.dbConnection;
  
    let baseQuery = `
    select h.req_code,timestamptostring(h.req_date)  req_date, parse_time_string(h.req_time::VARCHAR) req_time, 
    get_department(h.dept_cd)department,get_employee(h.emp_cd)employee,get_item(d.item_code)item,get_uom(d.uom_code)Uom
    ,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_cost_center(d.cost_code)cost_center, d.no_of_pcs, 
    d.qty, d.remark
    from PUR_STORE_REQ_HDR h,PUR_STORE_REQ_DET d  
    where h.marked is null and d.marked is null and h.req_code=d.req_code`;
  
    if (req.query.from && req.query.to) {
      baseQuery += ` AND H.req_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
    }
  
    const invoice = await client.query(baseQuery);
    console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
  exports.getAllInternalReqByWeek = wrapper(async (req, res, next) => {
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
    select h.req_code,timestamptostring(h.req_date)  req_date, parse_time_string(h.req_time::VARCHAR) req_time, 
    get_department(h.dept_cd)department,get_employee(h.emp_cd)employee,get_item(d.item_code)item,get_uom(d.uom_code)Uom
    ,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_cost_center(d.cost_code)cost_center, d.no_of_pcs, 
    d.qty, d.remark
    from PUR_STORE_REQ_HDR h,PUR_STORE_REQ_DET d  
    where h.marked is null and d.marked is null and h.req_code=d.req_code
        AND h.req_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  
    const invoice = await client.query(query);
  
    // Map result rows to the response format
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
exports.getdailyissue = wrapper(async (req, res, next) => {
    const client = req.dbConnection;
  
    let baseQuery = `
    SELECT p.issue_code,timestamptostring(p.ISSUE_date) issue_date, get_department (p.dept_code)department, 
get_division(p.d_code),p.REQ_CODE requisition_code,get_item(h.item_code)item_name,
get_quality(h.QUALITY_CODE)quality, get_size
 (h.SIZE_CODE)SIZE_name,get_uom (h.UOM_CODE)uom,get_cost(H.cost_CODE)COST_DESC,h.qty 
FROM PUR_TRANS_INGOT_ISSUE_hdr p,PUR_TRANS_INGOT_ISSUE h
  WHERE  p. marked IS NULL and h.marked IS null and p.company_code=${req.user.company} and p.unit_code=${req.user.unit}`;
  
    if (req.query.from && req.query.to) {
      baseQuery += ` AND H.issue_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
    }
  
    const invoice = await client.query(baseQuery);
    // console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
  exports.getdailyissueByWeek = wrapper(async (req, res, next) => {
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
    SELECT p.issue_code,timestamptostring(p.ISSUE_date) issue_date, get_department (p.dept_code)department, 
get_division(p.d_code),p.REQ_CODE requisition_code,get_item(h.item_code)item_name,
get_quality(h.QUALITY_CODE)quality, get_size
 (h.SIZE_CODE)SIZE_name,get_uom (h.UOM_CODE)uom,get_cost(H.cost_CODE)COST_DESC,h.qty 
FROM PUR_TRANS_INGOT_ISSUE_hdr p,PUR_TRANS_INGOT_ISSUE h
  WHERE  p. marked IS NULL and h.marked IS null and p.company_code=${req.user.company} and p.unit_code=${req.user.unit}
        AND h.issue_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  
    const invoice = await client.query(query);
  
    // Map result rows to the response format
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });

  //issue returrn register
exports.getissuereturn = wrapper(async (req, res, next) => {
    const client = req.dbConnection;
  
    let baseQuery = `
    select h.return_code,timestamptostring(h.return_date) return_date, h.issue_code, h.issue_date,  get_division(h.d_code)division,
get_department(h.dept_code)department,get_item(d.item_code)item,get_size(d.size_code)size,
get_quality(d.qualty_code)grade,get_uom(d.uom_code)uom, d.rate, d.op_qty
from pur_trans_issue_return_hdr h,pur_trans_issue_return_det d where h.marked is null and d.marked is null 
and h.return_code=d.return_code and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=${req.user.unit}`;
  
    if (req.query.from && req.query.to) {
      baseQuery += ` AND H.return_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
    }
  
    const invoice = await client.query(baseQuery);
    // console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
  exports.getissuereturnByWeek = wrapper(async (req, res, next) => {
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
    select h.return_code,timestamptostring(h.return_date) return_date, h.issue_code, h.issue_date,  get_division(h.d_code)division,
get_department(h.dept_code)department,get_item(d.item_code)item,get_size(d.size_code)size,
get_quality(d.qualty_code)grade,get_uom(d.uom_code)uom, d.rate, d.op_qty
from pur_trans_issue_return_hdr h,pur_trans_issue_return_det d where h.marked is null and d.marked is null 
and h.return_code=d.return_code and h.company_code=${req.user.company} and h.fin_year='${req.user.finyear}' and h.unit_code=1${req.user.unit}
        AND h.return_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  
    const invoice = await client.query(query);
  
    // Map result rows to the response format
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });

//stock adjstment register
exports.getstockadjustment = wrapper(async (req, res, next) => {
    const client = req.dbConnection;
  
    let baseQuery = `
    select h.ssh_code,timestamptostring(h.stock_date) stock_date, h.effect, h.reason , h.trans_type,
    d.quality_code, d.size_code, d.item_code, d.store_cd, d.uom_code ,d.pices, d.quantity , d.RATE
    from pur_stock_adju_hdr h, pur_stock_adju_det d where h.marked is null and d.marked is null 
    and h.ssh_code=d.ssh_code and h.company_code=${req.user.company} and h.unit_code=${req.user.unit} and h.fin_year='${req.user.finyear}'`;
  
    if (req.query.from && req.query.to) {
      baseQuery += ` AND H.stock_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
    }
  
    const invoice = await client.query(baseQuery);
    // console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
  exports.getstockadjustmentByWeek = wrapper(async (req, res, next) => {
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
    select h.ssh_code,timestamptostring(h.stock_date) stock_date, h.effect, h.reason , h.trans_type,
    d.quality_code, d.size_code, d.item_code, d.store_cd, d.uom_code ,d.pices, d.quantity , d.RATE
    from pur_stock_adju_hdr h, pur_stock_adju_det d where h.marked is null and d.marked is null 
    and h.ssh_code=d.ssh_code and h.company_code=${req.user.company} and h.unit_code=${req.user.unit} and h.fin_year='${req.user.finyear}'
        AND h.stock_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  
    const invoice = await client.query(query);
  
    // Map result rows to the response format
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });


//pending internal requsition register
exports.getPendingIntReq = wrapper(async (req, res, next) => {
    const client = req.dbConnection; //timestamptostring(  ${req.user.unit}
  
    let baseQuery = `
    select h.req_code,timestamptostring(h.req_date)  req_date, parse_time_string(h.req_time::VARCHAR) req_time, 
get_department(h.dept_cd)department,get_employee(h.emp_cd)employee,get_item(d.item_code)item,get_uom(d.uom_code)Uom
,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_cost_center(d.cost_code)cost_center, d.no_of_pcs, 
coalesce(d.qty,0)req_qty,(coalesce(d.qty,0)-coalesce(SI.issue_qty,0))pending_qty,d.remark
from PUR_STORE_REQ_HDR h,PUR_STORE_REQ_DET d 
LEFT join
(select coalesce(d.qty,0)issue_qty,d.req_uniq,d.req_code
from PUR_TRANS_INGOT_ISSUE_hdr h,PUR_TRANS_INGOT_ISSUE d where h.marked is null and d.marked is null 
and h.issue_code=d.issue_code and req_type='wr') SI ON d.req_code = SI.req_code
where h.marked is null and d.marked is null and h.req_code=d.req_code`;
  
    if (req.query.from && req.query.to) {
      baseQuery += ` AND H.req_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
    }
  
    const invoice = await client.query(baseQuery);
    // console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });
  exports.getPendingIntReqByWeek = wrapper(async (req, res, next) => {
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
    select h.req_code,timestamptostring(h.req_date)  req_date, parse_time_string(h.req_time::VARCHAR) req_time, 
get_department(h.dept_cd)department,get_employee(h.emp_cd)employee,get_item(d.item_code)item,get_uom(d.uom_code)Uom
,get_size(d.size_code)size_nm,get_quality(d.quality_code)grade,get_cost_center(d.cost_code)cost_center, d.no_of_pcs, 
coalesce(d.qty,0)req_qty,(coalesce(d.qty,0)-coalesce(SI.issue_qty,0))pending_qty,d.remark
from PUR_STORE_REQ_HDR h,PUR_STORE_REQ_DET d 
LEFT join
(select coalesce(d.qty,0)issue_qty,d.req_uniq,d.req_code
from PUR_TRANS_INGOT_ISSUE_hdr h,PUR_TRANS_INGOT_ISSUE d where h.marked is null and d.marked is null 
and h.issue_code=d.issue_code and req_type='wr') SI ON d.req_code = SI.req_code
where h.marked is null and d.marked is null and h.req_code=d.req_code
        AND h.req_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;
  
    const invoice = await client.query(query);
  
    // Map result rows to the response format
  
    res.status(200).json({
      status: "success",
      data: {
        invoice: invoice,
      },
    });
  });