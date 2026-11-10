import re

with open('nova_ai_ultimate.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <button> tags that don't have a type attribute with <button type="button">
content = re.sub(r'<button\b(?![^>]*\btype=)', '<button type="button"', content)

with open('nova_ai_ultimate.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
