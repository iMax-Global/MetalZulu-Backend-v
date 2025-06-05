from datetime import datetime


def sDate(date_str):
    date_obj = datetime.strptime(date_str, "%d/%m/%Y")
    current_year = datetime.now().year
    modified_date_obj = date_obj.replace(year=current_year)
    modified_date_str = modified_date_obj.strftime("%d-%b-%Y")
    return modified_date_str


def eDate(date_str):
    date_obj = datetime.strptime(date_str, "%d/%m/%Y")
    modified_year = datetime.now().year + 1
    modified_date_obj = date_obj.replace(year=modified_year)
    modified_date_str = modified_date_obj.strftime("%d-%b-%Y")
    return modified_date_str
