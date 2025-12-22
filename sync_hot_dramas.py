#!/usr/bin/env python3
"""
同步本地 hot_dramas 表数据到服务器
"""

import sqlite3
import paramiko
import sys
import os
from pathlib import Path

# 服务器配置（从 deploy.py 复用）
DEPLOY_HOST = '182.92.92.43'
DEPLOY_USER = 'root'
DEPLOY_PASSWORD = 'Lsj5809180'
DEPLOY_PORT = 22
DEPLOY_PATH = '/opt/aggregation'
LOCAL_DB_PATH = 'data/aggregation.db'
REMOTE_DB_PATH = f'{DEPLOY_PATH}/data/aggregation.db'

def print_step(message):
    """打印步骤信息"""
    print(f"\n{'='*60}")
    print(f"  {message}")
    print(f"{'='*60}\n")

def export_local_data():
    """从本地数据库导出 hot_dramas 表数据"""
    print_step("导出本地 hot_dramas 表数据")
    
    if not os.path.exists(LOCAL_DB_PATH):
        print(f"[ERROR] 错误: 本地数据库文件不存在: {LOCAL_DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='hot_dramas'")
        if not cursor.fetchone():
            print("[ERROR] 错误: 本地数据库中不存在 hot_dramas 表")
            sys.exit(1)
        
        # 获取所有数据（排除 id 和 fetched_at，让服务器自动生成）
        cursor.execute("""
            SELECT title, original_title, download_link, baidu_url, quark_url, 
                   tmdb_id, poster_path, backdrop_path, overview, release_date, 
                   vote_average, media_type
            FROM hot_dramas
            ORDER BY id
        """)
        
        rows = cursor.fetchall()
        count = len(rows)
        print(f"[OK] 成功导出 {count} 条记录")
        
        return rows
    except sqlite3.Error as e:
        print(f"[ERROR] 导出数据时出错: {e}")
        sys.exit(1)
    finally:
        conn.close()

def sync_to_server(data_rows):
    """将数据同步到服务器"""
    print_step("同步数据到服务器")
    
    ssh_client = None
    try:
        # 连接 SSH
        print("连接 SSH 服务器...")
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(
            hostname=DEPLOY_HOST,
            port=DEPLOY_PORT,
            username=DEPLOY_USER,
            password=DEPLOY_PASSWORD,
            timeout=30
        )
        print(f"[OK] 成功连接到 {DEPLOY_USER}@{DEPLOY_HOST}")
        
        # 检查服务器数据库文件是否存在
        stdin, stdout, stderr = ssh_client.exec_command(f"test -f {REMOTE_DB_PATH} && echo 'exists' || echo 'not_exists'")
        result = stdout.read().decode('utf-8').strip()
        
        if result == 'not_exists':
            print(f"[WARN] 警告: 服务器数据库文件不存在: {REMOTE_DB_PATH}")
            print("   将创建数据库文件...")
            ssh_client.exec_command(f"mkdir -p {DEPLOY_PATH}/data")
        
        # 创建 Python 脚本来更新数据库
        script_content = f"""
import sqlite3
import sys

db_path = '{REMOTE_DB_PATH}'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 清空表
    print("清空 hot_dramas 表...")
    cursor.execute("DELETE FROM hot_dramas")
    
    # 插入数据
    print(f"插入 {{len(data_rows)}} 条记录...")
    insert_sql = '''
        INSERT INTO hot_dramas 
        (title, original_title, download_link, baidu_url, quark_url, 
         tmdb_id, poster_path, backdrop_path, overview, release_date, 
         vote_average, media_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    '''
    
    cursor.executemany(insert_sql, data_rows)
    conn.commit()
    
    # 验证插入的数据
    cursor.execute("SELECT COUNT(*) FROM hot_dramas")
    count = cursor.fetchone()[0]
    
    print(f"[OK] 成功插入 {{count}} 条记录")
    conn.close()
    sys.exit(0)
    
except Exception as e:
    print(f"[ERROR] 错误: {{e}}")
    sys.exit(1)
"""
        
        # 准备数据（转换为字符串格式，便于传输）
        data_str = repr(data_rows)
        script_content = script_content.replace('data_rows', data_str)
        
        # 将脚本写入服务器临时文件
        temp_script = f'/tmp/update_hot_dramas_{int(__import__("time").time())}.py'
        sftp = ssh_client.open_sftp()
        try:
            with sftp.open(temp_script, 'w') as f:
                f.write(script_content)
        finally:
            sftp.close()
        
        # 执行脚本
        print("清空并更新服务器数据库...")
        stdin, stdout, stderr = ssh_client.exec_command(f"python3 {temp_script}")
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print(output)
        if error:
            print(f"错误: {error}")
        
        # 清理临时脚本
        ssh_client.exec_command(f"rm -f {temp_script}")
        
        if exit_status != 0:
            raise Exception(f"脚本执行失败，退出码: {exit_status}")
        
        print("[OK] 数据同步完成")
        
    except Exception as e:
        print(f"[ERROR] 同步失败: {e}")
        sys.exit(1)
    finally:
        if ssh_client:
            ssh_client.close()

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║        同步本地 hot_dramas 表数据到服务器                  ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # 1. 导出本地数据
    data_rows = export_local_data()
    
    if not data_rows:
        print("[WARN] 本地数据库中没有数据，无需同步")
        sys.exit(0)
    
    # 2. 同步到服务器
    sync_to_server(data_rows)
    
    print_step("同步完成！")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n同步被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] 同步失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

