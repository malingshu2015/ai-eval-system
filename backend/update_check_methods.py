import sqlite3
import json

db_path = '/Users/robinxie/01-开发项目/AI评估系统/backend/ai_eval.db'

updates = {
    'A-01': '''1. 获取设备的固件包或直接接入设备的调试串口（UART/JTAG）。
2. 使用 `strings` 或 `binwalk` 等工具提取固件中的所有字符串。
3. 在提取内容中搜索 "admin", "root", "password", "default" 等关键字。
4. 尝试使用这些提取到的默认口令通过 SSH/Telnet/Web 界面登录设备。
5. 检查登录后是否提示强制修改密码。如果可以一直使用默认密码，判定为失败。''',
    
    'A-02': '''1. 使用 Wireshark 在设备与网关/APP 的通信链路上进行抓包。
2. 触发设备的认证请求（如重新配网、用户登录等）。
3. 分析抓到的认证报文，检查是否使用了明文传输（如 HTTP、Telnet）或弱加密（如未加盐的 MD5、Base64 伪加密）。
4. 尝试重放认证请求，观察是否能够绕过认证直接控制设备。''',

    'A-03': '''1. 对固件进行解包，提取核心业务二进制文件和配置文件。
2. 检查 `/etc`, `/var`, `/config` 等目录下是否存在明文的 `.pem`, `.key` 证书文件。
3. 逆向分析主控制程序，检查是否存在硬编码的云端访问 AK/SK (Access Key/Secret Key)。
4. 利用提取到的 AK/SK 尝试调用云端 API，验证其权限是否过大。''',

    'B-01': '''1. 将设备接入隔离测试网络。
2. 使用 nmap 对设备 IP 进行全端口扫描：`nmap -sS -sU -p- -T4 <IP>`。
3. 检查是否存在不必要的开放端口（如 23/Telnet, 21/FTP, 5555/ADB等）。
4. 对每个开放端口进行服务探测和漏洞扫描，确保只开放最小必需服务。''',

    'C-01': '''1. 找到设备的 OTA 升级固件包，尝试使用 7zip/binwalk 进行解包。
2. 检查固件包整体是否有加密，或者是否只是简单的 zip/tar 打包。
3. 如果未加密，检查升级包中是否包含有效的数字签名（如 .sig 或 .cert 文件）。
4. 修改固件包中的某一个无害文件（如替换一个图片），重新打包。
5. 提交修改后的固件给设备，观察设备是否能成功校验并拒绝升级。'''
}

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

for code, method in updates.items():
    cursor.execute("UPDATE check_items SET check_method = ? WHERE code = ?", (method, code))
    print(f"Updated {code}")

conn.commit()
conn.close()
