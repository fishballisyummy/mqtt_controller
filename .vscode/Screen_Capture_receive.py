import socket
import cv2
import numpy as np
import struct

# 改為 0.0.0.0 以監聽所有介面（更通用）


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("0.0.0.0", 5005))

print("Waiting for UDP stream on port 5005...")

frames = {}

while True:
    packet, addr = sock.recvfrom(65535)
    print(f"Received packet from {addr}, size: {len(packet)} bytes")  # 除錯用

    if len(packet) < 12:
        print("Packet too small, skipping.")
        continue

    header = packet[:12]
    payload = packet[12:]
    try:
        frame_id, total, idx = struct.unpack('III', header)
    except struct.error:
        print("Invalid header")
        continue

    if frame_id not in frames:
        frames[frame_id] = [None] * total
    frames[frame_id][idx] = payload

    # 檢查是否收齊
    if all(chunk is not None for chunk in frames[frame_id]):
        full_data = b''.join(frames[frame_id])
        del frames[frame_id]

        # 解碼
        nparr = np.frombuffer(full_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is not None:
            cv2.imshow('Stream', img)
            if cv2.waitKey(1) == 27:  # ESC
                break
        else:
            print("Decoding failed!")

cv2.destroyAllWindows()
sock.close()