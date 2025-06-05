import pandas as pd

purchaseData = pd.read_csv("data/purchasePD.csv")


def calculate_purchase(item_name, grade=None):
    df_filtered = purchaseData.dropna(subset=["ITEM_NAME", "GRADE"]).copy()

    df_filtered.loc[:, "ITEM_NAME"] = df_filtered["ITEM_NAME"].str.lower()
    df_filtered.loc[:, "GRADE"] = df_filtered["GRADE"].str.lower()

    if grade is None:
        df_filtered = df_filtered[df_filtered["ITEM_NAME"] == item_name.lower()]
    else:
        df_filtered = df_filtered[
            (df_filtered["ITEM_NAME"] == item_name.lower())
            & (df_filtered["GRADE"] == grade.lower())
        ]

    total_pending = abs(df_filtered["PO_PENDING"]).sum()

    return total_pending if not df_filtered.empty else 0


print(calculate_purchase("cutting oil", "st"))

# import pandas as pd
# import textdistance
# import re


# # Read the CSV file into a DataFrame
# df = pd.read_csv("poPENDING DATA.csv")

# # Drop null values in `ITEM_NAME` and `GRADE` columns
# df.dropna(subset=["ITEM_NAME", "GRADE"], inplace=True)

# # Preprocess the ITEM_NAME column
# df["ITEM_NAME"] = (
#     df["ITEM_NAME"].astype(str).str.lower().str.replace("white", "", regex=False)
# )
# df["ITEM_NAME"] = df["ITEM_NAME"].astype(str).str.strip()


# # Function to preprocess input text
# def preprocess_input(text):
#     text = text.lower().replace("white", "")
#     # Remove special characters and extra spaces
#     text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
#     text = re.sub(r"\s+", " ", text).strip()
#     return text


# # Function to find the matching item
# def find_matching_item(text, grade):
#     preprocessed_text = preprocess_input(text)
#     grade = grade.lower()  # Standardize grade to lowercase

#     # Calculate Jaro-Winkler distances
#     df["distance"] = df.apply(
#         lambda row: textdistance.jaro_winkler(preprocessed_text, row["ITEM_NAME"]),
#         axis=1,
#     )

#     # Filter by grade if provided, else consider all grades
#     if grade:
#         filtered_df = df[df["GRADE"].astype(str).str.lower() == grade]
#     else:
#         filtered_df = df

#     if not filtered_df.empty:
#         closest_match = filtered_df.loc[filtered_df["distance"].idxmax()]
#         return closest_match["ITEM_NAME"], closest_match["PO_PENDING"]
#     else:
#         return "No match found"


# # Example usage
# input_text = "welding glass"  # Corrected input
# input_grade = "st"

# result = find_matching_item(input_text, input_grade)
# print(result)
