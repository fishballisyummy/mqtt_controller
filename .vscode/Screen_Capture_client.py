import socket
import cv2
import numpy as np
from mss import mss
import struct

UDP_IP = "192.168.83.1"
UDP_PORT = 5005
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

frame_id = 0
with mss() as sct:
    while True:
        # 1. 截圖
        img = np.array(sct.grab(sct.monitors[1]))
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

        # 2. 壓縮
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 50])
        data = buffer.tobytes()

        # 3. 分片（若超過 60KB）
        MAX_CHUNK = 60000
        total_chunks = (len(data) + MAX_CHUNK - 1) // MAX_CHUNK

        for i in range(total_chunks):
            chunk = data[i*MAX_CHUNK:(i+1)*MAX_CHUNK]
            # 4. 加上自訂 header
            header = struct.pack('III', frame_id, total_chunks, i)
            packet = header + chunk
            sock.sendto(packet, (UDP_IP, UDP_PORT))

        frame_id += 1