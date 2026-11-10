import os
import sys
import json
import re
import subprocess
import requests

# Set terminal colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_ai(text):
    print(f"{Colors.CYAN}Nova Code:{Colors.ENDC}\n{text}")

def print_sys(text):
    print(f"{Colors.WARNING}System:{Colors.ENDC} {text}")

def print_tool(text):
    print(f"{Colors.GREEN}[Action executed]{Colors.ENDC} {text}")

# Load .env
env_path = os.path.join(os.path.dirname(__file__), ".env")
GROQ_API_KEY = None
GROQ_MODEL = "llama-3.3-70b-versatile"

if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GROQ_API_KEY="):
                GROQ_API_KEY = line.strip().split("=", 1)[1]
            elif line.startswith("GROQ_MODEL="):
                val = line.strip().split("=", 1)[1]
                if "70b" in val or "versatile" in val:
                    GROQ_MODEL = val

if not GROQ_API_KEY:
    print_sys("Error: GROQ_API_KEY not found in .env file. Please add it.")
    sys.exit(1)

SYSTEM_PROMPT = """You are Free Nova Code, a powerful, autonomous AI coding assistant running in a Windows terminal.
You have the ability to read files, write files, and execute shell commands to solve the user's request.

You MUST use the following XML tags to perform actions:

1. READ A FILE:
<read_file>path/to/file.py</read_file>

2. WRITE OR OVERWRITE A FILE:
<write_file path="path/to/file.py">
content of the file here
</write_file>

3. EXECUTE A COMMAND:
<execute_command>dir</execute_command>

Rules:
- You must ONLY use the exact XML tags specified above.
- Whenever you need information about the codebase, use <execute_command>dir</execute_command> or <read_file>.
- Do not ask for permission to read or list files. Just do it.
- Before answering, you must ALWAYS think in <thought> tags.
- When writing a file, you must provide the FULL file content in the <write_file> tag. Do not use placeholders.
- Only do ONE action per message. The system will execute the action and return the result to you in the next message.
- If you use a tool, DO NOT write conversational text outside the thought or tool tags.
- Once you have completely finished the user's request, provide a final conversational response without any tool tags.
"""

def extract_xml_tag(text, tag):
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None

def extract_write_file(text):
    pattern = r'<write_file\s+path="([^"]+)">\s*(.*?)\s*</write_file>'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip(), match.group(2)
    return None, None

def call_groq(messages):
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": GROQ_MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
        "temperature": 0.2
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        res_text = response.text if 'response' in locals() and hasattr(response, 'text') else ""
        return f"Error communicating with Groq API: {e}\nResponse: {res_text}"

def main():
    os.system("color")
    print_sys(f"Free Nova Code Started. (Model: {GROQ_MODEL})")
    print_sys("Type your coding request below. Type 'exit' or 'quit' to close.")
    print("-" * 50)
    
    messages = []
    
    while True:
        try:
            user_input = input(f"{Colors.BOLD}You:{Colors.ENDC} ")
            if user_input.lower() in ["exit", "quit"]:
                break
            if not user_input.strip():
                continue
                
            messages.append({"role": "user", "content": user_input})
            
            # Agent Loop
            while True:
                response = call_groq(messages)
                messages.append({"role": "assistant", "content": response})
                
                # Check for tools
                read_file_path = extract_xml_tag(response, "read_file")
                cmd = extract_xml_tag(response, "execute_command")
                write_path, write_content = extract_write_file(response)
                
                if read_file_path:
                    try:
                        with open(read_file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        print_tool(f"Read file: {read_file_path}")
                        messages.append({"role": "user", "content": f"Result of <read_file>:\n{content}"})
                    except Exception as e:
                        print_tool(f"Failed to read file: {read_file_path} - {e}")
                        messages.append({"role": "user", "content": f"Failed to read file: {e}"})
                
                elif write_path:
                    try:
                        with open(write_path, "w", encoding="utf-8") as f:
                            f.write(write_content)
                        print_tool(f"Wrote file: {write_path}")
                        messages.append({"role": "user", "content": f"Successfully wrote to {write_path}"})
                    except Exception as e:
                        print_tool(f"Failed to write file: {write_path} - {e}")
                        messages.append({"role": "user", "content": f"Failed to write file: {e}"})
                
                elif cmd:
                    print_tool(f"Executing command: {cmd}")
                    try:
                        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                        output = result.stdout + "\n" + result.stderr
                        if not output.strip():
                            output = "[Command executed successfully with no output]"
                        messages.append({"role": "user", "content": f"Result of <execute_command>:\n{output}"})
                    except Exception as e:
                        print_tool(f"Failed to execute command: {cmd} - {e}")
                        messages.append({"role": "user", "content": f"Failed to execute command: {e}"})
                
                else:
                    # No tool used, just print the response
                    # Hide thought tags
                    clean_response = re.sub(r'<thought>.*?</thought>', '', response, flags=re.DOTALL).strip()
                    if clean_response:
                        print_ai(clean_response)
                    break
                    
        except KeyboardInterrupt:
            print("\n")
            continue
        except Exception as e:
            print_sys(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
