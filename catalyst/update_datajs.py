#!/usr/bin/env python3
import json
import re

# Load the parsed articles content
with open('/Users/yairben-dor/XCode/CatalystMagazine/articles_content.json', 'r', encoding='utf-8') as f:
    articles_content = json.load(f)

# Read the current data.js file
with open('/Users/yairben-dor/XCode/CatalystMagazine/js/data.js', 'r', encoding='utf-8') as f:
    data_js = f.read()

# Function to escape backticks and backslashes for JavaScript template literals
def escape_for_js(text):
    text = text.replace('\\', '\\\\')
    text = text.replace('`', '\\`')
    text = text.replace('${', '\\${')
    return text

# Find and update each article
output_lines = []
in_articles_array = False
current_article_id = None
article_buffer = []
skip_until_next_article = False

lines = data_js.split('\n')
i = 0

while i < len(lines):
    line = lines[i]

    # Check if we're in the articles array
    if 'const articles = [' in line:
        in_articles_array = True
        output_lines.append(line)
        i += 1
        continue

    # Check if articles array ended
    if in_articles_array and line.strip() == '];':
        in_articles_array = False
        output_lines.append(line)
        i += 1
        continue

    # Check for article ID
    id_match = re.search(r'id:\s*(\d+)', line)
    if id_match and in_articles_array:
        current_article_id = int(id_match.group(1))
        article_buffer = [line]
        skip_until_next_article = False
        i += 1

        # Read until we find the closing brace or next article
        while i < len(lines):
            article_buffer.append(lines[i])

            # Check if we hit the content field
            if 'content:' in lines[i]:
                # Skip the existing content
                # Find the end of the content (backticks)
                while i < len(lines) and not (lines[i].strip().endswith('`') and 'content:' not in lines[i]):
                    i += 1
                i += 1  # Skip the closing backtick line
                continue

            # Check if this article is done (closing brace with comma or without)
            if lines[i].strip() in ['},', '}']:
                # Add content if we have it for this article
                if str(current_article_id) in articles_content:
                    # Remove the closing brace
                    article_buffer.pop()

                    # Add content field
                    content = escape_for_js(articles_content[str(current_article_id)])
                    article_buffer.append(f"        content: `{content}`")

                    # Add closing brace back
                    article_buffer.append(lines[i])


                # Write article buffer to output
                output_lines.extend(article_buffer)
                article_buffer = []
                current_article_id = None
                i += 1
                break

            i += 1
        continue

    # Default: just add the line
    output_lines.append(line)
    i += 1

# Write the updated data.js
with open('/Users/yairben-dor/XCode/CatalystMagazine/js/data.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print("Successfully updated data.js with article content!")
print(f"Added content to {len(articles_content)} articles")
