import os
from oracle import runQuery
from prompt import get_Prompt
import google.generativeai as genai 
import warnings

warnings.filterwarnings("ignore")

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def get_gemini_response_data(question, prompt):
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content([prompt[0], question])
    print(response.text,'aaaaaaaaaaaaaaaaaaaaa')
    return response.text


prompt = get_Prompt()

if __name__ == "__main__":
    query = "Give total electricity consumption for last month"
    response = get_gemini_response_data(query, prompt)
    response = runQuery(response)
