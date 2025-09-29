import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")
# Using the API URL you confirmed is working.
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={API_KEY}"

app = Flask(__name__)
CORS(app)

# UPDATED: This is a much more robust prompt to ensure correct node types.
SYSTEM_PROMPT = """
You are an intelligent flowchart editor. Your primary goal is to help a user create and modify a flowchart by generating a specific JSON structure for the react-flow library. Accuracy is critical.

**Your Most Important Rule: Correctly Identifying Node Types**
- You MUST analyze the user's language for conditional logic.
- Phrases like "if", "check if", "validate", "depending on", or any question that results in two or more paths (e.g., Yes/No, True/False, Success/Fail) MUST be created as a node with `type: 'condition'`.
- A `condition` node is the ONLY node type that can have more than one outgoing edge.
- All other procedural steps ("Show Dashboard", "Redirect to Login", "End Process") MUST be `type: 'default'`, `type: 'input'`, or `type: 'output'`.

**Your Core Task**
- If the user provides an empty flowchart, you will generate a new one based on their description.
- If the user provides an existing flowchart and an instruction, you will modify the JSON to reflect their request.
- Always return the **complete, updated JSON** for the entire flowchart.

**Interaction Rules**
1.  **Handle Vague Input**: If a prompt is a simple greeting ("hello") or is too vague, respond conversationally with this exact JSON: `{"requires_clarification": true, "message": "Hello! I can help you create or edit a flowchart. Please describe the process or the changes you'd like to make."}`

2.  **Handle Flowchart Requests (Generate or Edit)**:
    - You will be given the user's text instruction and the current state of the flowchart.
    - **Output Format**: Your response MUST be a single, valid JSON object containing the complete "nodes" and "edges" arrays for the *entire* flowchart. Do not add explanations or markdown.

**Example of a Perfect Response**
- User Input: "Check if a user is logged in. If they are, show the dashboard. If not, show the login page."
- Your JSON Output:
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
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY environment variable not set."}), 500

    data = request.get_json()
    user_prompt = data.get('description')
    current_nodes = data.get('nodes', [])
    current_edges = data.get('edges', [])
    
    if not user_prompt:
        return jsonify({"error": "No description provided."}), 400

    headers = {"Content-Type": "application/json"}

    current_flowchart_state = json.dumps({"nodes": current_nodes, "edges": current_edges}, indent=2)
    
    # We construct a detailed prompt for the AI, including the current state
    full_prompt = (
        f"The user wants to modify the following flowchart:\n{current_flowchart_state}\n\n"
        f"User's instruction: '{user_prompt}'\n\n"
        "Analyze the instruction and the current state, then provide the complete and updated JSON for the new state of the flowchart. Strictly follow all rules from the system prompt."
    )
    
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        response = requests.post(API_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        
        result = response.json()
        
        generated_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
        
        if generated_text.strip().startswith("```json"):
            generated_text = generated_text.strip()[7:-3].strip()
        
        flowchart_json = json.loads(generated_text)

        if "nodes" not in flowchart_json and "edges" not in flowchart_json and "requires_clarification" not in flowchart_json:
             return jsonify({"error": "Invalid JSON structure received from AI."}), 500

        return jsonify(flowchart_json)

    except requests.exceptions.RequestException as e:
        error_message = f"API request failed: {e}"
        if e.response:
            error_message = f"API request failed: {e.response.status_code} {e.response.reason} for url: {e.request.url}"
        return jsonify({"error": error_message}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to decode JSON from AI response.", "raw_response": generated_text}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)