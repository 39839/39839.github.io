#!/usr/bin/env python3
import os
import re
import json

def clean_text(text):
    """Remove header/footer navigation and clean the article text"""
    lines = text.split('\n')

    # Find the actual article start (after title, author, date, excerpt)
    start_idx = 0
    for i, line in enumerate(lines):
        # Look for the first substantial paragraph after metadata
        if i > 10 and len(line.strip()) > 100 and not line.strip().startswith(('Home', 'Collaborate', 'About', 'The Catalyst')):
            start_idx = i
            break

    # Find the end (before "Recent Posts" or footer)
    end_idx = len(lines)
    for i in range(len(lines) - 1, -1, -1):
        if 'Recent Posts' in lines[i] or 'Join the Changemakers' in lines[i]:
            end_idx = i
            break

    # Get the article body
    article_lines = lines[start_idx:end_idx]
    return '\n'.join(article_lines)

def text_to_html(text):
    """Convert plain text article to HTML with proper formatting"""
    lines = text.strip().split('\n')
    html_parts = []
    in_paragraph = False
    current_para = []

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            if current_para:
                html_parts.append(f"<p>{''.join(current_para)}</p>")
                current_para = []
                in_paragraph = False
            continue

        # Check if it's a heading (short line, possibly all caps or title case, not ending in punctuation)
        is_heading = (
            len(line) < 80 and
            not line.endswith(('.', ',', ';', ':')) and
            (line.isupper() or line.istitle() or ':' in line or line.endswith('?'))
        )

        # Skip image captions and sources
        if 'Source:' in line or 'Image Credit' in line or line.startswith('Map of') or line.startswith('Graph of') or line.startswith('Project Location'):
            continue

        if is_heading:
            # Close any open paragraph
            if current_para:
                html_parts.append(f"<p>{''.join(current_para)}</p>")
                current_para = []
                in_paragraph = False

            # Add as heading
            html_parts.append(f"<h2>{line}</h2>")
        else:
            # It's regular text - add to current paragraph
            if current_para:
                current_para.append(' ')
            current_para.append(line)
            in_paragraph = True

    # Close final paragraph
    if current_para:
        html_parts.append(f"<p>{''.join(current_para)}</p>")

    return '\n'.join(html_parts)

def parse_article_file(filepath):
    """Parse a single article file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    cleaned = clean_text(content)
    html = text_to_html(cleaned)

    return html

# Process all article files
posts_dir = '/Users/yairben-dor/XCode/CatalystMagazine/posts'
articles_content = {}

for i in range(1, 34):  # 33 articles
    filename = f'article{i}.txt'
    filepath = os.path.join(posts_dir, filename)

    if os.path.exists(filepath):
        try:
            html_content = parse_article_file(filepath)
            articles_content[i] = html_content
            print(f"Processed article {i}")
        except Exception as e:
            print(f"Error processing article {i}: {e}")

# Save to JSON for easy import
output_file = '/Users/yairben-dor/XCode/CatalystMagazine/articles_content.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(articles_content, f, indent=2, ensure_ascii=False)

print(f"\nProcessed {len(articles_content)} articles")
print(f"Output saved to: {output_file}")
