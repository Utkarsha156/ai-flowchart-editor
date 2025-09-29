import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

# It's highly recommended to set your API key as an environment variable
# For local testing, you can uncomment the line below and replace "YOUR_GEMINI_API_KEY"
# os.environ['GEMINI_API_KEY'] = "YOUR_GEMINI_API_KEY"

API_KEY = os.environ.get("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={API_KEY}"

app = Flask(__name__)
CORS(app)  # This will allow your React frontend to communicate with the backend

# This is the crucial part: the instructions for the AI model.
# It tells the model exactly how to behave and what format to output.
SYSTEM_PROMPT = """
You are an expert flowchart generator. Your task is to take a user's description of a process and convert it into a structured JSON format that can be used by the react-flow library.

You MUST follow these rules:
1.  Your entire response MUST be a single JSON object. Do not include any text, explanations, or markdown formatting before or after the JSON object.
2.  The JSON object must have two keys: "nodes" and "edges".
3.  The "nodes" value must be an array of node objects.
4.  Each node object must have:
    - `id`: A unique string identifier (e.g., "1", "2").
    - `data`: An object with a `label` key containing the text for the block.
    - `position`: An object with `x` and `y` coordinates. Arrange the nodes in a logical top-to-bottom flow.
    - `type`: Use 'default' for a rectangular step block. Use 'condition' for a diamond-shaped condition block. The first node should often be an 'input' type (which renders as a rounded rectangle).
5.  The "edges" value must be an array of edge objects.
6.  Each edge object must have:
    - `id`: A unique string identifier for the edge (e.g., "e1-2").
    - `source`: The `id` of the starting node.
    - `target`: The `id` of the ending node.
    - `label` (optional): Use this for edges coming from a condition node, for example, "Yes" or "No".

Example Input: "Check if a user is logged in. If they are, show the dashboard. If not, show the login page."

Example JSON Output:
{
  "nodes": [
    { "id": "1", "type": "input", "data": { "label": "Start" }, "position": { "x": 250, "y": 25 } },
    { "id": "2", "type": "condition", "data": { "label": "User Logged In?" }, "position": { "x": 250, "y": 125 } },
    { "id": "3", "type": "default", "data": { "label": "Show Dashboard" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "default", "data": { "label": "Show Login Page" }, "position": { "x": 400, "y": 250 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" },
    { "id": "e2-3", "source": "2", "target": "3", "label": "Yes" },
    { "id": "e2-4", "source": "2", "target": "4", "label": "No" }
  ]
}
"""

@app.route('/generate-flowchart', methods=['POST'])
def generate_flowchart():
    """
    Receives a text description and uses Gemini to generate flowchart JSON.
    """
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY environment variable not set. Check your .env file."}), 500

    data = request.get_json()
    user_prompt = data.get('description')

    if not user_prompt:
        return jsonify({"error": "No description provided."}), 400

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "responseMimeType": "application/json",
        }
    }

    try:
        response = requests.post(API_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        result = response.json()
        
        # Extract the JSON text from the response
        generated_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
        
        # The AI might still wrap the JSON in markdown, so we clean it
        if generated_text.strip().startswith("```json"):
            generated_text = generated_text.strip()[7:-3].strip()

        flowchart_json = json.loads(generated_text)

        # Basic validation to ensure the response has the expected keys
        if "nodes" not in flowchart_json or "edges" not in flowchart_json:
             return jsonify({"error": "Invalid JSON structure received from AI."}), 500

        return jsonify(flowchart_json)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"API request failed: {e}"}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to decode JSON from AI response.", "raw_response": generated_text}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

if __name__ == '__main__':
    # Use port 5001 to avoid conflicts with React's default port 3000
    app.run(host='0.0.0.0', port=5001, debug=True)


