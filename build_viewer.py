#!/usr/bin/env python3
"""
Instagram DM Archive Data Builder
Converts raw Instagram export message JSON files into clean, decoded chat_data.js.
Handles Latin-1 -> UTF-8 decoding for Korean text, emojis, and media references.
"""

import json
import glob
import os
import datetime
import sys

def fix_latin1_utf8(s):
    if not isinstance(s, str):
        return s
    try:
        return s.encode('latin1').decode('utf-8')
    except Exception:
        return s

def build():
    dir_path = os.path.dirname(os.path.abspath(__file__))
    pattern = os.path.join(dir_path, 'message_*.json')
    files = glob.glob(pattern)
    
    if not files:
        print("No message_*.json files found.")
        return

    # Sort files by numerical index
    files = sorted(files, key=lambda x: int(os.path.basename(x).split('_')[1].split('.')[0]))
    print(f"Found {len(files)} message files. Processing...")

    all_msgs = []
    day_map = {}
    media_list = []

    for fn in files:
        with open(fn, 'r', encoding='utf-8') as f:
            d = json.load(f)
            for m in d.get('messages', []):
                s_name = fix_latin1_utf8(m.get('sender_name'))
                s_idx = 0 if s_name == '이재인' else 1
                t = m.get('timestamp_ms', 0)
                item = {'s': s_idx, 't': t}
                
                c = fix_latin1_utf8(m.get('content'))
                if c:
                    item['c'] = c
                    
                if 'photos' in m:
                    p_uris = []
                    for p in m['photos']:
                        if 'uri' in p:
                            p_uris.append(p['uri'].split('ijaein_919720559421295/')[-1])
                    if p_uris:
                        item['p'] = p_uris
                        
                if 'videos' in m:
                    v_uris = []
                    for v in m['videos']:
                        if 'uri' in v:
                            v_uris.append(v['uri'].split('ijaein_919720559421295/')[-1])
                    if v_uris:
                        item['v'] = v_uris
                        
                if 'audio_files' in m:
                    a_uris = []
                    for a in m['audio_files']:
                        if 'uri' in a:
                            a_uris.append(a['uri'].split('ijaein_919720559421295/')[-1])
                    if a_uris:
                        item['a'] = a_uris
                        
                if 'gifs' in m:
                    g_uris = []
                    for g in m['gifs']:
                        if 'uri' in g:
                            g_uris.append(g['uri'].split('ijaein_919720559421295/')[-1])
                    if g_uris:
                        item['g'] = g_uris
                        
                if 'share' in m:
                    sh = m['share']
                    sh_obj = {}
                    if 'link' in sh: sh_obj['l'] = sh['link']
                    if 'original_content_owner' in sh: sh_obj['o'] = fix_latin1_utf8(sh['original_content_owner'])
                    if 'share_text' in sh: sh_obj['t'] = fix_latin1_utf8(sh['share_text'])
                    item['sh'] = sh_obj
                    
                if 'reactions' in m:
                    rx_list = []
                    for rx in m['reactions']:
                        r_emoji = fix_latin1_utf8(rx.get('reaction'))
                        r_actor = 0 if fix_latin1_utf8(rx.get('actor')) == '이재인' else 1
                        rx_list.append({'r': r_emoji, 'a': r_actor})
                    if rx_list:
                        item['r'] = rx_list
                        
                if 'call_duration' in m:
                    item['cd'] = m['call_duration']
                    
                all_msgs.append(item)

    # Sort messages chronologically
    all_msgs.sort(key=lambda x: x['t'])

    # Build day map and media list
    for idx, m in enumerate(all_msgs):
        dt = datetime.datetime.fromtimestamp(m['t']/1000)
        day_str = dt.strftime('%Y-%m-%d')
        if day_str not in day_map:
            day_map[day_str] = idx
        if 'p' in m:
            for p in m['p']:
                media_list.append({'i': idx, 'y': 'p', 'u': p, 't': m['t']})
        if 'v' in m:
            for v in m['v']:
                media_list.append({'i': idx, 'y': 'v', 'u': v, 't': m['t']})

    payload = {
        'participants': ['이재인', '박하원'],
        'total': len(all_msgs),
        'days': day_map,
        'media_count': len(media_list),
        'media': media_list,
        'messages': all_msgs
    }

    output_path = os.path.join(dir_path, 'chat_data.js')
    print(f"Writing dataset to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('window.CHAT_DATA = ')
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

    sz_mb = os.path.getsize(output_path) / (1024*1024)
    print(f"Success! {sz_mb:.2f} MB generated. Total: {len(all_msgs):,} messages across {len(day_map)} days.")

if __name__ == '__main__':
    build()
