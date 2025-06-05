import os
import psycopg2
import google.generativeai as genai
from config import config
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def get_gemini_response(question, prompt):
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content([prompt[0], question])
    return response.text


def connectDB(query):
    connection = None
    try:
        params = config()
        print("Connecting to PostgreSQL database...")
        connection = psycopg2.connect(**params)

        crsr = connection.cursor()
        print("PostgreSQL database version: ")
        crsr.execute("Select Version()")
        db_version = crsr.fetchone()
        print(db_version)
        crsr.execute(query)
        rows = crsr.fetchall()
        crsr.close()
        for row in rows:
            print(row)
        return rows
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if connection is not None:
            connection.close()
            print("Database connection terminated.")


prompt = [
    """
    You are an expert in converting English questions to SQL query!
    The SQL database has the name SKDATA and has the following columns - BOOKING_CODE, ITEM_NAME, 
    SIZE_NAME, GRADE, QUANTITY, BOOKING_RATE, TOTAL_ITEM_AMOUNT \n\nFor example,\nExample 1 - What is the rate of Binding Wire?, 
    the SQL command will be something like this SELECT BOOKING_RATE FROM SKDATA WHERE ITEM_NAME='Binding Wire';
    \nExample 2 - Tell me the maximum, minimum and average rate of wire nails., 
    the SQL command will be something like this SELECT MAX(BOOKING_RATE), MIN(BOOKING_RATE), AVG(BOOKING_RATE) FROM SKDATA WHERE ITEM_NAME='Wire Nails';
    \nExmaple 3 - Tell me size of binding wire and Gabion.,
    the SQL command will be something like this SELECT SIZE_NAME FROM SKDATA WHERE ITEM_NAME IN ('Binding Wire', 'GABION');
    \nExample 4 - How many distinct items are there.,
    the SQL command will be something like this SELECT COUNT(DISTINCT ITEM_NAME) FROM SKDATA;
    \nExample 5 - Give items with size where rate is in between 100-200.,
    the SQL command will be something like this SELECT ITEM_NAME, SIZE_NAME FROM SKDATA WHERE booking_rate BETWEEN 100 AND 200;

    also the sql code should not have ``` in beginning or end and sql word in output

    """
]

if __name__ == "__main__":
    isContinue = True
    while isContinue:
        query = input("Enter your query: ")
        response = get_gemini_response(query, prompt)
        response = connectDB(response)
        decision = input("Do you want to continue (y/n): ")
        if decision == "y" or decision == "Y":
            isContinue = True
        else:
            isContinue = False
    print("Program is terminated.")


# prompt = [
#     """
#     You are an expert in converting English questions to SQL query!
#     The SQL database has two tables named sl_trans_invoice_hdr and sl_trans_inv_size_detail
#     You have to return relevent quries on the basis of question.
#     \n\nFor example,\nExample 1 - What were the total sales for the last month?,
#     the SQL command will be something like this SELECT SUM(d.amount) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM')
#     \nExample 2 - Can you provide a details of sales by product for the last month?
#     the SQL command will be something like this SELECT SUM(d.amount) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and d.item_code in (select item_code from sl_mst_item where item_category = 12) and h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date &lt; TRUNC(SYSDATE, 'MM')
#     Example 3 - Can you provide a details of sales by product for the last day?
#     the SQL command will be something like this SELECT SUM(d.amount) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and d.item_code in (select item_code from sl_mst_item where item_category = 12) and h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'DD') AND h.invoice_date &lt; TRUNC(SYSDATE, 'DD')
#     \nExample 4 - How did sales last month compare to the same month last year?
#     the SQL command will be something like this SELECT SUM(CASE WHEN h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM') THEN SUM(nvl(d.amount,0)) ELSE 0 END) AS sales_last_month, SUM(CASE WHEN h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -13), 'MM') AND h.invoice_date < TRUNC(ADD_MONTHS(SYSDATE, -12), 'MM') THEN SUM(nvl(d.amount,0)) ELSE 0 END) AS sales_same_month_last_year FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no group by h.invoice_date
#     \nExample 5 - Who were the top 10 customers by sales volume last month?
#     the SQL command will be something like this SELECT h.DISTRIBUTOR_CODE, get_distributor(h.DISTRIBUTOR_CODE)cutomer_name, SUM(nvl(d.amount,0)) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM') GROUP BY h.DISTRIBUTOR_CODE ORDER BY total_sales DESC rownum<10 order by h.DISTRIBUTOR_CODE

#     also the sql code should not have ``` in beginning or end and sql word in output
#     """
# ]


# oldPrompt = [
#     """
#     You are an expert in converting English questions to SQL query for Oracle Database!

#     \nThe SQL database has table named V_SALE_ORDER1 and V_SALES_INVOICE and has the following columns - BOOKING_CODE, BROKER_CODE, SO_DATE, SO_NO, CUSTOMER_NAME, CUSTOMER_CODE, DEALER_NAME,
#     DEALER_CODE, DELIVERY_ADD, DELIVERY_CODE, FREIGHT_TYPE, EMPLOYEE_NAME, EMPLOYEE_CODE, TOLERANCE, ITEM_NAME, ITEM_CODE, UOM_CODE, UOM_NAME, SIZE_NAME, SIZE_CODE, GRADE_NAME, GRADE_CODE, ORDER_RATE,
#     ORDER_QTY, INVOICE_QTY, BALANCE_QTY, (ORDER_RATE*ORDER_QTY) ORDER_AMOUNT, (ORDER_RATE*INVOICE_QTY) INVOICE_AMOUNT, BOOKING_STATUS, GRN_NO, INVOICE_DATE, CUSTOMER_NAME, CUSTOMER_CODE, DEALER_CODE, DEALER_NAME, TRANSPORTER_CODE, TRANSPORTER_NAME, INV_TYPE_CD, INV_TYPE, GR_DATE, GR_NO, BOOKING_DATE, BOOKING_NO, ITEM_CODE, ITEM_NAME, UOM_CODE, UOM_NAME, QTY,
#     INVOICE_RATE, EWAY_BILL, EWAY_BILL_DATE, BILL_GSTNO, FREIGHT_WEIGHT, AMOUNT, BILL_ADDRESS, SHIP_TO_GST, SHIP_TO_ADD,STATE, HSN_NO, TOTAL_AMOUNT, SIZE_CODE, SIZE_NAME, GRADE_ODE, GRADE
#     where "BOOKING_CODE" is  a unique id  , "BROKER_CODE" is a id for every broker, "S0_DATE" is sales order date, "CUSTOMER_NAME" is a name of a customer, "DEALER_NAME" is a name of a dealer,
#     "DEALER_CODE" is a id number of dealer, "DELIVERY_ADD" is a delivery address, "DELIVERY_CODE" is unique code for delivery, "FREIGHT_TYPE" is a rent for delivery, "EMPLOYEE_NAME" is the name of the employee,
#     "EMPLOYEE_CODE" is a unique id of every employee, "TOLERANCE" is that there is something more or less in the product, "ITEM_NAME" is the name of the item, "ITEM_CODE" is the unique code of a item,
#     "UOM_CODE" is the code for unit of measurement, "UOM_NAME" is the name for unit of measurement, "SIZE_NAME" is the size of the product, "SIZE_CODE" is a unique code for every size, "GRADE_NAME" is a grading name, "GRADE_CODE" is a unique code for every grading,
#     "ORDER_RATE" is the price rate for the product, "ORDER_QTY" is the quantity of the product, "INVOICE_QTY" is the quantity of the invoice, "BALANCE_QTY" is the number of pending order, "ORDER_AMOUNT" is the multiplication of "ORDER_RATE" and "ORDER_QTY", "INVOICE_AMOUNT" is the multiplication of "ORDER_RATE" and "INVOICE_QTY",
#     "INVOICE_AMOUNT" is the total amount of price, "BOOKING_STATUS" is the status of order that whether the order is completed or pending,
#     And there is an another table also which is relevant to V_SALE_ORDER1 that is V_SALES_INVOICE and there is foreign key that is "BOOKING_CODE" between these two table.
#     \n\nFor example,\nExample 1 - What were the total sales between 12/6/2023 and 15/6/2023,
#     the SQL command will be something like this SELECT SUM(ORDER_RATE*ORDER_QTY) FROM V_SALE_ORDER1 WHERE SO_DATE >= '12-JUN-2023' AND SO_DATE < '15-JUN-2023'
#     \nExample 2 - Can you provide a details of sales by product for the last month?,
#     the SQL command will be something like this SELECT ITEM_NAME, ITEM_CODE, SUM(ORDER_QTY), SUM(INVOICE_QTY), SUM((ORDER_RATE*ORDER_QTY)), SUM((ORDER_RATE*INVOICE_QTY)) FROM  V_SALE_ORDER1 WHERE  SO_DATE >= ADD_MONTHS(SYSDATE, -1) AND SO_DATE < SYSDATE GROUP BY ITEM_NAME, ITEM_CODE ORDER BY ITEM_NAME
#     \nExample 3 - How did sales last month compare to the same month last year?,
#     the SQL command will be something like this SELECT SUM(CASE WHEN h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM') THEN SUM(nvl(d.amount,0)) ELSE 0 END) AS sales_last_month, SUM(CASE WHEN h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -13), 'MM') AND h.invoice_date < TRUNC(ADD_MONTHS(SYSDATE, -12), 'MM') THEN SUM(nvl(d.amount,0)) ELSE 0 END) AS sales_same_month_last_year FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no group by h.invoice_date
#     \nExample 4 - Who were the top 10 customers by sales volume last month?,
#     the SQL command will be something like this SELECT h.DISTRIBUTOR_CODE, get_distributor(h.DISTRIBUTOR_CODE)cutomer_name, SUM(nvl(d.amount,0)) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and  h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM') GROUP BY h.DISTRIBUTOR_CODE ORDER BY total_sales DESC FETCH FIRST 10 ROWS ONLY
#     \nExample 5 - Which products had the highest turnover last month?,
#     the SQL command will be something like this SELECT get_item(d.item_code)item_name, SUM(nvl(d.amount,0)) AS total_sales FROM sl_trans_invoice_hdr h, sl_trans_inv_size_detail d WHERE h.marked is null and d.marked is null and h.invoice_no=d.invoice_no and h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND  h.invoice_date < TRUNC(SYSDATE, 'MM') GROUP BY d.item_code ORDER BY total_sales DESC FETCH FIRST 10 ROWS ONLY
#     \nExample 6 - How many orders are pending for delivery?,
#     the SQL command will be something like this select COUNT(*) from sl_trans_booking_hdr h, sl_trans_booking_size_detail d where h.booking_code=d.booking_code and h.marked is null and d.marked is null and h.booking_status is null and h.booking_code not in (select booking_no from sl_trans_invoice_hdr where marked is null)
#     \nExample 7 - Last price of an Item.,
#     the SQL command will be something like this SELECT item_name, booking_rate AS last_price FROM (SELECT get_item(item_code)item_name, booking_rate, ROW_NUMBER() OVER (PARTITION BY get_item(item_code) ORDER BY inv_date DESC) AS rn FROM sl_trans_inv_size_detail) WHERE rn = 1
#     \nExample 8 - Which sales City performed the best and worst last month?,
#     the SQL command will be something like this SELECT CITY_CODE, CITY_NAME from sl_mst_city and MAX(ORDER_QTY), MIN(ORDER_QTY) from V_SALE_ORDER1 and select DISTRIBUTOR_CODE, h.invoice_date >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND h.invoice_date < TRUNC(SYSDATE, 'MM') GROUP BY h.DISTRIBUTOR_CODE ORDER BY total_sales FROM sl_trans_inv_size_detail
#     \nExample 9 - Which customers have not made a purchase in the last month but did in previous months?,
#     the SQL command will be something like this SELECT CUSTOMER_CODE, CUSTOMER_NAME, SUM(ORDER_QTY) AS TOTAL_SALES FROM V_SALES_ORDER1 WHERE SO_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND SO_DATE < TRUNC(SYSDATE, 'MM') GROUP BY CUSTOMER_CODE, CUSTOMER_NAME ORDER BY TOTAL_SALES DESC;


#     \n\n\nThis is the 2nd module from where questions can be asked, this module is about Purchase Data and it have various tables which are labeled here.
#     \nThe first table named V_PURCHASE_ORDER and has the following columns - PO_LOCATION, PO_DATE, PO_REF_NO, DEAL_TYPE_CODE, DEAL_TYPE, UOM_CODE, UOM_NAME,
#     CURRENCY_CD, CURRENCY, PARTY_CODE, PARTY_NAME, ITEM_CODE, ITEM_NAME, PO_TYPE_CD, PO_TYPE, RATE, DISCOUNT, GRADE_CODE, GRADE, PAYMENT_DAYS, AMOUNT, PO_CODE,
#     CURRENCY_RATE, SIZE_CODE, SIZE_NAME, TOTAL_QTY, MRIR_QTY, PENDING_PO_QTY, (RATE*TOTAL_QTY)PO_AMOUNT, (RATE*MRIR_QTY)MRIR_AMOUNT

#     \nIn purchase, raw material info can be asked, for which the data comes from three tables, the other two tables are sl_mst_item_category and sl_mst_item
#     Table sl_mst_item_category has the following columns - ITEM_CATEGORY_CODE, ITEM_CATEGORY, MARKED here Primary key is "ITEM_CATEGORY_CODE"
#     Table sl_mst_item has the following columns - ITEM_CODE, ITEM_NAME, ITEM_UOM, ITEM_CATEGORY, MARKED here Primary key is "ITEM_CODE"

#     \nIn purchase, purchase indent info can also be asked, for which the data comes from PUR_RM_REQUISITION_HDR and PUR_RM_REQUISITION_DET table.
#     PUR_RM_REQUISITION_HDR has the following columns - AUTH_STATUS, Rq_CODE, REF_NO, REQUIREMENT_DATE, REQUESTER_CODE, RQ_CODE, MARKED
#     PUR_RM_REQUISITION_DET has the following columns - ITEM_CODE, UOM_CODE, SIZE_CODE, QUALITY_CODE, QTY, RQ_CODE, MARKED

#     \n\nFor example,\nExample 1 - What was the total purchase between 12/06/2023 and 30/06/2023?,
#     the SQL command will be something like this SELECT SUM(RATE*TOTAL_QTY) FROM V_PURCHASE_ORDER WHERE PO_DATE >= '12-JUN-2023' AND PO_DATE < '30-JUN-2023'
#     \nExample 2 - What was the total purchase for last month?,
#     the SQL command will be something like this SELECT SUM(RATE * TOTAL_QTY) FROM V_PURCHASE_ORDER WHERE PO_DATE >= ADD_MONTHS(SYSDATE, -1) AND PO_DATE < SYSDATE
#     \nExample 3 - Total Raw material purchased between 12/06/2023 and 20/06/2023?,
#     the SQL command will be something like this SELECT SUM(TOTAL_QTY) FROM V_PURCHASE_ORDER WHERE PO_DATE >= '12-JUN-2023' AND PO_DATE < '20-JUN-2023'
#     \nExample 4 - Give info about top 5 venders?,
#     the SQL command will be something like this SELECT PARTY_CODE, PARTY_NAME, SUM(nvl(AMOUNT,0)) AS total_sales FROM V_PURCHASE_ORDER WHERE  PO_DATE >= ADD_MONTHS(SYSDATE, -1)
#     AND PO_DATE < SYSDATE GROUP BY PARTY_CODE, PARTY_NAME ORDER BY total_sales DESC FETCH FIRST 5 ROWS ONLY
#     \nExample 5 - Give info about Raw material purchased,
#     the SQL command will be something like this SELECT IT.item_code, IT.item_name, VPO.size_code, VPO.TOTAL_QTY FROM sl_mst_item_category IC JOIN sl_mst_item IT ON IC.ITEM_CATEGORY_CODE = IT.item_catEGORY
#     JOIN V_purchase_order VPO ON IT.item_code = VPO.item_code WHERE UPPER(IC.item_category) = UPPER('Raw Material') AND IC.marked IS NULL AND IT.MARKED IS NULL
#     \nExample 6 - Give info about purchase indent,
#     the SQL command will be something like that SELECT h.AUTH_STATUS, h.Rq_CODE, h.ref_no, h.REQUIREMENT_DATE, h.REQUESTER_CODE, GET_EMPLOYEE (h.REQUESTER_CODE) REQUESTER_NAME, K.item_code, GET_ITEM (K.item_code) ITEM,
#     k.UOM_CODE, GET_UOM (k.UOM_CODE) UOM, k.SIZE_CODE, GET_SIZE (k.SIZE_CODE) SIZE_NM, k.QUALITY_CODE, GET_QUALITY (k.QUALITY_CODE) GRADE, K.QTY FROM PUR_RM_REQUISITION_HDR h, PUR_RM_REQUISITION_det k WHERE h.rq_code = k.RQ_CODE
#     AND k.marked IS NULL AND h.marked IS NULL;


#     \n\n\nThis is the 3rd module from where questions can be asked, this module is about Production Data and Consumption Data and it have various tables which are labeled here.
#     \n\nThe first table is for Rolling Production named V_ROLLING_PROD and has the following columns STOCK_DATE, SSH_CODE, ITEM_CODE, ITEM_NAME, SIZE_CODE, SIZE_NAME, GRADE_CODE, GRADE, QTY
#     \nExample 1 - Which grade of Barbed Wires is used in rolling production?,
#     the SQL command will be something like this SELECT DISTINCT GRADE FROM V_ROLLING_PROD WHERE ITEM_NAME = 'Barbed Wires'

#     \n\nThe Second table is for Rolling Consumption named V_ROLLING_CONS and has the following columns STOCK_DATE, SSH_CODE, ITEM_CODE, ITEM_NAME, SIZE_CODE, SIZE_NAME, GRADE_CODE, GRADE, QTY

#     \n\nTHe Third table is for Electricity Consumption, it has data linked with two tables PUR_MST_METER and T_ELECTRICITY_CONS_DET
#     PUR_MST_METER has columns METER_CODE, METER_NO, MARKED, TIME
#     T_ELECTRICITY_CONS_DET has columns METER_CODE, METER_NO, MARKED, TOTAL_CONSUMPATION, MULTPLCATION_FAT, READING, TIME, CONS_ID
#     \nExample 1 - Give total electricity consumption for last month,
#     he SQL command will be something like this SELECT SUM(TOTAL_CONSUMPATION) FROM T_ELECTRICITY_CONS_DET WHERE TRUNC(TIME) >= ADD_MONTHS(SYSDATE, -1) AND TRUNC(TIME)< SYSDATE
#     \nExample 2 - Give info about electricity consumption,
#     the SQL command will be something like this SELECT D.METER_CODE,(select METER_NO FROM PUR_MST_METER where PUR_MST_METER.METER_CODE =D.METER_CODE and marked is null)METER_DESC,d.CONS_ID ssh_code, d.TOTAL_CONSUMPATION--,(D.MULTPLCATION_FAT)kwh FROM T_ELECTRICITY_CONS_DET D WHERE  D.MARKED IS NULL

#     \n\n The Fourth table is for Breakdown Feeding named V_BREAK_DOWN and has the following columns FROM_TIME, TO_TIME, REASON_CODE, RESON, BREAK_DOWN_CD, NO_OF_HRS, LOCATION_CODE, LOCATION,
#     BK_DOWN_DATE, REMARKS, DESCRIPTION, TYPE_CODE, BREAK_DOWN_TYP, SOLUTION
#     where 'RESON' is specified for Reason

#     \n\n The Fifth table is for Furnace Production named V_FURNACE_PROD and has the following columns PRODUCTION_DATE, PRODUCTION_CODE, REF_CODE, ITEM_CODE, ITEM_NAME, SIZE_CODE, SIZE_NAME, GRADE_CODE, GRADE, QTY

#     \n\n The Sixth table is for Furnace Consumption named V_FURNACE_CONS and has the following columns PRODUCTION_DATE, PRODUCTION_CODE, REF_CODE, ITEM_CODE, ITEM_NAME, SIZE_CODE, SIZE_NAME, GRADE_CODE, GRADE, QTY


#     \n\n\nThis is the 4th module from where questions can be asked, this module is about Finance Data and it have various tables which are labeled here.
#     \nThe first table is FIN_MST_T_VOUCHER_HDR it is the header for finance transactions voucher data and has the following columns VOUCHER_CODE, VOUCHER_TYPE, VOUCHER_DATE, NARRATION, AMOUNT, VOUCHER_POSTED, REF_DOUCMENT_TYPE,
#     REF_DOCUMENT_CODE, CHEQUE_AMT, CHEQUE_NO, CHEQUE_DATE, BANK_NAME, HDR_REVERSE, DAY_ENDING, COMPANY_CODE, USER_CODE, UNIT_CODE, TIME, SEND_STATUS, SYNCHRONISED, EFFECT, MARKED, VOUCHER_YEAR, BUDGET_CODE, CASH_CODE,
#     ACCOUNT_CODEH, INV_YN, REF_ACC, STATUS, BILLING_CO_CD, COMMSSION, ADVANCE, OLD_ACCOUNT, REV_TYPE, OLD_VOUCHER, D_C, ME_STATUS, TAG1, SPLT, VOU_PAID_AMT, ACTUAL_VOUCHER_CODE, INVOICE_CODE, WEIGHT, PAYMENT_CODE, NO_DAYS,
#     ACCOUNT_CODE, ACTUAL_VOUCHER_CODE1, FROM_DATE, TO_DATE, DR, CR, AMMEND_NO, ACTUAL_AMOUNT, W_STATUS, RECONCILE_YN, RUSE, AUDIT_TRIAL, NET_AMT_IN_DEAL_CURRENCY, CURRENCY_CD, DEAL_DIFF_CODE, BANK_DT, COMPANY_TYPE,
#     REF_ACCOUNT, REF_MRIR_TYPE, REF_MRIR, ACTUAL_NAME, VAT_ADJUST_CODE, ADJUSTMENT, VAT_TAXCLASS_CODE, ASSESSABLE, DUTY_CODE, AUTOFILL, F_DATE, T_DATE, SERVICE_CATEGORY, E_UNIT_NAME, DEDUCTED_T_DATE, SECTION, NATURE_OF_PAYMENT,
#     DEDUCTEE_STATUS, FROM_DATE1, TO_DATE1, BSR_CODE, VAT_SUBTYPE, TAX_PERC, INTEREST_DATE, CHALLAN_NO, QUAT_CODE, CHALLAN_DATE, PAY_CODE, CHEQUE_FAVOUR, REF_VOUCHER_CODE, STORE_CD, TAGGING_REQ, BILL_DATE, ENTITY_CODE,
#     ENTITY_ACC_CODE, ACCOUNT_CODE_CR, CHK, ENTITY_CODE2, TYPE_INVOICE, CLOSING_CODE, UNIQUE_ID1, MRIR_CODE, MANUAL, VOUCHER_TY, CUR_TYPE, CUR_RATE, BILL_BILL_NO, BILL_BILL_DATE, TAX_INV, VOUCHER_EXIST, PAY_FOR, OTHER_TYPE, HA, REMARK, INVOICE, ENTRY_INFO

#     \nThe second table is FIN_MST_T_VOUCHER_DET it is the detailed table which has details of finance transactions voucher data and has the following columns VOUCHER_CODE, UNIQUE_ID, ENTRY_TYPE, SUBLEDGER_CODE, AMOUNT, LINE_NUMBER, CHEQUE_NUMBER, CHEQUE_YN,
#     DET_REVERSE, DAY_ENDING, COMPANY_CODE, USER_CODE, UNIT_CODE, TIME, SEND_STATUS, SYNCHRONISED, EFFECT, MARKED, ACCOUNT_CODE, BUDGET_CODE, CASH_CODE, DEPARTMENT_CODE, COST_CODE, SUBDEALER_CODE, STATUS, BILLING_CO_CD, OLD_ACCOUNT,  INV_PAID_AMT,
#     AMOUNT1, AMOUNT2, ACTUAL_VOUCHER_CODE, PARENT_GROUP, AMEND_NO, SECTION_CODE, SECTION_DESC, NET_AMT_IN_DEAL_CURRENCY, NO_DAYS, ACTUAL_NAME, VREF_CODE, MRIR_CODE, V_CODE, PAYMENT_CODE, INTEREST_ID, OTHERS_ID, CHK, ACCOUNT_CODE2, ENTITY_CODE2,
#     ENTITY_CODE, TYPE_INVOICE, DEALER_CODE, BOOKING_INVOICE_CD, VOUCHER_TYPE, UNIQUE_ID2, INVOICE_CODE, CURRENCY, CUR_AMT, CUR_RATE, EXTERNAL_ENTITY_CODE, PUR_DEALER, REC_TYPE, HA


#     also the sql code should not have ``` and ; in beginning or end and sql word in output
#     Do not end the SQL query with ;
#     """
# ]
