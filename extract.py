import sys, json
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\J. Valdivia\.gemini\antigravity\brain\16325b98-d6ce-44a1-bb58-5bd857648bd6\.system_generated\logs\transcript.jsonl', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            print('--- USER ---')
            print(data['content'])
