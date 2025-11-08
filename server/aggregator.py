import os
import multiprocessing as mp
from multiprocessing import Queue, Process


# HID Thread
def hid(q, core: int):
    os.sched_setaffinity(0, {core})
    while True:
        msg = q.get()
        print(f"[HID] Got message: {msg} from core: {core}")


# Pairing Thread


def pair(q, core: int):
    os.sched_setaffinity(0, {core})


# Polling Thread
def poll(q, core: int):
    os.sched_setaffinity(0, {core})
    while True:
        for i in range(10):
            q.put(f"msg[{i}] sent from core: {core}")


if __name__ == "__main__":
    mp.set_start_method("fork")
    q = Queue()
    p1 = Process(target=hid, args=(q, 1))
    p2 = Process(target=poll, args=(q, 2))
    p1.start()
    p2.start()
