# import oracledb
# from config import config
# from dotenv import load_dotenv

# load_dotenv()


# def runQuery(query):
#     connection = None
#     try:
#         params = config()
#         print("Connecting to Oracle database...")
#         connection = oracledb.connect(**params)

#         crsr = connection.cursor()

#         crsr.execute(query)
#         rows = crsr.fetchall()
#         crsr.close()
#         for row in rows:
#             print(row)
#         return rows
#     except (Exception, oracledb.DatabaseError) as error:
#         print(error)
#     finally:
#         if connection is not None:
#             connection.close()
#             print("Database connection terminated.")


# # """
# # import cx_Oracle

# # cx_Oracle.init_oracle_client(lib_dir=r"C:\instantclient_23_4")

# # q = "SELECT INVOICE_NO FROM SL_TRANS_INVOICE_HDR where rownum<10 order by invoice_no"
# # conn = cx_Oracle.connect("iqonlive/iqonlive@108.170.12.154:1521/orclr")
# # crsr = conn.cursor()

# # if conn != None:
# #     print("Successfully Connected")
# #     crsr.execute(q)
# #     rows = crsr.fetchall()
# #     for row in rows:
# #         print(row)
# # else:
# #     print("Something is wrong")

# # conn.commit()
# # conn.close()
# # """





import oracledb
from dotenv import load_dotenv
from configparser import ConfigParser

load_dotenv()

def config(filename="database.ini", section="oracledb"):
    parser = ConfigParser()
    parser.read(filename)
    db = {}
    if parser.has_section(section):
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception(
            "Section{0} is not found in the {1} file".format(section, filename)
        )
    return db

def runQuery(query):
    connection = None
    try:
        params = config()
        print("Connecting to Oracle database...")
        connection = oracledb.connect(**params)

        crsr = connection.cursor()

        crsr.execute(query)
        rows = crsr.fetchall()
        crsr.close()
        for row in rows:
            print(row)
        return rows
    except (Exception, oracledb.DatabaseError) as error:
        print(error)
    finally:
        if connection is not None:
            connection.close()
            print("Database connection terminated.")



