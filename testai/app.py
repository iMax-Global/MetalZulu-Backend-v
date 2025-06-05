

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import requests
import google.generativeai as genai 
from main import get_gemini_response_data
from prompt import get_Prompt, get_sales_prompts, get_purchase_prompts, get_production_prompts,get_finance_prompts,get_stock_prompts
from oracle import runQuery, oracledb
from modify_date import sDate, eDate

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with your own random secret key
# CORS(app, resources={r"/*": {"origins": "http://localhost:3005"}})
CORS(app, resources={r"/*": {"origins": "http://localhost:3005" }}, supports_credentials=True)

# Oracle Database connection details
oracle_user = "chatbotlive"
oracle_password = "chatbotlive"
oracle_dsn = "108.170.12.154:1521/orclr"

user_roles = {
    "Sales Order Processing": ["Sales Order Processing"],
    "Procurement Management": ["Procurement Management"],
    "Production Planning & Control": ["Production Planning & Control"],
    "Finance & Accounting": ["Finance & Accounting"],
    "Inventory Management": ["Inventory Management"],
    "Administrator": ["Sales Order Processing", "Procurement Management", "Production Planning & Control", "Finance & Accounting", "Administrator", "Inventory Management"]
}

def authenticate_user(username, password, module, company_code, unit_code):
    try:
        # Convert company_code and unit_code to integers
        company_code = int(company_code)
        unit_code = int(unit_code)

        with oracledb.connect(
            user=oracle_user, password=oracle_password, dsn=oracle_dsn
        ) as connection:
            with connection.cursor() as cursor:
                  # Using bind variables for safe query execution
                query = '''
                SELECT * FROM SL_SEC_SPEC_ITEM_HDR h, SL_SEC_SPEC_ITEM_DET d
                WHERE h.spec_code = d.spec_cd
                  AND h.SPEC_CODE = :username
                  AND decrypt10g(h.ITEM_CODE) = :password
                  AND D.MODULE = :module
                  AND h.COMPANY_CODE = :company_code
                  AND h.UNIT_CODE = :unit_code
                '''
                    
                # Create the parameters dictionary
                parameters = {
                    "username": username,
                    "password": password,
                    "module": module,
                    "company_code": company_code,
                    "unit_code": unit_code
                }

                # Log the parameters
                print("Executing query with parameters:", parameters)

 # Log the query with the actual parameter values for debugging
                 # Manually format the query for logging
                formatted_query = query.replace(":username", f"'{username}'") \
                                       .replace(":password", f"'{password}'") \
                                       .replace(":module", f"'{module}'") \
                                       .replace(":company_code", str(company_code)) \
                                       .replace(":unit_code", str(unit_code))
                
                print("Executing query:", formatted_query)

                # Execute the query with bind variables
                cursor.execute(query, parameters)

                 # Execute the query with bind variables
                # cursor.execute(query, parameters)

                result = cursor.fetchone()
                print(result, "rrrrrrrrrrrrrrrrrrrr")
                return result
    except oracledb.Error as e:
        print(f"Oracle DB Error: {e}")
        return False
    

keyword_functions = {
    "Sales Order Processing": get_sales_prompts,
    "Procurement Management": get_purchase_prompts,
    "Production Planning & Control": get_production_prompts,
    "Finance & Accounting": get_finance_prompts,
    "Inventory Management": get_stock_prompts
}

def determine_requested_module(query):
    #  module_mapping = {
    #     'sales': 'Sales',
    #     'purchase': 'Procurement Management',
    #     'finance': 'Finance',
    #     'production': 'Production',
    #     'stock' : 'Stock',
    #     'admin': 'Administrator'
    # }
    # Convert query to lowercase for case insensitive matching
     query_lower = query.lower()
     a = find_module(query_lower)
     return a
    
    # Iterate over the keywords and check if they are in the query
    #  for keyword, module in module_mapping.items():
    #     if keyword in query_lower:
    #         return module
  
    #  return None  # Placeholder: Implement your logic here

def has_module_access(user_module, requested_module):
    # print(user_module)
    # print(requested_module, "iiiii")
    # print(user_roles.get(user_module, []))
    # Check if the user's module allows access to the requested module
    return requested_module in user_roles.get(user_module, [])
    





# @app.route("/", methods=["GET"])
# def index_get():
#     return render_template("base.html")


@app.route("/chat", methods=["POST"])
def chatbot_response():
    data = request.get_json()
    user_message = data.get("msg")
    history = []

    try:
        response = request.post(
            "http://localhost:5000/chat",
            json={"prompt": user_message, "history": history},
        )
        response_data = response.json()
        return jsonify({"response": response_data["response"]})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"response": "Sorry, something went wrong. Please try again."})
    



def find_module(question):
    model = genai.GenerativeModel("gemini-1.5-pro")

    instruction = '''
    You are a Chief Business Officer with deep knowledge of different business operations. 
    Classify user queries into one of the following five business modules:

    - Sales Order Processing: Focuses on sales performance, customer orders, item prices, details of items and sales metrics. 
    Queries that mention 'sales', 'customer orders', 'last price', 'items returned', 'revenue from sales', or 'sales trends' are likely related to this module.
    
    - Procurement Management: Deals with purchasing activities, vendor information, and procurement details. 
    Queries mentioning 'purchase orders', 'vendor transactions', 'supplier details', or 'procurement costs' typically belong to this module.
    
    - Production Planning & Control: Involves manufacturing, production quantities, and material usage. 
    Queries that include 'production output', 'manufacturing data', 'material consumption', or 'production efficiency' are usually associated with this module.
    
    - Finance & Accounting: Covers financial transactions, overall revenue, expenses, and balance sheets. 
    Queries mentioning 'financial statements', 'overall revenue', 'expense reports', 'debtors and creditors', or 'balance sheets' are generally within this module.
    
    - Inventory Management: Relates to inventory levels, requisition details, and stock management. 
    Queries about 'inventory levels', 'internal requisitions', 'item stock status', or 'requisition details' likely belong to the Stocks Data module.

    When analyzing the query, consider the specific context in which the keywords are used to determine the correct module. And return only the name of the module.
    '''


    response = model.generate_content([instruction, question])
    module = response.text.strip() 
    print(module)
    return module

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    print(data, "Received Data")

    # Extracting data from the request
    username = data.get("userCode")  # Changed from 'username' to 'userCode'
    password = data.get("password")
    module = data.get("userType")  # Changed from 'module' to 'userType'
    company = data.get("company")  # Changed from 'company_code' to 'company'
    unit_code = data.get("unit")  # If this is not being sent, handle accordingly
    finyear = data.get("finyear")
    startdate = data.get("startDate")
    enddate = data.get("enddate")

    # Store the provided information in the session without authentication
    session['user'] = {
        "spec_code": username,
        "item_code": password,  # Assuming password is used as an item code, change as necessary
        "company_code": company,
        "unit_code": unit_code,  # Provide a default if unit_code is not provided
        "userType": module,
        "finyear": finyear , # Assuming finyear is provided directly
        "startdate":startdate,
        "enddate":enddate,
    }
   
    print("Session set:", session['user'])
    return jsonify({"response": "Login information stored successfully", "user": session['user']})



@app.route("/dataresponse", methods=["POST"])

def data_response():
    data = request.get_json()
    print(data, "chat se aaya h")

    user_info = session.get('user')
  
    print(user_info, "User info in /dataresponse")

    # Extract message and user data from the received JSON
    msg = data.get("msg")
    username = user_info.get('spec_code', 'No username found')
    print(username, 'session se aaya h')
    # Extract individual user fields
    password = user_info.get("item_code")
    
    company_code = user_info.get("company_code")
    unit_code = user_info.get("unit_code")
    user_type = user_info.get("userType")
    finyear = user_info.get("finyear")
    startdate=user_info.get("startdate")
    enddate= user_info.get("enddate")
    # startDate = sDate("16/07/2022")
    # endDate = eDate("15/07/2023")

    # Log extracted data
    print(f"Message: {msg}")
    print(f"Username: {username}")
    print(f"password: {password}")
    print(f"Company Code: {company_code}")
    print(f"Unit Code: {unit_code}")
    print(f"User Type: {user_type}")
    print(f"startdate: {startdate}")
    print(f"enddate: {enddate}")
   
   
    if authenticate_user(username, password, user_type, company_code,unit_code):
        requested_module = determine_requested_module(msg)
        # print(requested_module, "Reqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")

        if requested_module is None:
            return jsonify({"response": "Unable to determine the requested module."})

        if not has_module_access(user_type, requested_module):
            return jsonify({"response": "Access denied. You do not have permission to access this module."})
        
        elif requested_module == "Sales Order Processing":
            prompt = get_sales_prompts(company_code, unit_code, startdate, enddate)
            query_response = get_gemini_response_data(msg, prompt)
            # print(query_response, "rrrrrrrrrrrrrrrrrrrrrr")
            response = runQuery(query_response)
           # print(response,'responnnnnnnnnnnnnnnnnnnse')
            return jsonify({"response": response})
            
        elif requested_module == "Procurement Management":
            prompt = get_purchase_prompts(company_code, unit_code, startdate, enddate)
            query_response = get_gemini_response_data(msg, prompt)
            # # print(query_response)
            response = runQuery(query_response)
            print(response)
            return jsonify({"response": response})
        elif requested_module == "Administrator":
            prompt = get_Prompt()
            query_response = get_gemini_response_data(msg, prompt)
            # # print(query_response)
            response = runQuery(query_response)
            # print(response)
            return jsonify({"response": response})
        elif requested_module == "Production Planning & Control":
            prompt = get_production_prompts(company_code, unit_code, startdate, enddate)
            query_response = get_gemini_response_data(msg, prompt)
            # # print(query_response)
            response = runQuery(query_response)
            # print(response)
            return jsonify({"response": response})
        elif requested_module == "Finance & Accounting":
            prompt = get_finance_prompts(company_code, unit_code, startdate, enddate)
            query_response = get_gemini_response_data(msg, prompt)
            # # print(query_response)
            response = runQuery(query_response)
            # print(response)
            return jsonify({"response": response})
        elif requested_module == "Inventory Management":
            prompt = get_stock_prompts(company_code, unit_code, startdate, enddate)
            print(prompt, "prooooooooooooooooooooooooooooooooo")
            query_response = get_gemini_response_data(msg, prompt)
            # # print(query_response)
            response = runQuery(query_response)
            # print(response)
            return jsonify({"response": response})

        else:
            return jsonify({"response": "Invalid module."})

    #     query_response = get_gemini_response_data(query, prompt)
    #    # print(query_response)
    #     response = runQuery(query_response)
    #     return jsonify({"response": response})
    else:
        return jsonify(
            {"response": "Authentication failed. Invalid credentials or module."}
        )

    # query_response = get_gemini_response_data(query, prompt) b
    #   prompt = get_Prompt()
    #   query_response = get_gemini_response_data(query, prompt)
    #   response = runQuery(query_response)
    #   return jsonify({'response': response})
    # else:
    #   return jsonify({'response': 'Authentication failed. Invalid credentials or module.'})


@app.route("/oracle", methods=["POST"])

def oracle_query():
    try:
        with oracledb.connect(
            user=oracle_user, password=oracle_password, dsn=oracle_dsn
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT INVOICE_NO FROM SL_TRANS_INVOICE_HDR")
                rows = cursor.fetchall()
                invoices = [row[0] for row in rows]
                return jsonify({"invoices": invoices})
    except oracledb.Error as e:
        print(f"Oracle DB Error: {e}")
        return jsonify({"error": "Failed to fetch data from Oracle database."})


if __name__ == "__main__":
    app.run(debug=True)

