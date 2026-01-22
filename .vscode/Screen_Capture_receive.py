import socket
import cv2
import numpy as np
import struct

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("0.0.0.0", 5005))

frames = {}  # 暫存未完成的幀

while True:
    packet, addr = sock.recvfrom(65535)
    header = packet[:12]
    payload = packet[12:]
    frame_id, total, idx = struct.unpack('III', header)

    # 組合分片
    if frame_id not in frames:
        frames[frame_id] = [None] * total
    frames[frame_id][idx] = payload

    # 若該幀已收齊
    if all(chunk is not None for chunk in frames[frame_id]):
        full_data = b''.join(frames[frame_id])
        del frames[frame_id]  # 清理記憶體

        # 解碼並顯示
        nparr = np.frombuffer(full_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        cv2.imshow('Stream', img)
        if cv2.waitKey(1) == 27:
            break

cv2.destroyAllWindows()